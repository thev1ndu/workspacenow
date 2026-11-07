package ai

import (
	"net/http"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

// Handler serves the public AI endpoints: model providers, agents, runs, Sidekick.
type Handler struct {
	svc     Service
	auditor kernel.Auditor
}

func NewHandler(svc Service, auditor kernel.Auditor) *Handler {
	return &Handler{svc: svc, auditor: auditor}
}

func (h *Handler) ListModelProviders(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Providers)
}

func (h *Handler) ListAgents(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Agents)
}

func (h *Handler) GetAgent(w http.ResponseWriter, r *http.Request, agentId oapi.AgentId) {
	agent, err := h.svc.Agent(r.Context(), string(agentId))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, agent)
}

func (h *Handler) UpdateAgent(w http.ResponseWriter, r *http.Request, agentId oapi.AgentId) {
	var body oapi.UpdateAgentJSONRequestBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, "")
	agent, err := h.svc.UpdateAgent(r.Context(), ec, string(agentId), body)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, agent)
}

func (h *Handler) ListAgentRuns(w http.ResponseWriter, r *http.Request, params oapi.ListAgentRunsParams) {
	agentID, q := "", ""
	limit, offset := 50, 0
	if params.AgentId != nil {
		agentID = *params.AgentId
	}
	if params.Q != nil {
		q = *params.Q
	}
	if params.Limit != nil {
		limit = *params.Limit
	}
	if params.Offset != nil {
		offset = *params.Offset
	}
	runs, total, err := h.svc.Runs(r.Context(), agentID, q, limit, offset)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.ListTotal(w, runs, total)
}

func (h *Handler) GetAgentRun(w http.ResponseWriter, r *http.Request, runId string) {
	run, err := h.svc.Run(r.Context(), runId)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, run)
}

func (h *Handler) RunAgent(w http.ResponseWriter, r *http.Request, agentId oapi.AgentId) {
	var body oapi.RunAgentJSONRequestBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	caller := httpx.Caller(r)
	ec := caller.ContextFrom(r.Context(), kernel.EntryAPI, "")
	run, err := h.svc.RunAgent(r.Context(), caller, ec, string(agentId), body.Prompt)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, run)
}

func (h *Handler) RunSidekick(w http.ResponseWriter, r *http.Request) {
	var body oapi.RunSidekickJSONRequestBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	caller := httpx.Caller(r)
	ec := caller.ContextFrom(r.Context(), kernel.EntryAPI, "")
	appID := ""
	if body.ApplicationId != nil {
		appID = *body.ApplicationId
	}
	run, err := h.svc.RunSidekick(r.Context(), caller, ec, body.Prompt, appID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, run)
}
