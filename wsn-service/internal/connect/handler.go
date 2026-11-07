package connect

import (
	"net/http"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

type Handler struct{ svc Service }

func NewHandler(svc Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) ListApis(w http.ResponseWriter, r *http.Request) { httpx.ListFrom(w, r, h.svc.APIs) }
func (h *Handler) ListMcpTools(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Tools)
}
func (h *Handler) ListMcpServers(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Servers)
}
func (h *Handler) ListIntegrations(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Integrations)
}

func (h *Handler) GetApi(w http.ResponseWriter, r *http.Request, id string) {
	a, err := h.svc.API(r.Context(), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, a)
}

func (h *Handler) ListApiOperations(w http.ResponseWriter, r *http.Request, params oapi.ListApiOperationsParams) {
	apiID := ""
	if params.ApiId != nil {
		apiID = *params.ApiId
	}
	ops, err := h.svc.Operations(r.Context(), apiID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, ops)
}

func (h *Handler) UpdateMcpExposure(w http.ResponseWriter, r *http.Request, id string) {
	var body struct {
		Enabled     bool   `json:"enabled"`
		ToolName    string `json:"toolName"`
		Description string `json:"description"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	op, err := h.svc.UpdateExposure(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, ""), id, body.Enabled, body.ToolName, body.Description)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, op)
}

func (h *Handler) InvokeApiOperation(w http.ResponseWriter, r *http.Request, id string) {
	var body struct {
		Input map[string]any `json:"input"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, "")
	out, err := h.svc.InvokeOperation(r.Context(), ec, id, body.Input)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, map[string]any{"traceId": ec.TraceID, "output": out})
}

func (h *Handler) RegisterMcpServer(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
		URL  string `json:"url"`
		Auth string `json:"auth"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	srv, err := h.svc.RegisterServer(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, ""), body.Name, body.URL, body.Auth)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, srv)
}

func (h *Handler) TestIntegration(w http.ResponseWriter, r *http.Request, id string) {
	in, err := h.svc.TestIntegration(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, ""), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, in)
}
