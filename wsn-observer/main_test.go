package main

import (
	"context"
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-observer/config"
	"github.com/thev1ndu/workspacenow/wsn-observer/walstore"
)

func testStore(t *testing.T) *walstore.Store {
	t.Helper()
	s, err := walstore.Open(t.TempDir(), 1<<20, 1<<16, 1000)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func TestServeShutsDownOnContextCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // already done: serve must listen, notice, and shut down cleanly
	cfg := config.Config{Port: 0}
	if err := serve(ctx, cfg, testStore(t)); err != nil {
		t.Fatalf("serve with canceled context must return nil, got %v", err)
	}
}

func TestServeReturnsListenErrors(t *testing.T) {
	cfg := config.Config{Port: 99999} // invalid port: ListenAndServe fails immediately
	if err := serve(context.Background(), cfg, testStore(t)); err == nil {
		t.Fatal("expected a listen error")
	}
}
