package kernel

import (
	"context"
	"testing"
)

func TestContextFromFallsBackToRequestTrace(t *testing.T) {
	c := &Caller{UserID: "u1", Name: "Amaya", Permissions: NewPermissions()}
	ctx := WithTraceID(context.Background(), "trace-req")

	ec := c.ContextFrom(ctx, EntryAPI, "")
	if ec.TraceID != "trace-req" || ec.EntryPoint != EntryAPI || ec.Actor.ID != "u1" {
		t.Fatalf("ec: %+v", ec)
	}
	if ec := c.ContextFrom(ctx, EntryAPI, "trace-explicit"); ec.TraceID != "trace-explicit" {
		t.Fatalf("explicit trace wins: %+v", ec)
	}
	if ec := c.ContextFrom(context.Background(), EntryAPI, ""); ec.TraceID == "" {
		t.Fatal("a fresh trace id is minted without one in ctx")
	}
	if TraceIDFrom(context.Background()) != "" {
		t.Fatal("no trace id in a bare context")
	}
}

func TestPermissionsWildcard(t *testing.T) {
	p := NewPermissions("*")
	if !p.Has("anything.at.all") {
		t.Fatal("wildcard permission should grant every permission")
	}
	if NewPermissions("a").Has("b") {
		t.Fatal("non-wildcard set must not grant unrelated permission")
	}
}
