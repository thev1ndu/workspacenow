// Package app wires the service's components together and runs them until the context ends.
package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/nats-io/nats.go"
	"golang.org/x/sync/errgroup"
	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/api"
	"github.com/thev1ndu/workspacenow/wsn-service/config"
	"github.com/thev1ndu/workspacenow/wsn-service/db/migrations"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/bizops"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/connect"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/domain"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/identity"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/cache"
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
	}
	if !opts.Server && !opts.Relay {
		return nil
	}

	nc, js, err := events.Connect(ctx, cfg.NATS.URL, cfg.NATS.Stream)
	if err != nil {
		return err
	}
	defer nc.Close()

	g, ctx := errgroup.WithContext(ctx)
	if opts.Relay {
		g.Go(func() error { return events.Relay(ctx, db, js) })
	}
	if opts.Server {
		if err := startServer(ctx, g, cfg, db, nc, exporter, func(hub *stream.Hub) error { return hub.Run(ctx, nc) }); err != nil {
			return err
		}
	}
	return g.Wait()
}

func startServer(ctx context.Context, g *errgroup.Group, cfg *config.Config, db *gorm.DB, nc *nats.Conn, exporter *observer.Exporter, runHub func(*stream.Hub) error) error {
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

	auditor := kernel.NewAuditor(db)
	publisher := kernel.NewPublisher(db)
	engine := kernel.NewEngine(db, auditor)
	runtime := data.NewRuntime(db, publisher)
	engine.AddSource(data.NewOperationSource(runtime))
	engine.Register(domain.Operations(runtime, publisher)...)

	identitySvc := identity.NewService(db, c, auditor)
	connectSvc := connect.NewService(db, engine, auditor, c, runtime, secrets.NewOpenBao(cfg.OpenBao), unavailableDiscoverer{})
	artifacts, err := objectstore.Open(ctx, cfg.S3)
	if err != nil {
		return err
	}
	studioSvc := studio.NewService(db, auditor, publisher, runtime, artifacts, unavailablePlanner{})
	hub := stream.NewHub(db, runtime)
	g.Go(func() error { return runHub(hub) })

	obsClient := observer.NewClient(cfg.Observer.URL, cfg.Observer.Token)
	obsSvc := obs.NewService(db, c, nc, obsClient, cfg.Observer.ServiceName, cfg.AI.ServiceURL+"/healthz")

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
	})
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	mux.HandleFunc("GET /readyz", readiness(db, c))

	public := func(r *http.Request) bool {
		p := strings.TrimPrefix(r.URL.Path, api.BasePath)
		return !strings.HasPrefix(r.URL.Path, api.BasePath+"/") || p == "/personas" || p == "/demo/reset"
	}
	handler := middleware.Chain(mux,
		middleware.Recover(),
		middleware.CORS(cfg.CORSOrigins),
		middleware.CorrelationID(),
		middleware.Telemetry(exporter),
		middleware.RequestLogger(),
		middleware.Authenticate(cfg.OIDC, cfg.DemoMode, identitySvc, public),
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
	return nil
}

// unavailableDiscoverer stands in until wsn-ai-service is wired for MCP tool discovery.
type unavailableDiscoverer struct{}

func (unavailableDiscoverer) Discover(context.Context, string, string) ([]connect.ServerTool, error) {
	return nil, errors.New("wsn-ai-service is not connected")
}

// unavailablePlanner stands in until wsn-ai-service is wired as the Application Architect.
type unavailablePlanner struct{}

func (unavailablePlanner) Plan(context.Context, studio.PlanRequest) (*studio.Plan, error) {
	return nil, errors.New("wsn-ai-service is not connected")
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
