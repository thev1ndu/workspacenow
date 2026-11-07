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

func (h *Handler) GetOverview(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.Overview(r.Context())
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, stats)
}

func (h *Handler) ListResources(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Resources)
}

func (h *Handler) Search(w http.ResponseWriter, r *http.Request, params oapi.SearchParams) {
	limit := 30
	if params.Limit != nil {
		limit = *params.Limit
	}
	q := params.Q
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, "")
	httpx.ListFrom(w, r, func(ctx context.Context) ([]oapi.SearchHit, error) { return h.svc.Search(ctx, ec, q, limit) })
}

func (h *Handler) GetActivity(w http.ResponseWriter, r *http.Request, params oapi.GetActivityParams) {
	days := 14
	if params.Days != nil {
		days = *params.Days
	}
	httpx.ListFrom(w, r, func(ctx context.Context) ([]oapi.ActivityPoint, error) { return h.svc.Activity(ctx, days) })
}

func (h *Handler) GetTokenUsage(w http.ResponseWriter, r *http.Request, params oapi.GetTokenUsageParams) {
	days := 14
	if params.Days != nil {
		days = *params.Days
	}
	httpx.ListFrom(w, r, func(ctx context.Context) ([]oapi.TokenUsagePoint, error) { return h.svc.TokenUsage(ctx, days) })
}

func (h *Handler) GetEntryPointBreakdown(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.EntryPoints)
}
