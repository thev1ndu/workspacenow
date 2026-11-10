// Package app wires the service's components together and runs them until the context ends.
package app

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/nats-io/nats.go"
	"golang.org/x/sync/errgroup"
	"gorm.io/gorm"

	"go.temporal.io/sdk/client"

	"github.com/thev1ndu/workspacenow/wsn-service/api"
	"github.com/thev1ndu/workspacenow/wsn-service/config"
	"github.com/thev1ndu/workspacenow/wsn-service/db/migrations"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/ai"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/bizops"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/connect"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/domain"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/flow"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/identity"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/cache"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/events"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/objectstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/secrets"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/obs"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/observer"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/seed"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/stream"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/studio"
	"github.com/thev1ndu/workspacenow/wsn-service/middleware"
)

// Options selects what this process runs; one image serves every role as separate deployments.
type Options struct {
	Migrate  bool   // apply schema migrations before anything else
	Server   bool   // serve the HTTP API and the event stream
	Relay    bool   // move committed events from the outbox to NATS
	Worker   bool   // run the Temporal workflow worker and the event trigger consumer
	Backup   bool   // run one pg_dump backup to object storage and exit
	Restore  bool   // restore the database from a backup in object storage and exit (drill)
	BackupID string // with Restore: the backup record to restore instead of the newest
}

// Run starts the selected components and blocks until ctx is cancelled or one of them fails.
func Run(ctx context.Context, cfg *config.Config, opts Options) error {
	exporter := observer.NewExporter(cfg.Observer.URL, cfg.Observer.Token, cfg.Observer.ServiceName, cfg.Observer.FlushInterval, nil)
	setupLogger(cfg.LogLevel, exporter, cfg.Observer.ServiceName)
	slog.Info("starting wsn-service", "version", config.Version, "env", cfg.Env, "demo", cfg.DemoMode, "observer", cfg.Observer.URL != "")

	db, err := postgres.Open(ctx, cfg.Database)
	if err != nil {
		return err
	}
	if opts.Migrate {
		if err := migrations.Run(db); err != nil {
			return err
		}
		slog.Info("migrations applied")
	} else if opts.Server || opts.Worker {
		pending, err := migrations.Pending(db)
		if err != nil {
			return err
		}
		if len(pending) > 0 {
			return fmt.Errorf("pending migrations %v — run with -migrate first (upgrade gate)", pending)
		}
	}
	if opts.Backup {
		return runBackup(ctx, db, cfg)
	}
	if opts.Restore {
		return runRestore(ctx, db, cfg, opts.BackupID)
	}
	if !opts.Server && !opts.Relay && !opts.Worker {
		return nil
	}

	nc, js, err := events.Connect(ctx, cfg.NATS.URL, cfg.NATS.Stream)
	if err != nil {
		return err
	}
	defer nc.Close()

	// Temporal is required for the worker role; the API only needs it to start workflows.
	var tc client.Client
	if c, err := client.Dial(client.Options{HostPort: cfg.Temporal.HostPort, Namespace: cfg.Temporal.Namespace}); err != nil {
		if opts.Worker {
			return fmt.Errorf("connect temporal: %w", err)
		}
		slog.Warn("temporal not connected; workflow starts will fail", "error", err)
	} else {
		tc = c
		defer tc.Close()
	}

	core := newCore(db)

	g, ctx := errgroup.WithContext(ctx)
	if opts.Relay {
		g.Go(func() error { return events.Relay(ctx, db, js) })
	}
	if opts.Server {
		if err := startServer(ctx, g, cfg, db, nc, tc, core, exporter, func(hub *stream.Hub) error { return hub.Run(ctx, nc) }); err != nil {
			return err
		}
	}
	if opts.Worker {
		if tc == nil {
			return fmt.Errorf("the -worker role needs a reachable temporal at TEMPORAL_HOSTPORT")
		}
		aiClient := ai.NewClient(cfg.AI.ServiceURL, cfg.AI.ServiceToken)
		signer, err := newSigner(cfg)
		if err != nil {
			return err
		}
		flowSvc := flow.NewService(db, core.engine, core.auditor, tc, cfg.Temporal.TaskQueue)
		acts := flow.NewActivities(db, core.engine, core.auditor, core.publisher, core.runtime,
			ai.NewRunner(aiClient, signer, docstore.NewCollection(db, "agents", func(a *ai.AgentDoc) string { return a.ID })))
		g.Go(func() error { return flow.RunWorker(ctx, tc, cfg.Temporal.TaskQueue, acts) })
		g.Go(func() error { return flow.ConsumeTriggers(ctx, js, cfg.NATS.Stream, flowSvc) })
		slog.Info("worker role: temporal worker + trigger consumer", "taskQueue", cfg.Temporal.TaskQueue)
	}
	return g.Wait()
}

// core holds the components every role shares.
type core struct {
	auditor   kernel.Auditor
	publisher kernel.Publisher
	engine    kernel.Engine
	runtime   data.Runtime
}

func newCore(db *gorm.DB) *core {
	auditor := kernel.NewAuditor(db)
	publisher := kernel.NewPublisher(db)
	engine := kernel.NewEngine(db, auditor)
	runtime := data.NewRuntime(db, publisher)
	engine.AddSource(data.NewOperationSource(runtime))
	engine.Register(domain.Operations(runtime, publisher)...)
	return &core{auditor: auditor, publisher: publisher, engine: engine, runtime: runtime}
}

// newSigner loads RUN_GRANT_KEY. An invalid key is a startup error (worker-signed grants would
// fail on the server anyway); an empty key is an error in production, an ephemeral key in development.
func newSigner(cfg *config.Config) (*ai.Signer, error) {
	if cfg.AI.RunGrantKey == "" {
		if cfg.IsProduction() {
			return nil, errors.New("RUN_GRANT_KEY is required in production")
		}
		slog.Warn("RUN_GRANT_KEY is empty; agent run grants use an ephemeral key and do not survive a restart")
		return ai.GenerateSigner(), nil
	}
	s, err := ai.LoadSigner(cfg.AI.RunGrantKey)
	if err != nil {
		return nil, fmt.Errorf("RUN_GRANT_KEY is invalid: %w", err)
	}
	return s, nil
}

func startServer(ctx context.Context, g *errgroup.Group, cfg *config.Config, db *gorm.DB, nc *nats.Conn, tc client.Client, core *core, exporter *observer.Exporter, runHub func(*stream.Hub) error) error {
	if cfg.DemoMode {
		if err := seedIfEmpty(ctx, db); err != nil {
			return err
		}
	}
	if err := ai.EnsureBuiltins(ctx, db); err != nil { // Sidekick + Application Architect on fresh installs
		return err
	}
	c, err := cache.Open(ctx, cfg.Redis.URL)
	if err != nil {
		return err
	}
	g.Go(func() error {
		<-ctx.Done()
		return c.Close()
	})
	g.Go(func() error {
		<-ctx.Done()
		flushCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return exporter.Close(flushCtx)
	})

	auditor, publisher, engine, runtime := core.auditor, core.publisher, core.engine, core.runtime

	identitySvc := identity.NewService(db, c, auditor, identity.Bootstrap{
		AdminEmails:          cfg.Bootstrap.AdminEmails,
		AdminRole:            cfg.Bootstrap.AdminRole,
		DefaultAdminEmail:    cfg.Bootstrap.DefaultAdminEmail,
		DefaultAdminPassword: cfg.Bootstrap.DefaultAdminPassword,
	})
	aiClient := ai.NewClient(cfg.AI.ServiceURL, cfg.AI.ServiceToken)
	connectSvc := connect.NewService(db, engine, auditor, c, runtime, secrets.NewOpenBao(cfg.OpenBao), aiClient)
	g.Go(func() error { return connectSvc.RunWebhookDispatcher(ctx) }) // startServer runs only in the server role
	artifacts, err := objectstore.Open(ctx, cfg.S3)
	if err != nil {
		return err
	}
	studioSvc := studio.NewService(db, auditor, publisher, runtime, artifacts, aiClient)
	hub := stream.NewHub(db, runtime)
	g.Go(func() error { return runHub(hub) })

	obsClient := observer.NewClient(cfg.Observer.URL, cfg.Observer.Token)
	obsSvc := obs.NewService(obs.Deps{
		DB: db, Cache: c, NATS: nc, Observer: obsClient, ServiceName: cfg.Observer.ServiceName,
		AIHealthURL: cfg.AI.ServiceURL + "/healthz", Connect: connectSvc, Runtime: runtime, Identity: identitySvc,
		Publisher: publisher, Auditor: auditor,
	})
	dataSvc := data.NewService(db, runtime, auditor, artifacts)
	engine.SetOnInvoke(func(op string, d time.Duration, failed bool) {
		obsSvc.RecordSLOCall(ctx, op, d, failed)
	})
	g.Go(func() error { // nightly purge job: hard-delete soft-deleted records older than 30 days
		t := time.NewTicker(24 * time.Hour)
		defer t.Stop()
		for {
			entities, err := runtime.Entities(ctx)
			if err == nil {
				for _, e := range entities {
					if e.Scope == data.ScopeExternal {
						continue
					}
					_, _ = dataSvc.Purge(ctx, kernel.ExecutionContext{Actor: kernel.Actor{Kind: kernel.ActorSystem, ID: "purge", Name: "Purge job"}}, e.Name, 30)
				}
			}
			select {
			case <-ctx.Done():
				return nil
			case <-t.C:
			}
		}
	})
	g.Go(func() error { // alert evaluator: fires rules whose window count crossed the threshold
		t := time.NewTicker(time.Minute)
		defer t.Stop()
		for {
			_, _ = obsSvc.EvaluateAlerts(ctx, time.Now().UTC())
			select {
			case <-ctx.Done():
				return nil
			case <-t.C:
			}
		}
	})

	signer, err := newSigner(cfg)
	if err != nil {
		return err
	}
	aiSvc := ai.NewService(ai.Deps{
		DB: db, Engine: engine, Auditor: auditor, Publisher: publisher, Cache: c,
		Signer: signer, Client: aiClient, Connect: connectSvc, GrantTTL: cfg.AI.RunGrantTTL,
	})
	flowSvc := flow.NewService(db, engine, auditor, tc, cfg.Temporal.TaskQueue)

	identityHandler := identity.NewHandler(identitySvc, auditor, cfg.DemoMode)
	mux := http.NewServeMux()
	api.Routes(mux, api.Modules{
		Identity: identityHandler,
		Demo:     seed.NewHandler(db, cfg.DemoMode, identitySvc.InvalidateAccess),
		Data:     data.NewHandler(dataSvc, runtime, engine),
		BizOps:   bizops.NewHandler(engine),
		Connect:  connect.NewHandler(connectSvc, auditor),
		Stream:   hub,
		Studio:   studio.NewHandler(studioSvc),
		Obs:      obs.NewHandler(obsSvc, auditor),
		AI:       ai.NewHandler(aiSvc, auditor),
		Flow:     flow.NewHandler(flowSvc, auditor),
	})
	mux.HandleFunc("GET /healthz", health(db, c, nc, tc, artifacts, cfg))
	mux.HandleFunc("GET /readyz", readiness(db, c))
	// Local system login, logout and password rotation (used when no OIDC is configured);
	// registered directly on the mux like /auth/login.
	mux.HandleFunc("POST "+api.BasePath+"/auth/login", identityHandler.Login)
	mux.HandleFunc("POST "+api.BasePath+"/auth/logout", identityHandler.Logout)
	mux.HandleFunc("POST "+api.BasePath+"/auth/password", identityHandler.ChangePassword)

	public := func(r *http.Request) bool {
		p := strings.TrimPrefix(r.URL.Path, api.BasePath)
		if !strings.HasPrefix(r.URL.Path, api.BasePath+"/") {
			return true
		}
		// demo endpoints exist only in demo mode (WSN_DEMO_MODE + WSN_ENV=development, enforced at
		// config load); /demo/reset additionally requires a signed-in administrator
		return (p == "/personas" && cfg.DemoMode) || p == "/status" || p == "/auth/login"
	}
	handler := middleware.Chain(mux,
		middleware.Recover(),
		middleware.CORS(cfg.CORSOrigins),
		middleware.CorrelationID(),
		middleware.Telemetry(exporter),
		middleware.RequestLogger(),
		middleware.Authenticate(cfg.OIDC, cfg.DemoMode, identitySvc, public, func(ctx context.Context, raw string) (string, string, kernel.Permissions, error) {
			key, err := connect.VerifyKey(ctx, db, c, raw)
			if err != nil {
				return "", "", nil, err
			}
			return "key:" + key.ID, "API key " + key.Name, kernel.NewPermissions(key.Permissions...), nil
		}, sessionLookup(cfg, identitySvc)),
	)
	serve(ctx, g, &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      120 * time.Second, // agent runs wait on the model; the event stream lifts it per connection
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}, cfg.ShutdownTimeout)
	// The service-to-service API wsn-ai-service calls (tool invocation under run grants,
	// the managed MCP catalogue, streamed run steps) rides on its own port.
	serve(ctx, g, &http.Server{
		Addr:              cfg.InternalAddr,
		Handler:           ai.InternalMux(cfg, aiSvc, identitySvc),
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      120 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}, cfg.ShutdownTimeout)
	return nil
}

// serve runs srv until ctx ends, then shuts it down gracefully.
func serve(ctx context.Context, g *errgroup.Group, srv *http.Server, timeout time.Duration) {
	g.Go(func() error {
		slog.Info("listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("serve %s: %w", srv.Addr, err)
		}
		return nil
	})
	g.Go(func() error {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), timeout)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	})
}

func seedIfEmpty(ctx context.Context, db *gorm.DB) error {
	empty, err := seed.IsEmpty(ctx, db)
	if err != nil {
		return fmt.Errorf("check for seed data: %w", err)
	}
	if !empty {
		return nil
	}
	slog.Info("demo mode: loading the demo organization")
	return seed.Apply(ctx, db)
}

func readiness(db *gorm.DB, c cache.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		sqlDB, err := db.DB()
		if err == nil {
			err = sqlDB.PingContext(ctx)
		}
		if err == nil {
			err = c.Ping(ctx)
		}
		if err != nil {
			slog.WarnContext(ctx, "not ready", "error", err)
			http.Error(w, "not ready", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	}
}

// sessionLookup resolves a local login session token when no OIDC is configured; nil otherwise.
func sessionLookup(cfg *config.Config, resolver any) func(ctx context.Context, token string) (string, error) {
	if !cfg.LocalAuthEnabled() {
		return nil
	}
	if s, ok := resolver.(interface {
		SessionUser(ctx context.Context, token string) (string, error)
	}); ok {
		return s.SessionUser
	}
	return nil
}

// health reports the platform's own liveness plus every backing service (database, cache,
// NATS, Temporal, object storage, OpenBao, AI service, observer) as a JSON dependency report.
func health(db *gorm.DB, c cache.Cache, nc *nats.Conn, tc client.Client, store objectstore.Store, cfg *config.Config) http.HandlerFunc {
	hc := &http.Client{Timeout: 3 * time.Second}
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		checks := map[string]string{}
		ok := true
		mark := func(name string, err error) {
			if err != nil {
				ok = false
				checks[name] = "down: " + err.Error()
			} else {
				checks[name] = "ok"
			}
		}
		sqlDB, err := db.DB()
		if err == nil {
			err = sqlDB.PingContext(ctx)
		}
		mark("postgres", err)
		mark("valkey", c.Ping(ctx))
		if nc != nil {
			mark("nats", nc.FlushTimeout(2*time.Second))
		}
		if tc != nil {
			_, terr := tc.CheckHealth(ctx, &client.CheckHealthRequest{})
			mark("temporal", terr)
		}
		mark("object-storage", store.Ping(ctx))
		// OpenBao: any HTTP answer from /v1/sys/health means the server is reachable and unsealed.
		if resp, herr := hc.Get(cfg.OpenBao.Addr + "/v1/sys/health"); herr != nil {
			mark("openbao", herr)
		} else {
			_, _ = io.Copy(io.Discard, resp.Body)
			_ = resp.Body.Close()
			if resp.StatusCode >= 500 && resp.StatusCode != http.StatusNotFound {
				mark("openbao", fmt.Errorf("status %s", resp.Status))
			} else {
				mark("openbao", nil)
			}
		}
		if resp, herr := hc.Get(cfg.AI.ServiceURL + "/healthz"); herr != nil {
			mark("ai-service", herr)
		} else {
			_ = resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				mark("ai-service", fmt.Errorf("status %s", resp.Status))
			} else {
				mark("ai-service", nil)
			}
		}
		if cfg.Observer.URL != "" {
			if resp, herr := hc.Get(cfg.Observer.URL + "/healthz"); herr != nil {
				mark("observer", herr)
			} else {
				_ = resp.Body.Close()
				if resp.StatusCode != http.StatusOK {
					mark("observer", fmt.Errorf("status %s", resp.Status))
				} else {
					mark("observer", nil)
				}
			}
		}
		status := http.StatusOK
		if !ok {
			status = http.StatusServiceUnavailable
		}
		httpx.JSON(w, status, map[string]any{"status": map[bool]string{true: "ok", false: "degraded"}[ok], "checks": checks})
	}
}

// setupLogger writes JSON to stdout and tees every record to wsn-observer as OTLP logs.
func setupLogger(level string, exp *observer.Exporter, serviceName string) {
	var l slog.Level
	if err := l.UnmarshalText([]byte(level)); err != nil {
		l = slog.LevelInfo
	}
	stdout := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: l})
	slog.SetDefault(slog.New(observer.Tee(stdout, observer.NewLogHandler(exp, serviceName))))
}

// pickBackup chooses the backup record to restore: the one named by id, else the newest done one.
func pickBackup(records []obs.BackupRecord, id string) (*obs.BackupRecord, error) {
	done := make([]obs.BackupRecord, 0, len(records))
	for _, r := range records {
		if r.Status == "done" {
			done = append(done, r)
		}
	}
	if id != "" {
		for i := range done {
			if done[i].ID == id {
				return &done[i], nil
			}
		}
		return nil, fmt.Errorf("no completed backup with id %s", id)
	}
	if len(done) == 0 {
		return nil, fmt.Errorf("no completed backups to restore")
	}
	latest := &done[0]
	for i := range done {
		if done[i].StartedAt.After(latest.StartedAt) {
			latest = &done[i]
		}
	}
	return latest, nil
}

// runRestore downloads a backup from object storage and pg_restore's it into the database (the
// -restore role; a manual drill proving backups are restorable — run it against a scratch database).
func runRestore(ctx context.Context, db *gorm.DB, cfg *config.Config, backupID string) error {
	col := docstore.NewCollection(db, "backups", func(b *obs.BackupRecord) string { return b.ID })
	records, err := col.List(ctx)
	if err != nil {
		return err
	}
	rec, err := pickBackup(records, backupID)
	if err != nil {
		return err
	}
	artifacts, err := objectstore.Open(ctx, cfg.S3)
	if err != nil {
		return err
	}
	dump, err := artifacts.Get(ctx, rec.S3Key)
	if err != nil {
		return fmt.Errorf("download %s: %w", rec.S3Key, err)
	}
	tmp, err := os.CreateTemp("", "wsn-restore-*.dump")
	if err != nil {
		return err
	}
	defer func() { _ = os.Remove(tmp.Name()) }()
	if _, err := tmp.Write(dump); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	slog.Info("restoring database from backup", "backup", rec.ID, "key", rec.S3Key, "size", rec.SizeBytes)
	out, err := exec.CommandContext(ctx, "pg_restore", "--clean", "--if-exists", "-d", cfg.Database.URL, tmp.Name()).CombinedOutput()
	if err != nil {
		return fmt.Errorf("pg_restore: %w: %s", err, strings.TrimSpace(string(out)))
	}
	slog.Info("restore completed", "backup", rec.ID)
	return nil
}

// runBackup dumps Postgres to object storage once (the -backup role; a CronJob in Flux schedules it).
func runBackup(ctx context.Context, db *gorm.DB, cfg *config.Config) error {
	artifacts, err := objectstore.Open(ctx, cfg.S3)
	if err != nil {
		return err
	}
	key := fmt.Sprintf("backups/%s.dump", time.Now().UTC().Format("2006-01-02T15-04-05Z"))
	dump := exec.CommandContext(ctx, "pg_dump", "--format=custom", cfg.Database.URL)
	out, err := dump.Output()
	if err != nil {
		return fmt.Errorf("pg_dump: %w", err)
	}
	if err := artifacts.Put(ctx, key, "application/octet-stream", out); err != nil {
		return err
	}
	now := time.Now().UTC()
	rec := obs.BackupRecord{ID: kernel.NewID("bak"), StartedAt: now, FinishedAt: &now, SizeBytes: int64(len(out)), S3Key: key, Status: "done"}
	col := docstore.NewCollection(db, "backups", func(b *obs.BackupRecord) string { return b.ID })
	return col.Put(ctx, &rec)
}
