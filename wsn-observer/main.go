// Command wsn-observer ingests OTLP telemetry from the platform's services and serves the
// query API the console's observability views call. All signals are appended to segment
// files under WSN_OBSERVER_DATA_DIR — no database, no in-memory payload.
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
	"github.com/thev1ndu/workspacenow/wsn-observer/walstore"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Printf("wsn-observer: invalid configuration: %v", err)
		os.Exit(1)
	}
	log.Printf("wsn-observer %s listening on :%d, storing telemetry in %s", config.Version, cfg.Port, cfg.DataDir)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	store, err := walstore.Open(cfg.DataDir, cfg.RetentionBytes, cfg.SegmentBytes, cfg.ScanLimit)
	if err != nil {
		log.Printf("wsn-observer: %v", err)
		os.Exit(1)
	}
	defer store.Close()
	if err := serve(ctx, cfg, store); err != nil {
		log.Printf("wsn-observer: %v", err)
		os.Exit(1)
	}
}

func serve(ctx context.Context, cfg config.Config, store *walstore.Store) error {
	srv := &http.Server{
		Addr:              ":" + strconv.Itoa(cfg.Port),
		Handler:           server.New(cfg, store),
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
