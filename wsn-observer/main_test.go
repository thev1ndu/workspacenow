package main

import (
	"context"
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-observer/config"
)

func TestServeShutsDownOnContextCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // already done: serve must listen, notice, and shut down cleanly
	cfg := config.Config{Port: 0, Retention: 10}
	if err := serve(ctx, cfg); err != nil {
		t.Fatalf("serve with canceled context must return nil, got %v", err)
	}
}

func TestServeReturnsListenErrors(t *testing.T) {
	cfg := config.Config{Port: 99999, Retention: 10} // invalid port: ListenAndServe fails immediately
	if err := serve(context.Background(), cfg); err == nil {
		t.Fatal("expected a listen error")
	}
}
