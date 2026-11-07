package ai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/flow"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/studio"
)

func TestClientPlanDiscoverRun(t *testing.T) {
	mux := http.NewServeMux()
	var sawAuth string
	mux.HandleFunc("POST /v1/plans", func(w http.ResponseWriter, r *http.Request) {
		sawAuth = r.Header.Get("Authorization")
		var body studio.PlanRequest
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body.Prompt != "a leave tracker" {
			w.WriteHeader(422)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"prompt": body.Prompt, "name": "Leave Tracker", "description": "d", "ownerDepartmentId": "dep-hr", "entities": []any{}, "pages": []any{}})
	})
	mux.HandleFunc("POST /v1/mcp/discover", func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body["url"] != "https://mcp.example.com" {
			w.WriteHeader(502)
			json.NewEncoder(w).Encode(map[string]any{"message": "unreachable"})
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"tools": []any{map[string]any{"name": "search", "description": "Search things"}}})
	})
	mux.HandleFunc("POST /v1/runs", func(w http.ResponseWriter, r *http.Request) {
		var body runRequest
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body.Grant == "" || body.Agent.ID == "" {
			w.WriteHeader(422)
			return
		}
		json.NewEncoder(w).Encode(runResult{
			Status: "completed", Answer: "42 items", Tokens: 321, DurationMs: 12,
			Steps: []json.RawMessage{json.RawMessage(`{"kind":"thought","text":"thinking"}`)},
		})
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	c := NewClient(srv.URL, "service-token")
	ctx := context.Background()

	plan, err := c.Plan(ctx, studio.PlanRequest{Prompt: "a leave tracker"})
	if err != nil || plan.Name != "Leave Tracker" {
		t.Fatalf("plan: %v %v (auth %q)", plan, err, sawAuth)
	}
	if sawAuth != "Bearer service-token" {
		t.Fatalf("service token header: %q", sawAuth)
	}
	if _, err := c.Plan(ctx, studio.PlanRequest{Prompt: "x"}); err == nil || !strings.Contains(err.Error(), "422") {
		t.Fatalf("plan error: %v", err)
	}
	tools, err := c.Discover(ctx, "https://mcp.example.com", "none")
	if err != nil || len(tools) != 1 || tools[0].Name != "search" {
		t.Fatalf("discover: %v %v", tools, err)
	}
	if _, err := c.Discover(ctx, "https://bad.example.com", "none"); err == nil {
		t.Fatal("discover must surface the 502")
	}
	res, err := c.Run(ctx, runRequest{RunID: "run-1", Agent: agentSpec{ID: "agent-sidekick", Name: "Sidekick", Model: "m"}, Prompt: "hi", Grant: "g"})
	if err != nil || res.Answer != "42 items" || res.Tokens != 321 || len(res.Steps) != 1 {
		t.Fatalf("run: %v %v", res, err)
	}
}

func TestRunnerRunForWorkflow(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/runs", func(w http.ResponseWriter, r *http.Request) {
		var body runRequest
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body.Context["sku"] != "oil" {
			w.WriteHeader(500)
			return
		}
		json.NewEncoder(w).Encode(runResult{Status: "failed", Answer: "cannot approve"})
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	agents := newMemCollection(func(a *AgentDoc) string { return a.ID })
	_ = agents.Put(context.Background(), &AgentDoc{ID: "agent-proc", Name: "Procurement", Model: "mistral-medium-latest", MaxToolCallsPerRun: 2, Tools: []string{"get_low_stock_items"}, Permissions: []string{"inventory.read"}, Status: "active"})
	r := NewRunner(NewClient(srv.URL, "tok"), GenerateSigner(), agents)
	res, err := r.RunForWorkflow(context.Background(), flow.AgentStepRequest{
		AgentID: "agent-proc", Prompt: "prepare a purchase request", Context: map[string]any{"sku": "oil"}, TraceID: "trace-wf", WorkflowID: "wf-1", WorkflowName: "Low stock",
	})
	if err != nil || res.RunID == "" || !res.Failed || res.Answer != "cannot approve" {
		t.Fatalf("runner: %+v %v", res, err)
	}
	if _, err := r.RunForWorkflow(context.Background(), flow.AgentStepRequest{AgentID: "agent-nope"}); err == nil {
		t.Fatal("unknown agent must error")
	}
}
