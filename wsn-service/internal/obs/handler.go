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
	limit, offset := 50, 0
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
	events, total, err := h.svc.Events(r.Context(), applicationID, limit, offset)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.ListTotal(w, events, total)
}

func (h *Handler) ListAudit(w http.ResponseWriter, r *http.Request, params oapi.ListAuditParams) {
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, "")
	if err := kernel.RequirePermission(r.Context(), h.auditor, ec, AuditReadPermission, "audit.list", "audit"); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.ListFrom(w, r, func(ctx context.Context) ([]oapi.AuditRecord, error) { return h.svc.Audit(ctx, params) })
}

func (h *Handler) ListTraces(w http.ResponseWriter, r *http.Request, params oapi.ListTracesParams) {
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, "")
	if err := kernel.RequirePermission(r.Context(), h.auditor, ec, AuditReadPermission, "trace.list", "trace"); err != nil {
		httpx.Error(w, r, err)
		return
	}
	q := ""
	limit, offset := 50, 0
	if params.Q != nil {
		q = *params.Q
	}
	if params.Limit != nil {
		limit = *params.Limit
	}
	if params.Offset != nil {
		offset = *params.Offset
	}
	traces, total, err := h.svc.Traces(r.Context(), q, limit, offset)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.ListTotal(w, traces, total)
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

/* ---- alerts, SLOs, status, backups ---- */

func (h *Handler) ec(r *http.Request) kernel.ExecutionContext {
	return httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, "")
}

func (h *Handler) ListAlertRules(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.AlertRules)
}

func (h *Handler) CreateAlertRule(w http.ResponseWriter, r *http.Request) {
	var rule AlertRule
	if err := httpx.Decode(r, &rule); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.CreateAlertRule(r.Context(), h.ec(r), rule)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, out)
}

func (h *Handler) UpdateAlertRule(w http.ResponseWriter, r *http.Request, id string) {
	var rule AlertRule
	if err := httpx.Decode(r, &rule); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.UpdateAlertRule(r.Context(), h.ec(r), id, rule)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) DeleteAlertRule(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.svc.DeleteAlertRule(r.Context(), h.ec(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, map[string]any{"id": id, "deleted": true})
}

func (h *Handler) ListAlertFires(w http.ResponseWriter, r *http.Request, ruleId string) {
	out, err := h.svc.AlertFires(r.Context(), ruleId)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, out)
}

func (h *Handler) AckAlertFire(w http.ResponseWriter, r *http.Request, ruleId, fireId string) {
	out, err := h.svc.AckFire(r.Context(), h.ec(r), ruleId, fireId)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) ListSLOs(w http.ResponseWriter, r *http.Request, params oapi.ListSLOsParams) {
	applicationID := ""
	if params.ApplicationId != nil {
		applicationID = *params.ApplicationId
	}
	httpx.ListFrom(w, r, func(ctx context.Context) ([]SLO, error) { return h.svc.SLOs(ctx, applicationID) })
}

func (h *Handler) CreateSLO(w http.ResponseWriter, r *http.Request) {
	var slo SLO
	if err := httpx.Decode(r, &slo); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.CreateSLO(r.Context(), h.ec(r), slo)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, out)
}

func (h *Handler) GetSLOStatus(w http.ResponseWriter, r *http.Request, id string) {
	out, err := h.svc.SLOStatusByID(r.Context(), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, out)
}

// StatusPage is the public status endpoint (no auth).
func (h *Handler) StatusPage(w http.ResponseWriter, r *http.Request) {
	httpx.OK(w, h.svc.Status(r.Context()))
}

func (h *Handler) ListBackups(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Backups)
}
