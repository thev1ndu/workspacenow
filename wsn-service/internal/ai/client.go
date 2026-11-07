package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/connect"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/flow"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/studio"
)

// Wire shapes for wsn-ai-service's /v1 API (camelCase on the wire).
type agentSpec struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	Model              string `json:"model"`
	Instructions       string `json:"instructions,omitempty"`
	MaxToolCallsPerRun int    `json:"maxToolCallsPerRun"`
}

type toolSpec struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	InputSchema map[string]any `json:"inputSchema"`
}

type runRequest struct {
	RunID           string         `json:"runId"`
	Agent           agentSpec      `json:"agent"`
	Prompt          string         `json:"prompt"`
	Context         map[string]any `json:"context,omitempty"`
	Grant           string         `json:"grant"`
	Tools           []toolSpec     `json:"tools"`
	ApplicationName string         `json:"applicationName,omitempty"`
}

type runResult struct {
	Status     string            `json:"status"`
	Steps      []json.RawMessage `json:"steps"`
	Answer     string            `json:"answer"`
	Tokens     int               `json:"tokens"`
	DurationMs int               `json:"durationMs"`
}

// Client is the HTTP client for wsn-ai-service; it implements studio.Planner and connect.Discoverer.
type Client struct {
	baseURL string
	token   string
	hc      *http.Client
}

// NewClient builds the client; calls carry the shared service token.
func NewClient(baseURL, token string) *Client {
	return &Client{baseURL: baseURL, token: token, hc: &http.Client{Timeout: 120 * time.Second}}
}

func (c *Client) post(ctx context.Context, path string, body any, out any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("encode request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return fmt.Errorf("call wsn-ai-service: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read wsn-ai-service response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		var e struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(raw, &e)
		return fmt.Errorf("wsn-ai-service answered %d: %s", resp.StatusCode, e.Message)
	}
	if out != nil {
		if err := json.Unmarshal(raw, out); err != nil {
			return fmt.Errorf("decode wsn-ai-service response: %w", err)
		}
	}
	return nil
}

// Plan implements studio.Planner via POST /v1/plans (the Application Architect).
func (c *Client) Plan(ctx context.Context, req studio.PlanRequest) (*studio.Plan, error) {
	var plan studio.Plan
	if err := c.post(ctx, "/v1/plans", req, &plan); err != nil {
		return nil, err
	}
	return &plan, nil
}

// Discover implements connect.Discoverer via POST /v1/mcp/discover.
func (c *Client) Discover(ctx context.Context, serverURL, auth string) ([]connect.ServerTool, error) {
	var out struct {
		Tools []connect.ServerTool `json:"tools"`
	}
	body := map[string]any{"url": serverURL, "auth": auth}
	if err := c.post(ctx, "/v1/mcp/discover", body, &out); err != nil {
		return nil, err
	}
	return out.Tools, nil
}

// Run executes one agent run via POST /v1/runs.
func (c *Client) Run(ctx context.Context, req runRequest) (*runResult, error) {
	var out runResult
	if err := c.post(ctx, "/v1/runs", req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// Runner implements flow.AgentRunner: workflow agent steps are agent runs under the workflow identity.
type Runner struct {
	client *Client
	signer *Signer
	agents collection[AgentDoc]
}

// NewRunner builds the flow.AgentRunner on top of the ai-service client.
func NewRunner(client *Client, signer *Signer, agents collection[AgentDoc]) *Runner {
	return &Runner{client: client, signer: signer, agents: agents}
}

// RunForWorkflow runs the step's agent with a grant for the workflow's service identity.
func (r *Runner) RunForWorkflow(ctx context.Context, req flow.AgentStepRequest) (*flow.AgentStepResult, error) {
	agent, err := r.agents.Get(ctx, req.AgentID)
	if err != nil {
		return nil, fmt.Errorf("load agent %s: %w", req.AgentID, err)
	}
	runID := newRunID()
	grant := Grant{
		RunID: runID, TraceID: req.TraceID, AgentID: agent.ID, AgentName: agent.Name,
		Permissions: agent.Permissions, Tools: agent.Tools, Budget: agent.MaxToolCallsPerRun,
		ExpiresAt: time.Now().UTC().Add(5 * time.Minute),
	}
	token, err := r.signer.Sign(grant)
	if err != nil {
		return nil, err
	}
	res, err := r.client.Run(ctx, runRequest{
		RunID: runID,
		Agent: agentSpec{
			ID: agent.ID, Name: agent.Name, Model: agent.Model,
			Instructions: agent.Instructions, MaxToolCallsPerRun: agent.MaxToolCallsPerRun,
		},
		Prompt:  req.Prompt,
		Context: req.Context,
		Grant:   token,
	})
	if err != nil {
		return nil, err
	}
	return &flow.AgentStepResult{RunID: runID, Failed: res.Status == "failed", Answer: res.Answer}, nil
}

func newRunID() string { return kernel.NewID("run") }
