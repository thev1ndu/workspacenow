// Command wsn-observer ingests OTLP telemetry (traces, logs, metrics) from the platform's
// services and serves the query API the console's observability views call.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-observer/config"
	"github.com/thev1ndu/workspacenow/wsn-observer/server"
	"github.com/thev1ndu/workspacenow/wsn-observer/telemetry"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Printf("wsn-observer: invalid configuration: %v", err)
		os.Exit(1)
	}
	log.Printf("wsn-observer %s listening on :%d", config.Version, cfg.Port)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := serve(ctx, cfg); err != nil {
		log.Printf("wsn-observer: %v", err)
		os.Exit(1)
	}
}

func serve(ctx context.Context, cfg config.Config) error {
	srv := &http.Server{
		Addr:              ":" + strconv.Itoa(cfg.Port),
		Handler:           server.New(cfg, telemetry.NewStore(cfg.Retention)),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	errCh := make(chan error, 1)
	go func() { errCh <- srv.ListenAndServe() }()
	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}
