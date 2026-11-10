package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/connect"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/cache"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

// memCollection is an in-memory collection fake.
type memCollection[T any] struct {
	mu    sync.Mutex
	data  map[string]*T
	order []string // insertion sequence, mirrors the real table's seq
	key   func(*T) string
}

func newMemCollection[T any](key func(*T) string) *memCollection[T] {
	return &memCollection[T]{data: map[string]*T{}, key: key}
}

func (m *memCollection[T]) Get(_ context.Context, id string) (*T, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if v, ok := m.data[id]; ok {
		return v, nil
	}
	return nil, fmt.Errorf("%w: %s", docstore.ErrNotFound, id)
}

func (m *memCollection[T]) GetForUpdate(ctx context.Context, id string) (*T, error) {
	return m.Get(ctx, id)
}

func (m *memCollection[T]) List(context.Context) ([]T, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]T, 0, len(m.data))
	for _, v := range m.data {
		out = append(out, *v)
	}
	return out, nil
}

func (m *memCollection[T]) Where(_ context.Context, cond string, args ...any) ([]T, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	// supports the doc->>'key' = ? equality conditions the service uses, matched to args in order
	keys := regexp.MustCompile(`doc->>'(\w+)' = \?`).FindAllStringSubmatch(cond, -1)
	var out []T
	for _, v := range m.data {
		raw, _ := json.Marshal(v)
		var doc map[string]any
		_ = json.Unmarshal(raw, &doc)
		match := true
		for i, k := range keys {
			if i >= len(args) || fmt.Sprint(doc[k[1]]) != fmt.Sprint(args[i]) {
				match = false
			}
		}
		if match {
			out = append(out, *v)
		}
	}
	return out, nil
}

func (m *memCollection[T]) Page(_ context.Context, cond string, limit, offset int, args ...any) ([]T, int64, error) {
	all, _ := m.Where(context.Background(), cond, args...)
	// the real collection pages by seq desc (newest first); mirror that here
	slices.SortFunc(all, func(a, b T) int {
		return slices.Index(m.order, m.key(&b)) - slices.Index(m.order, m.key(&a))
	})
	total := int64(len(all))
	if offset >= len(all) {
		return []T{}, total, nil
	}
	end := len(all)
	if limit > 0 && offset+limit < end {
		end = offset + limit
	}
	return all[offset:end], total, nil
}

func (m *memCollection[T]) Put(_ context.Context, v *T) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	k := m.key(v)
	if _, ok := m.data[k]; !ok {
		m.order = append(m.order, k)
	}
	m.data[k] = v
	return nil
}

type fakeEngine struct {
	mu       sync.Mutex
	calls    []string
	failWith *kernel.Error
}

func (f *fakeEngine) Register(...kernel.Operation)                  {}
func (f *fakeEngine) AddSource(kernel.OperationSource)              {}
func (f *fakeEngine) SetOnInvoke(func(string, time.Duration, bool)) {}
func (f *fakeEngine) Lookup(context.Context, string) (*kernel.Operation, error) {
	return &kernel.Operation{Name: "op"}, nil
}
func (f *fakeEngine) List(context.Context) ([]kernel.Operation, error) { return nil, nil }
func (f *fakeEngine) Invoke(_ context.Context, ec kernel.ExecutionContext, name string, input map[string]any) (any, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, name)
	if f.failWith != nil {
		return nil, f.failWith
	}
	return map[string]any{"ok": true, "op": name}, nil
}

type fakeAuditor struct {
	mu      sync.Mutex
	records []string
}

func (f *fakeAuditor) Record(_ context.Context, ec kernel.ExecutionContext, action, resource string, outcome kernel.Outcome, detail string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.records = append(f.records, fmt.Sprintf("%s %s %s", action, resource, outcome))
	return nil
}

func (f *fakeAuditor) RecordDetached(ctx context.Context, ec kernel.ExecutionContext, action, resource string, outcome kernel.Outcome, detail string) error {
	return f.Record(ctx, ec, action, resource, outcome, detail)
}

type fakePublisher struct {
	mu     sync.Mutex
	events []string
}

func (f *fakePublisher) Publish(_ context.Context, ec kernel.ExecutionContext, eventType, source string, payload map[string]any) (*kernel.Event, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.events = append(f.events, eventType)
	return &kernel.Event{ID: "evt-1", Type: eventType, Source: source, TraceID: ec.TraceID, Payload: payload, Time: time.Now()}, nil
}

type fakeCache struct{ n int64 }

func (f *fakeCache) GetJSON(context.Context, string, any) (bool, error) { return false, nil }
func (f *fakeCache) SetJSON(context.Context, string, any, time.Duration) error {
	return nil
}
func (f *fakeCache) Get(context.Context, string) (string, bool, error) { return "", false, nil }
func (f *fakeCache) Incr(context.Context, string) (int64, error)       { return 0, nil }
func (f *fakeCache) IncrWindow(_ context.Context, _ string, _ time.Duration) (int64, error) {
	f.n++
	return f.n, nil
}
func (f *fakeCache) Ping(context.Context) error { return nil }
func (f *fakeCache) Close() error               { return nil }

var _ cache.Cache = (*fakeCache)(nil)

type fakeTools struct {
	tools    []connect.Tool
	appTools map[string][]string
}

func (f *fakeTools) Tools(context.Context) ([]connect.Tool, error) { return f.tools, nil }
func (f *fakeTools) ApplicationTools(_ context.Context, appID string) ([]string, error) {
	return f.appTools[appID], nil
}

type fakeRunner struct {
	mu     sync.Mutex
	reqs   []runRequest
	result *runResult
	err    error
}

func (f *fakeRunner) Run(_ context.Context, req runRequest) (*runResult, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.reqs = append(f.reqs, req)
	if f.err != nil {
		return nil, f.err
	}
	return f.result, nil
}

func testService(t *testing.T) (*service, *fakeEngine, *fakeAuditor, *fakePublisher, *fakeCache, *fakeRunner, *memCollection[AgentDoc], *memCollection[RunDoc], *memCollection[ProviderDoc]) {
	t.Helper()
	signer := GenerateSigner()
	engine := &fakeEngine{}
	auditor := &fakeAuditor{}
	publisher := &fakePublisher{}
	c := &fakeCache{}
	runner := &fakeRunner{result: &runResult{Status: "completed", Answer: "done", Tokens: 100, DurationMs: 5, Steps: []json.RawMessage{json.RawMessage(`{"kind":"thought","text":"hi"}`)}}}
	agents := newMemCollection(func(a *AgentDoc) string { return a.ID })
	runs := newMemCollection(func(r *RunDoc) string { return r.ID })
	providers := newMemCollection(func(p *ProviderDoc) string { return p.ID })
	apps := newMemCollection(func(a *appDoc) string { return a.ID })
	tools := &fakeTools{
		tools: []connect.Tool{
			{Name: "get_low_stock_items", Description: "Low stock", Source: "workspacenow", BusinessOperation: "inventory.lowStock", Permission: "inventory.read"},
			{Name: "approve_purchase_request", Source: "workspacenow", BusinessOperation: "procurement.approve", Permission: "procurement.approve"},
		},
		appTools: map[string][]string{"app-inventory": {"get_low_stock_items"}},
	}
	s := &service{
		engine: engine, auditor: auditor, publisher: publisher, cache: c,
		signer: signer, verifier: signer.Verifier(), client: runner, tools: tools, grantTTL: 5 * time.Minute,
		providers: providers, agents: agents, runs: runs, apps: apps,
	}
	agents.Put(context.Background(), &AgentDoc{
		ID: "agent-sidekick", Name: "Sidekick", Kind: "platform", Model: "mistral-medium-latest",
		Status: "active", ActsAsCaller: true, MaxToolCallsPerRun: 3,
		Tools: []string{"get_low_stock_items", "approve_purchase_request"}, Permissions: []string{"inventory.read", "procurement.approve"},
	})
	agents.Put(context.Background(), &AgentDoc{
		ID: "agent-proc", Name: "Procurement Assistant", Kind: "business", Model: "mistral-large-latest",
		Status: "active", MaxToolCallsPerRun: 4, Tools: []string{"get_low_stock_items"}, Permissions: []string{"inventory.read"},
	})
	providers.Put(context.Background(), &ProviderDoc{ID: "mp-mistral", Name: "Mistral", Models: []string{"mistral-medium-latest", "mistral-large-latest"}})
	apps.Put(context.Background(), &appDoc{ID: "app-inventory", Name: "Inventory Management"})
	return s, engine, auditor, publisher, c, runner, agents, runs, providers
}

func caller() *kernel.Caller {
	return &kernel.Caller{UserID: "u-amaya", Name: "Amaya", Roles: []string{"admin"}, Permissions: kernel.NewPermissions("inventory.read", "procurement.approve", "ai.manage")}
}

func TestRunAgentHappyPath(t *testing.T) {
	s, engine, auditor, publisher, _, runner, _, runs, providers := testService(t)
	ec := caller().Context(kernel.EntryAPI, "trace-1")
	run, err := s.RunAgent(context.Background(), caller(), ec, "agent-proc", "Which items are low?")
	if err != nil {
		t.Fatal(err)
	}
	if run.Status != "completed" || run.Answer != "done" || run.Tokens != 100 || run.TraceId != "trace-1" {
		t.Fatalf("run: %+v", run)
	}
	if len(runner.reqs) != 1 || runner.reqs[0].Agent.ID != "agent-proc" || runner.reqs[0].Grant == "" {
		t.Fatalf("ai request: %+v", runner.reqs)
	}
	if len(engine.calls) != 0 {
		t.Fatal("the platform, not the run, calls tools")
	}
	if len(runs.data) != 1 {
		t.Fatal("run must be persisted")
	}
	prov, _ := providers.Get(context.Background(), "mp-mistral")
	if prov.TokensThisMonth != 100 || prov.CostThisMonthUsd == 0 {
		t.Fatalf("provider accounting: %+v", prov)
	}
	found := false
	for _, r := range auditor.records {
		if strings.Contains(r, "agent.run") {
			found = true
		}
	}
	if !found {
		t.Fatalf("agent.run must be audited: %v", auditor.records)
	}
	if len(publisher.events) != 1 || publisher.events[0] != "AgentRun.Completed" {
		t.Fatalf("events: %v", publisher.events)
	}
}

func TestRunAgentChecks(t *testing.T) {
	s, _, _, _, _, _, _, _, _ := testService(t)
	ec := caller().Context(kernel.EntryAPI, "trace-1")
	if _, err := s.RunAgent(context.Background(), caller(), ec, "agent-nope", "hi"); err == nil {
		t.Fatal("unknown agent must 404")
	}
	svc := s
	svc.agents.(*memCollection[AgentDoc]).Put(context.Background(), &AgentDoc{ID: "agent-off", Name: "Off", Status: "disabled"})
	if _, err := s.RunAgent(context.Background(), caller(), ec, "agent-off", "hi"); err == nil {
		t.Fatal("disabled agent must 409")
	}
	// acts-as-caller agent without a caller
	if _, err := s.RunAgent(context.Background(), nil, ec, "agent-sidekick", "hi"); err == nil {
		t.Fatal("acts-as-caller without a caller must 409")
	}
}

func TestRunSidekick(t *testing.T) {
	s, _, auditor, _, _, runner, _, _, _ := testService(t)
	ec := caller().Context(kernel.EntryAPI, "trace-9")
	run, err := s.RunSidekick(context.Background(), caller(), ec, "low stock?", "app-inventory")
	if err != nil {
		t.Fatal(err)
	}
	if run.ApplicationId == nil || *run.ApplicationId != "app-inventory" {
		t.Fatalf("app scope recorded: %+v", run)
	}
	// sidekick tools are confined to the app's tools
	if len(runner.reqs[0].Tools) != 1 || runner.reqs[0].Tools[0].Name != "get_low_stock_items" {
		t.Fatalf("app-scoped tools: %+v", runner.reqs[0].Tools)
	}
	// grant carries only permissions both hold
	grant, err := s.verifier.Verify(runner.reqs[0].Grant)
	if err != nil {
		t.Fatal(err)
	}
	if len(grant.Permissions) != 2 || grant.ApplicationID != "app-inventory" || grant.Budget != 3 {
		t.Fatalf("grant: %+v", grant)
	}

	// no role -> 403 + denied audit
	roleless := &kernel.Caller{UserID: "u-x", Name: "X", Permissions: kernel.NewPermissions()}
	if _, err := s.RunSidekick(context.Background(), roleless, ec, "hi", ""); err == nil {
		t.Fatal("roleless caller must 403")
	}
	found := false
	for _, r := range auditor.records {
		if strings.Contains(r, "sidekick.run") && strings.Contains(r, "denied") {
			found = true
		}
	}
	if !found {
		t.Fatalf("denied sidekick.run must be audited: %v", auditor.records)
	}
	// unknown app -> 404
	if _, err := s.RunSidekick(context.Background(), caller(), ec, "hi", "app-nope"); err == nil {
		t.Fatal("unknown app must 404")
	}
}

func TestInvokeWithGrant(t *testing.T) {
	s, engine, auditor, _, c, _, _, _, _ := testService(t)
	grant := Grant{
		RunID: "run-1", TraceID: "trace-1", AgentID: "agent-proc", AgentName: "Procurement Assistant",
		Permissions: []string{"inventory.read"}, Tools: []string{"get_low_stock_items"}, Budget: 2,
		ExpiresAt: time.Now().UTC().Add(time.Minute),
	}
	token, _ := s.signer.Sign(grant)

	out := s.InvokeWithGrant(context.Background(), token, "get_low_stock_items", map[string]any{"limit": 5})
	if out.Outcome != "allowed" {
		t.Fatalf("allowed expected: %+v", out)
	}
	if len(engine.calls) != 1 || engine.calls[0] != "inventory.lowStock" {
		t.Fatalf("engine calls: %v", engine.calls)
	}

	// tool not granted
	out = s.InvokeWithGrant(context.Background(), token, "approve_purchase_request", nil)
	if out.Outcome != "denied" || !strings.Contains(out.Reason, "not granted") {
		t.Fatalf("denied expected: %+v", out)
	}
	// budget exhausted after 2 calls
	_ = s.InvokeWithGrant(context.Background(), token, "get_low_stock_items", nil)
	out = s.InvokeWithGrant(context.Background(), token, "get_low_stock_items", nil)
	if out.Outcome != "denied" || !strings.Contains(out.Reason, "budget") {
		t.Fatalf("budget denial: %+v (cache n=%d)", out, c.n)
	}
	// engine 403 -> denied with the message
	s.engine.(*fakeEngine).failWith = kernel.Forbidden("lacks inventory.read")
	g2 := Grant{
		RunID: "run-2", TraceID: "t", AgentID: "a", Tools: []string{"get_low_stock_items"}, Budget: 5,
		ExpiresAt: time.Now().UTC().Add(time.Minute),
	}
	tok2, _ := s.signer.Sign(g2)
	out = s.InvokeWithGrant(context.Background(), tok2, "get_low_stock_items", nil)
	if out.Outcome != "denied" || !strings.Contains(out.Reason, "lacks") {
		t.Fatalf("engine 403 -> denied: %+v", out)
	}
	s.engine.(*fakeEngine).failWith = nil
	// malformed and expired tokens
	if out := s.InvokeWithGrant(context.Background(), "garbage", "get_low_stock_items", nil); out.Outcome != "denied" {
		t.Fatalf("malformed grant: %+v", out)
	}
	expired, _ := s.signer.Sign(Grant{RunID: "r", Tools: []string{"x"}, ExpiresAt: time.Now().UTC().Add(-time.Minute)})
	if out := s.InvokeWithGrant(context.Background(), expired, "x", nil); out.Outcome != "denied" || !strings.Contains(out.Reason, "expired") {
		t.Fatalf("expired grant: %+v", out)
	}
	// app scope: tool outside the app is denied with the app name
	scoped, _ := s.signer.Sign(Grant{
		RunID: "run-3", TraceID: "t", AgentID: "a", Tools: []string{"approve_purchase_request"},
		ApplicationID: "app-inventory", Budget: 5, ExpiresAt: time.Now().UTC().Add(time.Minute),
	})
	out = s.InvokeWithGrant(context.Background(), scoped, "approve_purchase_request", nil)
	if out.Outcome != "denied" || !strings.Contains(out.Reason, "outside Inventory Management") {
		t.Fatalf("app scope denial: %+v", out)
	}
	// unknown tool (granted but no longer exposed) -> error
	g3 := Grant{RunID: "run-4", TraceID: "t", AgentID: "a", Tools: []string{"nope"}, Budget: 5, ExpiresAt: time.Now().UTC().Add(time.Minute)}
	tok3, _ := s.signer.Sign(g3)
	out = s.InvokeWithGrant(context.Background(), tok3, "nope", nil)
	if out.Outcome != "error" || !strings.Contains(out.Reason, "no longer exposed") {
		t.Fatalf("unknown tool: %+v", out)
	}
	_ = auditor
}

func TestUpdateAgentValidation(t *testing.T) {
	s, _, auditor, _, _, _, agents, _, _ := testService(t)
	ec := caller().Context(kernel.EntryControl, "trace-1")
	bad := []string{"not-a-tool"}
	if _, err := s.UpdateAgent(context.Background(), ec, "agent-proc", oapi.UpdateAgentJSONRequestBody{Tools: &bad}); err == nil {
		t.Fatal("unknown tool must be rejected")
	}
	good := []string{"get_low_stock_items"}
	status := oapi.UpdateAgentJSONBodyStatus("disabled")
	agent, err := s.UpdateAgent(context.Background(), ec, "agent-proc", oapi.UpdateAgentJSONRequestBody{Tools: &good, Status: &status})
	if err != nil {
		t.Fatal(err)
	}
	if agent.Version != 1 || agent.Status != "disabled" || len(agent.Tools) != 1 {
		t.Fatalf("updated agent: %+v", agent)
	}
	doc, _ := agents.Get(context.Background(), "agent-proc")
	if doc.Status != "disabled" {
		t.Fatal("update must persist")
	}
	// ai.manage is required
	noPerm := kernel.ExecutionContext{Actor: kernel.Actor{Kind: kernel.ActorUser, ID: "u", Name: "n"}, Permissions: kernel.NewPermissions()}
	if _, err := s.UpdateAgent(context.Background(), noPerm, "agent-proc", oapi.UpdateAgentJSONRequestBody{}); err == nil {
		t.Fatal("ai.manage must be required")
	}
	found := false
	for _, r := range auditor.records {
		if strings.Contains(r, "denied") {
			found = true
		}
	}
	if !found {
		t.Fatal("denial must be audited")
	}
}

func TestRunsListAndGet(t *testing.T) {
	s, _, _, _, _, _, _, runs, _ := testService(t)
	ctx := context.Background()
	runs.Put(ctx, &RunDoc{ID: "run-1", AgentID: "agent-proc", Status: "completed", Trigger: "manual", TraceID: "t1", StartedAt: time.Now().Add(-time.Hour)})
	runs.Put(ctx, &RunDoc{ID: "run-2", AgentID: "agent-proc", Status: "failed", Trigger: "workflow", TraceID: "t2", StartedAt: time.Now()})
	all, total, err := s.Runs(ctx, "", "", "", 50, 0)
	if err != nil || len(all) != 2 || total != 2 || all[0].Id != "run-2" {
		t.Fatalf("newest first: %v total=%d %v", all, total, err)
	}
	one, _, err := s.Runs(ctx, "", "agent-proc", "", 50, 0)
	if err != nil || len(one) != 2 {
		t.Fatalf("filter: %v %v", one, err)
	}
	run, err := s.Run(ctx, "", "run-1")
	if err != nil || run.Id != "run-1" {
		t.Fatalf("get: %v %v", run, err)
	}
	if _, err := s.Run(ctx, "", "run-nope"); err == nil {
		t.Fatal("missing run must error")
	}

	// owners see only their own runs
	runs.Put(ctx, &RunDoc{ID: "run-3", AgentID: "agent-proc", UserID: "u-amaya", Status: "completed", TraceID: "t3", StartedAt: time.Now()})
	mine, total, err := s.Runs(ctx, "u-amaya", "agent-proc", "", 50, 0)
	if err != nil || total != 1 || mine[0].Id != "run-3" {
		t.Fatalf("owner filter: %v total=%d %v", mine, total, err)
	}
	if _, err := s.Run(ctx, "u-amaya", "run-1"); err == nil {
		t.Fatal("someone else's run must be not found")
	}
	if _, err := s.Run(ctx, "u-amaya", "run-3"); err != nil {
		t.Fatalf("own run: %v", err)
	}
}

func TestRunAgentNeedsAgentPermissionsOrManage(t *testing.T) {
	s, _, auditor, _, _, _, _, _, _ := testService(t)
	ctx := context.Background()
	clerk := &kernel.Caller{UserID: "u-clerk", Name: "Clerk", Roles: []string{"store"}, Permissions: kernel.NewPermissions("supplier.read")}
	if _, err := s.RunAgent(ctx, clerk, clerk.Context(kernel.EntryAPI, "t"), "agent-proc", "hi"); err == nil {
		t.Fatal("a caller without inventory.read must not run an inventory.read agent")
	}
	if !slices.ContainsFunc(auditor.records, func(r string) bool { return strings.Contains(r, "agent.run") && strings.Contains(r, "denied") }) {
		t.Fatalf("denied run must be audited: %v", auditor.records)
	}
	holder := &kernel.Caller{UserID: "u-store", Name: "Store", Roles: []string{"store"}, Permissions: kernel.NewPermissions("inventory.read")}
	if _, err := s.RunAgent(ctx, holder, holder.Context(kernel.EntryAPI, "t"), "agent-proc", "hi"); err != nil {
		t.Fatalf("a caller holding every agent permission may run it: %v", err)
	}
	manager := &kernel.Caller{UserID: "u-dev", Name: "Dev", Roles: []string{"dev"}, Permissions: kernel.NewPermissions("ai.manage")}
	if _, err := s.RunAgent(ctx, manager, manager.Context(kernel.EntryAPI, "t"), "agent-proc", "hi"); err != nil {
		t.Fatalf("an AI manager may run any agent: %v", err)
	}
}

func TestUpdateAgentCannotGrantUnheldPermissions(t *testing.T) {
	s, _, _, _, _, _, agents, _, _ := testService(t)
	ctx := context.Background()
	dev := &kernel.Caller{UserID: "u-dev", Name: "Dev", Permissions: kernel.NewPermissions("ai.manage", "inventory.read")}
	perms := []oapi.Permission{"inventory.read", "procurement.approve"}
	if _, err := s.UpdateAgent(ctx, dev.Context(kernel.EntryControl, "t"), "agent-proc", oapi.UpdateAgentJSONRequestBody{Permissions: &perms}); err == nil {
		t.Fatal("granting procurement.approve without holding it must fail")
	}
	if a, _ := agents.Get(ctx, "agent-proc"); slices.Contains(a.Permissions, "procurement.approve") {
		t.Fatal("a refused update must not change the agent")
	}
	ok := []oapi.Permission{"inventory.read"}
	if _, err := s.UpdateAgent(ctx, dev.Context(kernel.EntryControl, "t"), "agent-proc", oapi.UpdateAgentJSONRequestBody{Permissions: &ok}); err != nil {
		t.Fatalf("held permissions may be granted: %v", err)
	}
}

func TestRunSidekickAppScopeNeedsAppAccess(t *testing.T) {
	s, _, _, _, _, _, _, _, _ := testService(t)
	ctx := context.Background()
	outsider := &kernel.Caller{UserID: "u-hr", Name: "HR", Roles: []string{"hr"}, Permissions: kernel.NewPermissions("hr.read")}
	if _, err := s.RunSidekick(ctx, outsider, outsider.Context(kernel.EntryAPI, "t"), "hi", "app-inventory"); err == nil {
		t.Fatal("a caller who can use none of the app's tools must not scope Sidekick to it")
	}
	if _, err := s.RunSidekick(ctx, outsider, outsider.Context(kernel.EntryAPI, "t"), "hi", ""); err != nil {
		t.Fatalf("unscoped Sidekick still works: %v", err)
	}
}

func TestAppendStep(t *testing.T) {
	s, _, _, publisher, _, _, _, runs, _ := testService(t)
	ctx := context.Background()
	runs.Put(ctx, &RunDoc{ID: "run-1", AgentID: "agent-proc", TraceID: "t1", StartedAt: time.Now()})
	step := json.RawMessage(`{"kind":"tool","call":{"tool":"get_low_stock_items"}}`)
	if err := s.AppendStep(ctx, "run-1", step); err != nil {
		t.Fatal(err)
	}
	doc, _ := runs.Get(ctx, "run-1")
	var steps []json.RawMessage
	if err := json.Unmarshal(doc.Steps, &steps); err != nil || len(steps) != 1 {
		t.Fatalf("steps: %s %v", doc.Steps, err)
	}
	if len(publisher.events) != 1 || publisher.events[0] != "AgentRun.Step" {
		t.Fatalf("events: %v", publisher.events)
	}
	if err := s.AppendStep(ctx, "run-nope", step); err == nil {
		t.Fatal("unknown run must error")
	}
}

func TestGrantExecutionContext(t *testing.T) {
	g := Grant{RunID: "r", TraceID: "t", AgentID: "a", AgentName: "A", OnBehalfOf: "u", Permissions: []string{"p1"}}
	ec := g.ExecutionContext()
	if ec.Actor.Kind != kernel.ActorAgent || ec.TraceID != "t" || ec.EntryPoint != kernel.EntryMCP || !ec.Permissions.Has("p1") {
		t.Fatalf("ec: %+v", ec)
	}
}

func TestPricePerMTok(t *testing.T) {
	if pricePerMTok("mistral-large-latest") != 8 || pricePerMTok("mistral-small-latest") != 0.25 || pricePerMTok("mistral-medium-latest") != 2 {
		t.Fatal("price map")
	}
}
