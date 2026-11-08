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

func (h *Handler) InvokeApiOperation(w http.ResponseWriter, r *http.Request, id oapi.OperationId, params oapi.InvokeApiOperationParams) {
	var body struct {
		Input map[string]any `json:"input"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, "")
	version := ""
	if params.Version != nil {
		version = *params.Version
	}
	if v := r.Header.Get("X-API-Version"); v != "" {
		version = v
	}
	out, headers, err := h.svc.InvokeOperationVersion(r.Context(), ec, id, version, body.Input)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	for k, vs := range headers {
		for _, hv := range vs {
			w.Header().Add(k, hv)
		}
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

func (h *Handler) CreateIntegration(w http.ResponseWriter, r *http.Request) {
	var in Integration
	if err := httpx.Decode(r, &in); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.CreateIntegration(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, ""), in)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, out)
}

func (h *Handler) UpdateIntegration(w http.ResponseWriter, r *http.Request, id string) {
	var in Integration
	if err := httpx.Decode(r, &in); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.UpdateIntegration(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, ""), id, in)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) ListSecrets(w http.ResponseWriter, r *http.Request, params oapi.ListSecretsParams) {
	prefix := ""
	if params.Prefix != nil {
		prefix = *params.Prefix
	}
	out, err := h.svc.ListSecrets(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, ""), prefix)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.ListTotal(w, out, len(out))
}

func (h *Handler) WriteSecret(w http.ResponseWriter, r *http.Request) {
	var body oapi.SecretWrite
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	err := h.svc.UpdateSecret(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, ""), body.Path, body.Key, body.Value)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ReadSecret(w http.ResponseWriter, r *http.Request, params oapi.ReadSecretParams) {
	out, err := h.svc.ReadSecret(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryControl, ""), params.Path)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, map[string]any{"path": params.Path, "values": out})
}

/* ---- webhooks ---- */

func (h *Handler) ListWebhooks(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Webhooks)
}

func (h *Handler) CreateWebhook(w http.ResponseWriter, r *http.Request) {
	var wh Webhook
	if err := httpx.Decode(r, &wh); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.CreateWebhook(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, ""), wh)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, out)
}

func (h *Handler) UpdateWebhook(w http.ResponseWriter, r *http.Request, id string) {
	var wh Webhook
	if err := httpx.Decode(r, &wh); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.UpdateWebhook(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, ""), id, wh)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) DeleteWebhook(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.svc.DeleteWebhook(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, ""), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, map[string]any{"id": id, "deleted": true})
}

func (h *Handler) ListWebhookDeliveries(w http.ResponseWriter, r *http.Request, webhookId string) {
	out, err := h.svc.Deliveries(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, ""), webhookId)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, out)
}

func (h *Handler) ReplayWebhookDelivery(w http.ResponseWriter, r *http.Request, webhookId, deliveryId string) {
	out, err := h.svc.ReplayDelivery(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, ""), webhookId, deliveryId)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) TestWebhook(w http.ResponseWriter, r *http.Request, id string) {
	out, err := h.svc.TestWebhook(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, ""), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, out)
}

/* ---- API versions + portal + keys + graphql ---- */

func (h *Handler) ListApiVersions(w http.ResponseWriter, r *http.Request, apiId string) {
	out, err := h.svc.Versions(r.Context(), apiId)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, out)
}

func (h *Handler) CreateApiVersion(w http.ResponseWriter, r *http.Request, apiId string) {
	var v APIVersion
	if err := httpx.Decode(r, &v); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.CreateVersion(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, ""), apiId, v)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, out)
}

func (h *Handler) UpdateApiVersion(w http.ResponseWriter, r *http.Request, apiId, versionId string) {
	var v APIVersion
	if err := httpx.Decode(r, &v); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.UpdateVersion(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, ""), apiId, versionId, v)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) PortalCatalog(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.Portal(r.Context())
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, out)
}

func (h *Handler) ListApiKeys(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Keys)
}

func (h *Handler) CreateApiKey(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name         string   `json:"name"`
		Permissions  []string `json:"permissions"`
		QuotaPerHour int      `json:"quotaPerHour"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.CreateKey(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, ""), body.Name, body.Permissions, body.QuotaPerHour)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, out)
}

func (h *Handler) RevokeApiKey(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.svc.RevokeKey(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, ""), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, map[string]any{"id": id, "revoked": true})
}

// ExecuteGraphQL runs a minimal GraphQL query document against entity records.
func (h *Handler) ExecuteGraphQL(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Query string `json:"query"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ec := httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryAPI, "")
	data, errs, err := h.svc.GraphQL(r.Context(), ec, body.Query)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	resp := map[string]any{"data": data}
	if len(errs) > 0 {
		resp["errors"] = errs
	}
	httpx.OK(w, resp)
}
