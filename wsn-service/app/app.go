// Package app wires the service's components together and runs them until the context ends.
package app

import (
	"context"
	"errors"
	"fmt"
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
	Migrate bool // apply schema migrations before anything else
	Server  bool // serve the HTTP API and the event stream
	Relay   bool // move committed events from the outbox to NATS
	Worker  bool // run the Temporal workflow worker and the event trigger consumer
	Backup  bool // run one pg_dump backup to object storage and exit
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
		signer := newSigner(cfg)
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

// newSigner loads RUN_GRANT_KEY or generates an ephemeral one (development only).
func newSigner(cfg *config.Config) *ai.Signer {
	if cfg.AI.RunGrantKey != "" {
		s, err := ai.LoadSigner(cfg.AI.RunGrantKey)
		if err != nil {
			slog.Warn("RUN_GRANT_KEY is invalid; generating an ephemeral key", "error", err)
			return ai.GenerateSigner()
		}
		return s
	}
	slog.Warn("RUN_GRANT_KEY is empty; agent run grants use an ephemeral key and do not survive a restart")
	return ai.GenerateSigner()
}

func startServer(ctx context.Context, g *errgroup.Group, cfg *config.Config, db *gorm.DB, nc *nats.Conn, tc client.Client, core *core, exporter *observer.Exporter, runHub func(*stream.Hub) error) error {
	if cfg.DemoMode {
		if err := seedIfEmpty(ctx, db); err != nil {
			return err
		}
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

	identitySvc := identity.NewService(db, c, auditor)
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
	engine.SetOnInvoke(func(op string, d time.Duration, failed bool) {
		obsSvc.RecordSLOCall(ctx, op, d, failed)
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

	aiSvc := ai.NewService(ai.Deps{
		DB: db, Engine: engine, Auditor: auditor, Publisher: publisher, Cache: c,
		Signer: newSigner(cfg), Client: aiClient, Connect: connectSvc, GrantTTL: cfg.AI.RunGrantTTL,
	})
	flowSvc := flow.NewService(db, engine, auditor, tc, cfg.Temporal.TaskQueue)

	mux := http.NewServeMux()
	api.Routes(mux, api.Modules{
		Identity: identity.NewHandler(identitySvc, cfg.DemoMode),
		Demo:     seed.NewHandler(db, cfg.DemoMode, identitySvc.InvalidateAccess),
		Data:     data.NewHandler(data.NewService(db, runtime, auditor), runtime, engine),
		BizOps:   bizops.NewHandler(engine),
		Connect:  connect.NewHandler(connectSvc),
		Stream:   hub,
		Studio:   studio.NewHandler(studioSvc),
		Obs:      obs.NewHandler(obsSvc, auditor),
		AI:       ai.NewHandler(aiSvc, auditor),
		Flow:     flow.NewHandler(flowSvc),
	})
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	mux.HandleFunc("GET /readyz", readiness(db, c))

	public := func(r *http.Request) bool {
		p := strings.TrimPrefix(r.URL.Path, api.BasePath)
		return !strings.HasPrefix(r.URL.Path, api.BasePath+"/") || p == "/personas" || p == "/demo/reset" || p == "/status"
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
		}),
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

// setupLogger writes JSON to stdout and tees every record to wsn-observer as OTLP logs.
func setupLogger(level string, exp *observer.Exporter, serviceName string) {
	var l slog.Level
	if err := l.UnmarshalText([]byte(level)); err != nil {
		l = slog.LevelInfo
	}
	stdout := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: l})
	slog.SetDefault(slog.New(observer.Tee(stdout, observer.NewLogHandler(exp, serviceName))))
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
