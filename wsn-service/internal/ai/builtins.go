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
	},
	{
		ID: "agent-application-architect", Name: "Application Architect", Kind: "platform", Model: "mistral-large-latest",
		Description: "Converts requirements into application plans.",
		Instructions: "Built-in platform agent. Converts requirements into application plans. Proposes changes to the Application Blueprint for a human to approve.",
		Status: "active", MaxToolCallsPerRun: 20, Version: 1,
	},
}

// EnsureBuiltins creates any missing built-in agents. Idempotent; safe to call on every start.
func EnsureBuiltins(ctx context.Context, db *gorm.DB) error {
	col := docstore.NewCollection(db, "agents", func(a *AgentDoc) string { return a.ID })
	for i := range builtinAgents {
		a := builtinAgents[i]
		if _, err := col.Get(ctx, a.ID); errors.Is(err, docstore.ErrNotFound) {
			if err := col.Put(ctx, &a); err != nil {
				return err
			}
		} else if err != nil {
			return err
		}
	}
	return nil
}
