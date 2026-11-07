package flow

import (
	"encoding/json"
	"net/http"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

type Handler struct{ svc Service }

func NewHandler(svc Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) ListWorkflows(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Workflows)
}

func (h *Handler) GetWorkflow(w http.ResponseWriter, r *http.Request, id string) {
	reply(w, r, http.StatusOK)(h.svc.Workflow(r.Context(), id))
}

func (h *Handler) CreateWorkflow(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Definition Definition `json:"definition"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	reply(w, r, http.StatusCreated)(h.svc.Save(r.Context(), controlContext(r), "", body.Definition))
}

func (h *Handler) UpdateWorkflow(w http.ResponseWriter, r *http.Request, id string) {
	var body struct {
		Definition json.RawMessage `json:"definition"`
		Status     string          `json:"status"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if len(body.Definition) > 0 && string(body.Definition) != "null" {
		var def Definition
		if err := json.Unmarshal(body.Definition, &def); err != nil {
			httpx.Error(w, r, kernel.Invalid("The workflow definition is not valid"))
			return
		}
		reply(w, r, http.StatusOK)(h.svc.Save(r.Context(), controlContext(r), id, def))
		return
	}
	reply(w, r, http.StatusOK)(h.svc.SetStatus(r.Context(), controlContext(r), id, body.Status))
}

func (h *Handler) StartWorkflow(w http.ResponseWriter, r *http.Request, id string) {
	var body struct {
		Input map[string]any `json:"input"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	reply(w, r, http.StatusCreated)(h.svc.Start(r.Context(), httpx.Caller(r), id, body.Input))
}

func (h *Handler) ListExecutions(w http.ResponseWriter, r *http.Request, params oapi.ListExecutionsParams) {
	workflowID := ""
	if params.WorkflowId != nil {
		workflowID = *params.WorkflowId
	}
	out, err := h.svc.Executions(r.Context(), workflowID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, out)
}

func (h *Handler) GetExecution(w http.ResponseWriter, r *http.Request, id string) {
	reply(w, r, http.StatusOK)(h.svc.Execution(r.Context(), id))
}

func (h *Handler) ListApprovals(w http.ResponseWriter, r *http.Request, params oapi.ListApprovalsParams) {
	status := ""
	limit, offset := 50, 0
	if params.Status != nil {
		status = string(*params.Status)
	}
	if params.Limit != nil {
		limit = *params.Limit
	}
	if params.Offset != nil {
		offset = *params.Offset
	}
	applicationID := ""
	if params.ApplicationId != nil {
		applicationID = *params.ApplicationId
	}
	out, total, err := h.svc.Approvals(r.Context(), status, applicationID, limit, offset)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.ListTotal(w, out, total)
}

func (h *Handler) DecideApproval(w http.ResponseWriter, r *http.Request, id string) {
	var body struct {
		Decision string `json:"decision"`
		Comment  string `json:"comment"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if body.Decision != "approved" && body.Decision != "rejected" {
		httpx.Error(w, r, kernel.Invalid("decision must be approved or rejected"))
		return
	}
	reply(w, r, http.StatusCreated)(h.svc.Decide(r.Context(), httpx.Caller(r), id, body.Decision == "approved", body.Comment))
}

func controlContext(r *http.Request) kernel.ExecutionContext {
	return httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, "")
}

func reply(w http.ResponseWriter, r *http.Request, status int) func(any, error) {
	return func(v any, err error) {
		if err != nil {
			httpx.Error(w, r, err)
			return
		}
		httpx.JSON(w, status, v)
	}
}
