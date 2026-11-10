package ai

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
)

// builtinAgents are the platform's own agents; created on first start when missing, so a
// fresh (non-demo) installation has Sidekick and the Application Architect out of the box.
var builtinAgents = []AgentDoc{
	{
		ID: SidekickAgentID, Name: "Sidekick", Kind: "platform", Model: "mistral-medium-latest",
		Description: "Everyday assistant in the console. Acts as the signed-in user, never beyond their own permissions.",
		Instructions: "You help staff get work done from anywhere in the console. Answer questions and carry out requests with the tools you have. " +
			"You act as the user: if they are not allowed to do something, say so and point them to who can.",
		ActsAsCaller: true, Status: "active", MaxToolCallsPerRun: 20, Version: 1,
		Permissions: []string{"*"}, // acts as the signed-in user; the intersection keeps only what the user holds
	},
	{
		ID: "agent-application-architect", Name: "Application Architect", Kind: "platform", Model: "mistral-large-latest",
		Description:  "Converts requirements into application plans.",
		Instructions: "Built-in platform agent. Converts requirements into application plans. Proposes changes to the Application Blueprint for a human to approve.",
		Status:       "active", MaxToolCallsPerRun: 20, Version: 1,
	},
}

// EnsureBuiltins creates missing built-in agents and reconciles the fields the platform owns
// on existing ones. Idempotent; safe to call on every start.
func EnsureBuiltins(ctx context.Context, db *gorm.DB) error {
	return ensureBuiltins(ctx, docstore.NewCollection(db, "agents", func(a *AgentDoc) string { return a.ID }))
}

func ensureBuiltins(ctx context.Context, col collection[AgentDoc]) error {
	for i := range builtinAgents {
		want := builtinAgents[i]
		got, err := col.Get(ctx, want.ID)
		if errors.Is(err, docstore.ErrNotFound) {
			if err := col.Put(ctx, &want); err != nil {
				return err
			}
			continue
		}
		if err != nil {
			return err
		}
		if reconcileBuiltin(got, want) {
			got.Version++
			if err := col.Put(ctx, got); err != nil {
				return err
			}
		}
	}
	return nil
}

// reconcileBuiltin restores what the agent API cannot change (kind, acts-as-caller) and fills
// permissions left empty by older releases, so admin edits to permissions are kept.
func reconcileBuiltin(got *AgentDoc, want AgentDoc) bool {
	changed := false
	if got.Kind != want.Kind {
		got.Kind, changed = want.Kind, true
	}
	if got.ActsAsCaller != want.ActsAsCaller {
		got.ActsAsCaller, changed = want.ActsAsCaller, true
	}
	if len(got.Permissions) == 0 && len(want.Permissions) > 0 {
		got.Permissions, changed = append([]string(nil), want.Permissions...), true
	}
	return changed
}
