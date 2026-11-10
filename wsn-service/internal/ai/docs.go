package ai

import (
	"encoding/json"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

// AgentDoc is one row of the agents document collection.
type AgentDoc struct {
	ID                 string   `json:"id"`
	Name               string   `json:"name"`
	Description        string   `json:"description"`
	Kind               string   `json:"kind"`
	OwnerDepartmentID  string   `json:"ownerDepartmentId"`
	Model              string   `json:"model"`
	Instructions       string   `json:"instructions"`
	Tools              []string `json:"tools"`
	Permissions        []string `json:"permissions"`
	ActsAsCaller       bool     `json:"actsAsCaller"`
	Status             string   `json:"status"`
	MaxToolCallsPerRun int      `json:"maxToolCallsPerRun"`
	Version            int      `json:"version"`
}

// RunDoc is one row of the agent_runs collection; Steps keeps the raw wire steps.
type RunDoc struct {
	ID            string          `json:"id"`
	AgentID       string          `json:"agentId"`
	UserID        string          `json:"userId,omitempty"` // who started the run; empty for workflow runs
	Prompt        string          `json:"prompt"`
	Answer        string          `json:"answer"`
	Status        string          `json:"status"`
	Trigger       string          `json:"trigger"`
	TraceID       string          `json:"traceId"`
	ApplicationID string          `json:"applicationId,omitempty"`
	Steps         json.RawMessage `json:"steps"`
	Tokens        int             `json:"tokens"`
	DurationMs    int             `json:"durationMs"`
	StartedAt     time.Time       `json:"startedAt"`
}

// ProviderDoc is one row of the model_providers collection.
type ProviderDoc struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	Kind             string   `json:"kind"`
	Endpoint         string   `json:"endpoint"`
	Models           []string `json:"models"`
	Status           string   `json:"status"`
	TokensThisMonth  int      `json:"tokensThisMonth"`
	CostThisMonthUsd float32  `json:"costThisMonthUsd"`
}

// toOapi maps a provider doc to the contract type.
func (p *ProviderDoc) toOapi() oapi.ModelProvider {
	return oapi.ModelProvider{
		Id: p.ID, Name: p.Name, Kind: oapi.ModelProviderKind(p.Kind), Endpoint: p.Endpoint,
		Models: p.Models, Status: oapi.ModelProviderStatus(p.Status),
		TokensThisMonth: p.TokensThisMonth, CostThisMonthUsd: p.CostThisMonthUsd,
	}
}

// toOapi maps an agent doc to the contract type.
func (a *AgentDoc) toOapi() oapi.Agent {
	acts := a.ActsAsCaller
	return oapi.Agent{
		Id: a.ID, Name: a.Name, Description: a.Description, Kind: oapi.AgentKind(a.Kind),
		OwnerDepartmentId: a.OwnerDepartmentID, Model: a.Model, Instructions: a.Instructions,
		Tools: a.Tools, Permissions: perms(a.Permissions), ActsAsCaller: &acts,
		Status: oapi.AgentStatus(a.Status), MaxToolCallsPerRun: a.MaxToolCallsPerRun, Version: a.Version,
	}
}

func perms(list []string) []oapi.Permission {
	out := make([]oapi.Permission, 0, len(list))
	for _, p := range list {
		out = append(out, oapi.Permission(p))
	}
	return out
}

// toOapi maps a run doc to the contract type.
func (r *RunDoc) toOapi() (oapi.AgentRun, error) {
	var steps []oapi.AgentRunStep
	if len(r.Steps) > 0 {
		if err := json.Unmarshal(r.Steps, &steps); err != nil {
			return oapi.AgentRun{}, err
		}
	}
	if steps == nil {
		steps = []oapi.AgentRunStep{}
	}
	var appID *string
	if r.ApplicationID != "" {
		appID = &r.ApplicationID
	}
	return oapi.AgentRun{
		Id: r.ID, AgentId: r.AgentID, Prompt: r.Prompt, Answer: r.Answer,
		Status: oapi.AgentRunStatus(r.Status), Trigger: oapi.AgentRunTrigger(r.Trigger),
		TraceId: r.TraceID, ApplicationId: appID, Steps: steps,
		Tokens: r.Tokens, DurationMs: r.DurationMs, StartedAt: r.StartedAt,
	}, nil
}
