package ai

import (
	"context"
	"slices"
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

func TestEnsureBuiltinsCreatesAndReconciles(t *testing.T) {
	ctx := context.Background()
	col := newMemCollection(func(a *AgentDoc) string { return a.ID })
	// a Sidekick saved by an older release: no permissions, acts-as-caller lost
	col.Put(ctx, &AgentDoc{ID: SidekickAgentID, Name: "Sidekick", Kind: "business", Instructions: "edited by an admin", Version: 3})
	if err := ensureBuiltins(ctx, col); err != nil {
		t.Fatal(err)
	}
	sk, _ := col.Get(ctx, SidekickAgentID)
	if !sk.ActsAsCaller || sk.Kind != "platform" || !slices.Equal(sk.Permissions, []string{"*"}) || sk.Version != 4 {
		t.Fatalf("sidekick not reconciled: %+v", sk)
	}
	if sk.Instructions != "edited by an admin" {
		t.Fatalf("admin-editable fields must be kept: %q", sk.Instructions)
	}
	if _, err := col.Get(ctx, "agent-application-architect"); err != nil {
		t.Fatalf("missing builtin must be created: %v", err)
	}
	if err := ensureBuiltins(ctx, col); err != nil {
		t.Fatal(err)
	}
	if again, _ := col.Get(ctx, SidekickAgentID); again.Version != 4 {
		t.Fatalf("second start must not change anything: version %d", again.Version)
	}
}

func TestEnsureBuiltinsKeepsNarrowedPermissions(t *testing.T) {
	ctx := context.Background()
	col := newMemCollection(func(a *AgentDoc) string { return a.ID })
	col.Put(ctx, &AgentDoc{ID: SidekickAgentID, Kind: "platform", ActsAsCaller: true, Permissions: []string{"inventory.read"}, Version: 2})
	if err := ensureBuiltins(ctx, col); err != nil {
		t.Fatal(err)
	}
	if sk, _ := col.Get(ctx, SidekickAgentID); !slices.Equal(sk.Permissions, []string{"inventory.read"}) || sk.Version != 2 {
		t.Fatalf("an admin's narrowed permissions must be kept: %+v", sk)
	}
}

// The default admin holds the wildcard role; the builtin Sidekick (no tool list, "*") must reach every tool for them.
func TestRunBuiltinSidekickAsDefaultAdmin(t *testing.T) {
	s, _, _, _, _, runner, agents, _, _ := testService(t)
	ctx := context.Background()
	sk := builtinAgents[0]
	agents.Put(ctx, &sk)
	admin := &kernel.Caller{UserID: "local:admin@workspacenow.local", Name: "admin", Roles: []string{"workspacenow-admin"}, Permissions: kernel.NewPermissions("*")}
	ec := admin.Context(kernel.EntryAPI, "trace-admin")

	if _, err := s.RunSidekick(ctx, admin, ec, "what is low?", ""); err != nil {
		t.Fatal(err)
	}
	if got := len(runner.reqs[0].Tools); got != 2 {
		t.Fatalf("unscoped Sidekick gets the whole catalogue, got %d tools", got)
	}
	grant, err := s.verifier.Verify(runner.reqs[0].Grant)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(grant.Permissions, []string{"*"}) {
		t.Fatalf("grant must carry the admin's wildcard: %v", grant.Permissions)
	}

	if _, err := s.RunSidekick(ctx, admin, ec, "what is low?", "app-inventory"); err != nil {
		t.Fatal(err)
	}
	if tools := runner.reqs[1].Tools; len(tools) != 1 || tools[0].Name != "get_low_stock_items" {
		t.Fatalf("app-scoped Sidekick gets the app's tools, got %+v", tools)
	}
}
