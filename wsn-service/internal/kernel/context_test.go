package kernel

import (
	"context"
	"slices"
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

func TestIsLocalSystemUser(t *testing.T) {
	if !IsLocalSystemUser("local:admin@workspacenow.local") {
		t.Fatal("local:… ids are the system user")
	}
	if IsLocalSystemUser("oidc-user-123") || IsLocalSystemUser("") {
		t.Fatal("IdP users and empty ids are not the system user")
	}
}

func TestIntersectWildcard(t *testing.T) {
	user := NewPermissions("inventory.read", "procurement.approve")
	if got := NewPermissions("*").Intersect(user).List(); !slices.Equal(got, []string{"inventory.read", "procurement.approve"}) {
		t.Fatalf("a wildcard agent keeps exactly the caller's permissions, got %v", got)
	}
	if got := user.Intersect(NewPermissions("*")).List(); !slices.Equal(got, []string{"inventory.read", "procurement.approve"}) {
		t.Fatalf("a wildcard caller keeps exactly the agent's permissions, got %v", got)
	}
	if got := NewPermissions("*").Intersect(NewPermissions("*")).List(); !slices.Equal(got, []string{"*"}) {
		t.Fatalf("wildcard on both sides stays a wildcard, got %v", got)
	}
	if got := user.Intersect(NewPermissions("inventory.read", "x")).List(); !slices.Equal(got, []string{"inventory.read"}) {
		t.Fatalf("plain intersection, got %v", got)
	}
}
