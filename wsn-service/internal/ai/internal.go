package ai

import (
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// ExecutionContext rebuilds the run's execution context for a tool call (entry point mcp).
func (g *Grant) ExecutionContext() kernel.ExecutionContext {
	return kernel.ExecutionContext{
		Actor:       kernel.Actor{Kind: kernel.ActorAgent, ID: g.AgentID, Name: g.AgentName, OnBehalfOf: g.OnBehalfOf},
		Permissions: kernel.NewPermissions(g.Permissions...),
		TraceID:     g.TraceID,
		EntryPoint:  kernel.EntryMCP,
	}
}
