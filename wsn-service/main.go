// Command wsn-service runs the WorkspaceNow service; flags pick the role (-migrate, -server, -relay, -worker).
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/thev1ndu/workspacenow/wsn-service/app"
	"github.com/thev1ndu/workspacenow/wsn-service/config"
)

func main() {
	var opts app.Options
	flag.BoolVar(&opts.Migrate, "migrate", false, "apply database migrations")
	flag.BoolVar(&opts.Server, "server", true, "serve the HTTP API and the event stream")
	flag.BoolVar(&opts.Relay, "relay", false, "relay committed events from the outbox to NATS")
	flag.BoolVar(&opts.Worker, "worker", false, "run the Temporal workflow worker and event trigger consumer")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "configuration:", err)
		os.Exit(2)
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	if err := app.Run(ctx, cfg, opts); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
