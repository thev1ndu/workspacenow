package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/connect"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/cache"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

// SidekickAgentID is the console assistant agent.
const SidekickAgentID = "agent-sidekick"

// InvokeOutcome is the internal tool API's answer; the ai-service maps it to a ToolCall.
type InvokeOutcome struct {
	Outcome string `json:"outcome"` // allowed, denied, error
	Output  any    `json:"output,omitempty"`
	Reason  string `json:"reason,omitempty"`
}

// Service runs agents through wsn-ai-service and serves the AI resources.
type Service interface {
	Providers(ctx context.Context) ([]oapi.ModelProvider, error)
	Agents(ctx context.Context) ([]oapi.Agent, error)
	Agent(ctx context.Context, id string) (*oapi.Agent, error)
	UpdateAgent(ctx context.Context, ec kernel.ExecutionContext, id string, body oapi.UpdateAgentJSONRequestBody) (*oapi.Agent, error)
	Runs(ctx context.Context, agentID, q string, limit, offset int) ([]oapi.AgentRun, int, error)
	Run(ctx context.Context, id string) (*oapi.AgentRun, error)
	RunAgent(ctx context.Context, caller *kernel.Caller, ec kernel.ExecutionContext, agentID, prompt string) (*oapi.AgentRun, error)
	RunSidekick(ctx context.Context, caller *kernel.Caller, ec kernel.ExecutionContext, prompt, appID string) (*oapi.AgentRun, error)
	// ToolCatalogue is the managed MCP server's tool list for the internal API.
	ToolCatalogue(ctx context.Context) ([]connect.Tool, error)
	// InvokeWithGrant authorizes one tool call against a signed run grant.
	InvokeWithGrant(ctx context.Context, token, tool string, input map[string]any) InvokeOutcome
	// InvokeAsUser runs one tool call as a signed-in user through the MCP entry point.
	InvokeAsUser(ctx context.Context, caller *kernel.Caller, tool string, input map[string]any) InvokeOutcome
	// AppendStep records one streamed run step and publishes the AgentRun.Step event.
	AppendStep(ctx context.Context, runID string, step json.RawMessage) error
}

// collection is the subset of docstore.Collection the AI service uses (fakes in tests).
type collection[T any] interface {
	Get(ctx context.Context, id string) (*T, error)
	GetForUpdate(ctx context.Context, id string) (*T, error)
	List(ctx context.Context) ([]T, error)
	Where(ctx context.Context, cond string, args ...any) ([]T, error)
	Page(ctx context.Context, cond string, limit, offset int, args ...any) ([]T, int64, error)
	Put(ctx context.Context, v *T) error
}

// runClient is the subset of Client the service calls.
type runClient interface {
	Run(ctx context.Context, req runRequest) (*runResult, error)
}

// toolSource is the subset of connect.Service the AI service uses.
type toolSource interface {
	Tools(ctx context.Context) ([]connect.Tool, error)
	ApplicationTools(ctx context.Context, applicationID string) ([]string, error)
}

type service struct {
	engine    kernel.Engine
	auditor   kernel.Auditor
	publisher kernel.Publisher
	cache     cache.Cache
	signer    *Signer
	verifier  *Verifier
	client    runClient
	tools     toolSource
	grantTTL  time.Duration

	providers collection[ProviderDoc]
	agents    collection[AgentDoc]
	runs      collection[RunDoc]
	apps      collection[appDoc]
}

// Deps are the service's collaborators.
type Deps struct {
	DB        *gorm.DB
	Engine    kernel.Engine
	Auditor   kernel.Auditor
	Publisher kernel.Publisher
	Cache     cache.Cache
	Signer    *Signer
	Client    runClient
	Connect   toolSource
	GrantTTL  time.Duration
}

// NewService wires the AI service.
func NewService(d Deps) Service {
	return &service{
		engine: d.Engine, auditor: d.Auditor, publisher: d.Publisher, cache: d.Cache,
		signer: d.Signer, verifier: d.Signer.Verifier(), client: d.Client, tools: d.Connect, grantTTL: d.GrantTTL,
		providers: docstore.NewCollection(d.DB, "model_providers", func(p *ProviderDoc) string { return p.ID }),
		agents:    docstore.NewCollection(d.DB, "agents", func(a *AgentDoc) string { return a.ID }),
		runs:      docstore.NewCollection(d.DB, "agent_runs", func(r *RunDoc) string { return r.ID }),
		apps:      docstore.NewCollection(d.DB, "applications", func(a *appDoc) string { return a.ID }),
	}
}

func (s *service) Providers(ctx context.Context) ([]oapi.ModelProvider, error) {
	docs, err := s.providers.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]oapi.ModelProvider, 0, len(docs))
	for _, p := range docs {
		out = append(out, p.toOapi())
	}
	return out, nil
}

func (s *service) Agents(ctx context.Context) ([]oapi.Agent, error) {
	docs, err := s.agents.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]oapi.Agent, 0, len(docs))
	for _, a := range docs {
		out = append(out, a.toOapi())
	}
	return out, nil
}

func (s *service) Agent(ctx context.Context, id string) (*oapi.Agent, error) {
	doc, err := s.agents.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	out := doc.toOapi()
	return &out, nil
}

// UpdateAgent applies a PATCH after checking ai.manage and that every tool is a known MCP tool.
func (s *service) UpdateAgent(ctx context.Context, ec kernel.ExecutionContext, id string, body oapi.UpdateAgentJSONRequestBody) (*oapi.Agent, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "ai.manage", "agent.update", "agent/"+id); err != nil {
		return nil, err
	}
	doc, err := s.agents.GetForUpdate(ctx, id)
	if err != nil {
		return nil, err
	}
	if body.Tools != nil {
		tools, err := s.tools.Tools(ctx)
		if err != nil {
			return nil, err
		}
		for _, t := range *body.Tools {
			if !slices.ContainsFunc(tools, func(ct connect.Tool) bool { return ct.Name == t }) {
				return nil, kernel.Invalid("%s is not an exposed MCP tool", t)
			}
		}
		doc.Tools = *body.Tools
	}
	if body.Permissions != nil {
		doc.Permissions = make([]string, 0, len(*body.Permissions))
		for _, p := range *body.Permissions {
			doc.Permissions = append(doc.Permissions, string(p))
		}
	}
	if body.Instructions != nil {
		doc.Instructions = *body.Instructions
	}
	if body.Model != nil {
		doc.Model = *body.Model
	}
	if body.Status != nil {
		doc.Status = string(*body.Status)
	}
	doc.Version++
	if err := s.agents.Put(ctx, doc); err != nil {
		return nil, err
	}
	if err := s.auditor.Record(ctx, ec, "agent.update", "agent/"+id, kernel.OutcomeAllowed, fmt.Sprintf("version %d", doc.Version)); err != nil {
		return nil, err
	}
	out := doc.toOapi()
	return &out, nil
}

func (s *service) Runs(ctx context.Context, agentID, q string, limit, offset int) ([]oapi.AgentRun, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	cond, args := "", []any{}
	if agentID != "" {
		cond = "doc->>'agentId' = ?"
		args = append(args, agentID)
	}
	if q != "" {
		like := "%" + q + "%"
		if cond != "" {
			cond += " AND (doc->>'prompt' ILIKE ? OR id ILIKE ?)"
		} else {
			cond = "(doc->>'prompt' ILIKE ? OR id ILIKE ?)"
		}
		args = append(args, like, like)
	}
	docs, total, err := s.runs.Page(ctx, cond, limit, offset, args...)
	if err != nil {
		return nil, 0, err
	}
	out := make([]oapi.AgentRun, 0, len(docs))
	for i := range docs {
		run, err := docs[i].toOapi()
		if err != nil {
			return nil, 0, err
		}
		out = append(out, run)
	}
	return out, int(total), nil
}

func (s *service) Run(ctx context.Context, id string) (*oapi.AgentRun, error) {
	doc, err := s.runs.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	out, err := doc.toOapi()
	if err != nil {
		return nil, err
	}
	return &out, nil
}

// run executes one agent: grant, ai-service run, persistence, accounting, events.
func (s *service) run(ctx context.Context, caller *kernel.Caller, traceID, agentID, prompt, trigger, appID string) (*oapi.AgentRun, error) {
	agent, err := s.agents.Get(ctx, agentID)
	if err != nil {
		return nil, kernel.NotFound("Agent %s not found", agentID)
	}
	if agent.Status != "active" {
		return nil, kernel.InvalidState("%s is %s", agent.Name, agent.Status)
	}
	if agent.ActsAsCaller && caller == nil {
		return nil, kernel.InvalidState("%s runs only on behalf of a signed-in user", agent.Name)
	}
	permissions := agent.Permissions
	if agent.ActsAsCaller && caller != nil {
		permissions = kernel.NewPermissions(agent.Permissions...).Intersect(caller.Permissions).List()
	}
	appName := ""
	runTools := agent.Tools
	if appID != "" {
		appTools, err := s.tools.ApplicationTools(ctx, appID)
		if err != nil {
			return nil, err
		}
		apps, err := s.applicationName(ctx, appID)
		if err != nil {
			return nil, err
		}
		appName = apps
		runTools = intersect(agent.Tools, appTools)
	}

	ec := kernel.ExecutionContext{
		Actor:       kernel.Actor{Kind: kernel.ActorAgent, ID: agent.ID, Name: agent.Name, OnBehalfOf: callerName(caller)},
		Permissions: kernel.NewPermissions(permissions...),
		TraceID:     traceID,
		EntryPoint:  kernel.EntryAgent,
	}
	if err := s.auditor.Record(ctx, ec, "agent.run", "agent/"+agent.ID, kernel.OutcomeAllowed, prompt); err != nil {
		return nil, err
	}

	runID := kernel.NewID("run")
	grant := Grant{
		RunID: runID, TraceID: traceID, AgentID: agent.ID, AgentName: agent.Name,
		OnBehalfOf: callerName(caller), Permissions: permissions, Tools: runTools,
		ApplicationID: appID, Budget: agent.MaxToolCallsPerRun, ExpiresAt: time.Now().UTC().Add(s.grantTTL),
	}
	grantToken, err := s.signer.Sign(grant)
	if err != nil {
		return nil, err
	}
	catalogue, err := s.tools.Tools(ctx)
	if err != nil {
		return nil, err
	}
	tools := make([]toolSpec, 0, len(runTools))
	for _, t := range catalogue {
		if slices.Contains(runTools, t.Name) {
			tools = append(tools, toolSpec{Name: t.Name, Description: t.Description, InputSchema: t.InputSchema})
		}
	}
	res, err := s.client.Run(ctx, runRequest{
		RunID: runID,
		Agent: agentSpec{
			ID: agent.ID, Name: agent.Name, Model: agent.Model,
			Instructions: agent.Instructions, MaxToolCallsPerRun: agent.MaxToolCallsPerRun,
		},
		Prompt: prompt, Grant: grantToken, Tools: tools, ApplicationName: appName,
	})
	if err != nil {
		_ = s.auditor.RecordDetached(ctx, ec, "agent.run", "agent/"+agent.ID, kernel.OutcomeFailed, err.Error())
		return nil, kernel.InvalidState("The agent run failed: %s", err)
	}
	steps, _ := json.Marshal(res.Steps)
	doc := &RunDoc{
		ID: runID, AgentID: agent.ID, Prompt: prompt, Answer: res.Answer,
		Status: res.Status, Trigger: trigger, TraceID: traceID, ApplicationID: appID,
		Steps: steps, Tokens: res.Tokens, DurationMs: res.DurationMs, StartedAt: time.Now().UTC(),
	}
	if err := s.runs.Put(ctx, doc); err != nil {
		return nil, err
	}
	if err := s.addCost(ctx, agent.Model, res.Tokens); err != nil {
		return nil, err
	}
	run, err := doc.toOapi()
	if err != nil {
		return nil, err
	}
	payload, _ := json.Marshal(run)
	if _, err := s.publisher.Publish(ctx, ec, "AgentRun.Completed", "agent/"+agent.ID, map[string]any{"run": json.RawMessage(payload)}); err != nil {
		return nil, err
	}
	return &run, nil
}

func (s *service) RunAgent(ctx context.Context, caller *kernel.Caller, ec kernel.ExecutionContext, agentID, prompt string) (*oapi.AgentRun, error) {
	return s.run(ctx, caller, ec.TraceID, agentID, prompt, "manual", "")
}

// RunSidekick runs the console assistant as the caller, optionally confined to one application.
func (s *service) RunSidekick(ctx context.Context, caller *kernel.Caller, ec kernel.ExecutionContext, prompt, appID string) (*oapi.AgentRun, error) {
	if len(caller.Roles) == 0 {
		_ = s.auditor.RecordDetached(ctx, ec, "sidekick.run", "agent/"+SidekickAgentID, kernel.OutcomeDenied, "User holds no role")
		return nil, kernel.Forbidden("Sidekick needs a signed-in user with a role").WithTrace(ec.TraceID)
	}
	if appID != "" {
		if _, err := s.applicationName(ctx, appID); err != nil {
			return nil, kernel.NotFound("Application %s not found", appID).WithTrace(ec.TraceID)
		}
	}
	return s.run(ctx, caller, ec.TraceID, SidekickAgentID, prompt, "manual", appID)
}

// appDoc is the subset of the applications collection the AI service needs.
type appDoc struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// applicationName resolves an application's name from the applications collection.
func (s *service) applicationName(ctx context.Context, appID string) (string, error) {
	app, err := s.apps.Get(ctx, appID)
	if err != nil {
		return "", err
	}
	return app.Name, nil
}

// addCost adds tokens and the approximate cost to the provider serving the model.
func (s *service) addCost(ctx context.Context, model string, tokens int) error {
	docs, err := s.providers.List(ctx)
	if err != nil {
		return err
	}
	for _, p := range docs {
		if !slices.Contains(p.Models, model) {
			continue
		}
		p.TokensThisMonth += tokens
		p.CostThisMonthUsd += float32(tokens) / 1e6 * pricePerMTok(model)
		return s.providers.Put(ctx, &p)
	}
	return nil
}

// pricePerMTok is the approximate list price used for the monthly cost figure.
func pricePerMTok(model string) float32 {
	switch m := strings.ToLower(model); {
	case strings.Contains(m, "large"):
		return 8
	case strings.Contains(m, "small"):
		return 0.25
	default:
		return 2
	}
}

func callerName(c *kernel.Caller) string {
	if c == nil {
		return ""
	}
	return c.Name
}

func intersect(a, b []string) []string {
	out := []string{}
	for _, x := range a {
		if slices.Contains(b, x) {
			out = append(out, x)
		}
	}
	return out
}

func (s *service) ToolCatalogue(ctx context.Context) ([]connect.Tool, error) {
	return s.tools.Tools(ctx)
}

// InvokeWithGrant checks the signed grant, its tool list, app scope and call budget, then invokes.
func (s *service) InvokeWithGrant(ctx context.Context, token, tool string, input map[string]any) InvokeOutcome {
	grant, err := s.verifier.Verify(token)
	if err != nil {
		return InvokeOutcome{Outcome: "denied", Reason: err.Error()}
	}
	if !grant.Permits(tool) {
		return s.deny(ctx, grant.ExecutionContext(), tool, grant.ApplicationID, "Tool "+tool+" is not granted to this run")
	}
	if grant.ApplicationID != "" {
		appTools, err := s.tools.ApplicationTools(ctx, grant.ApplicationID)
		if err != nil || !slices.Contains(appTools, tool) {
			name, _ := s.applicationName(ctx, grant.ApplicationID)
			return s.deny(ctx, grant.ExecutionContext(), tool, grant.ApplicationID, tool+" is outside "+name)
		}
	}
	n, err := s.cache.IncrWindow(ctx, "ai:grant:"+grant.RunID, s.grantTTL)
	if err == nil && n > int64(grant.Budget) {
		return s.deny(ctx, grant.ExecutionContext(), tool, grant.ApplicationID, "The run's call budget is exhausted")
	}
	return s.invoke(ctx, grant.ExecutionContext(), tool, input, grant.ApplicationID)
}

// InvokeAsUser runs a tool call as the signed-in user through the MCP entry point.
func (s *service) InvokeAsUser(ctx context.Context, caller *kernel.Caller, tool string, input map[string]any) InvokeOutcome {
	ec := caller.Context(kernel.EntryMCP, "")
	return s.invoke(ctx, ec, tool, input, "")
}

// deny audits and answers a refused call.
func (s *service) deny(ctx context.Context, ec kernel.ExecutionContext, tool, appID, reason string) InvokeOutcome {
	resource := "mcp-tool/" + tool
	if appID != "" {
		resource = "application/" + appID
	}
	_ = s.auditor.RecordDetached(ctx, ec, "mcp."+tool, resource, kernel.OutcomeDenied, reason)
	return InvokeOutcome{Outcome: "denied", Reason: reason}
}

// invoke runs the tool's business operation through the engine, which authorizes and audits it.
func (s *service) invoke(ctx context.Context, ec kernel.ExecutionContext, tool string, input map[string]any, appID string) InvokeOutcome {
	tools, err := s.tools.Tools(ctx)
	if err != nil {
		return InvokeOutcome{Outcome: "error", Reason: err.Error()}
	}
	def := connect.Tool{}
	ok := false
	for _, t := range tools {
		if t.Name == tool {
			def, ok = t, true
			break
		}
	}
	if !ok {
		_ = s.auditor.RecordDetached(ctx, ec, "mcp."+tool, "mcp-tool/"+tool, kernel.OutcomeFailed, "Tool is no longer exposed")
		return InvokeOutcome{Outcome: "error", Reason: "Tool is no longer exposed"}
	}
	if def.Source != "workspacenow" {
		_ = s.auditor.RecordDetached(ctx, ec, "mcp."+tool, "mcp-server/"+def.ServerID, kernel.OutcomeFailed, "External MCP calls are not wired yet")
		return InvokeOutcome{Outcome: "error", Reason: "External MCP calls are not wired yet"}
	}
	out, err := s.engine.Invoke(ctx, ec, def.BusinessOperation, input)
	if err != nil {
		var kerr *kernel.Error
		if errors.As(err, &kerr) && kerr.Status == 403 {
			return s.deny(ctx, ec, tool, appID, kerr.Message)
		}
		_ = s.auditor.RecordDetached(ctx, ec, "mcp."+tool, "mcp-tool/"+tool, kernel.OutcomeFailed, err.Error())
		return InvokeOutcome{Outcome: "error", Reason: err.Error()}
	}
	return InvokeOutcome{Outcome: "allowed", Output: out}
}

// AppendStep appends one streamed step to the run and publishes AgentRun.Step.
func (s *service) AppendStep(ctx context.Context, runID string, step json.RawMessage) error {
	doc, err := s.runs.GetForUpdate(ctx, runID)
	if err != nil {
		return err
	}
	var steps []json.RawMessage
	if len(doc.Steps) > 0 {
		if err := json.Unmarshal(doc.Steps, &steps); err != nil {
			return err
		}
	}
	steps = append(steps, step)
	doc.Steps, _ = json.Marshal(steps)
	if err := s.runs.Put(ctx, doc); err != nil {
		return err
	}
	ec := kernel.ExecutionContext{TraceID: doc.TraceID, EntryPoint: kernel.EntryAgent,
		Actor: kernel.Actor{Kind: kernel.ActorAgent, ID: doc.AgentID}}
	_, err = s.publisher.Publish(ctx, ec, "AgentRun.Step", "agent/"+doc.AgentID, map[string]any{"runId": runID, "step": step})
	return err
}
