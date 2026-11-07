package obs

import (
	"context"
	"net/http"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

// AuditReadPermission guards the audit and trace endpoints.
const AuditReadPermission = "audit.read"

// Handler serves the observability endpoints (GET /events, /audit, /traces, /health).
type Handler struct {
	svc     Service
	auditor kernel.Auditor
}

func NewHandler(svc Service, auditor kernel.Auditor) *Handler {
	return &Handler{svc: svc, auditor: auditor}
}

func (h *Handler) ListEvents(w http.ResponseWriter, r *http.Request, params oapi.ListEventsParams) {
	limit := 50
	if params.Limit != nil {
		limit = *params.Limit
	}
	httpx.ListFrom(w, r, func(ctx context.Context) ([]oapi.PlatformEvent, error) { return h.svc.Events(ctx, limit) })
}

func (h *Handler) ListAudit(w http.ResponseWriter, r *http.Request, params oapi.ListAuditParams) {
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, "")
	if err := kernel.RequirePermission(r.Context(), h.auditor, ec, AuditReadPermission, "audit.list", "audit"); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.ListFrom(w, r, func(ctx context.Context) ([]oapi.AuditRecord, error) { return h.svc.Audit(ctx, params) })
}

func (h *Handler) ListTraces(w http.ResponseWriter, r *http.Request) {
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, "")
	if err := kernel.RequirePermission(r.Context(), h.auditor, ec, AuditReadPermission, "trace.list", "trace"); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.ListFrom(w, r, h.svc.Traces)
}

func (h *Handler) GetTrace(w http.ResponseWriter, r *http.Request, traceId string) {
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, "")
	if err := kernel.RequirePermission(r.Context(), h.auditor, ec, AuditReadPermission, "trace.get", "trace/"+traceId); err != nil {
		httpx.Error(w, r, err)
		return
	}
	trace, err := h.svc.Trace(r.Context(), traceId)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, trace)
}

func (h *Handler) ListHealth(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Health)
}
