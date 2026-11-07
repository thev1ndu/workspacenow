package data

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

// Handler serves the Data endpoints; record endpoints run the entity's business operations.
type Handler struct {
	svc    Service
	rt     Runtime
	engine kernel.Engine
}

func NewHandler(svc Service, rt Runtime, engine kernel.Engine) *Handler {
	return &Handler{svc: svc, rt: rt, engine: engine}
}

func (h *Handler) ListEntities(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Entities)
}
func (h *Handler) ListConnections(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.svc.Connections)
}

func (h *Handler) GetEntity(w http.ResponseWriter, r *http.Request, name string) {
	e, err := h.svc.Entity(r.Context(), name)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, e)
}

func (h *Handler) CreateEntity(w http.ResponseWriter, r *http.Request) {
	var in CreateEntityInput
	if err := httpx.Decode(r, &in); err != nil {
		httpx.Error(w, r, err)
		return
	}
	e, err := h.svc.CreateEntity(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), in)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, e)
}

func (h *Handler) UpdateEntity(w http.ResponseWriter, r *http.Request, name string) {
	var in UpdateEntityInput
	if err := httpx.Decode(r, &in); err != nil {
		httpx.Error(w, r, err)
		return
	}
	e, err := h.svc.UpdateEntity(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), name, in)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, e)
}

func (h *Handler) ListRecords(w http.ResponseWriter, r *http.Request, name oapi.EntityName, params oapi.ListRecordsParams) {
	q := ""
	limit, offset := 50, 0
	viewID := ""
	includeDeleted := false
	if params.Q != nil {
		q = strings.ToLower(*params.Q)
	}
	if params.Limit != nil {
		limit = *params.Limit
	}
	if params.Offset != nil {
		offset = *params.Offset
	}
	if params.View != nil {
		viewID = *params.View
	}
	if params.IncludeDeleted != nil {
		includeDeleted = *params.IncludeDeleted
	}
	records, total, err := h.svc.ListRecords(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), string(name), viewID, includeDeleted, q, limit, offset)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.ListTotal(w, records, total)
}

// ExportRecords serves the entity's records as JSON or CSV.
func (h *Handler) ExportRecords(w http.ResponseWriter, r *http.Request, name oapi.EntityName, params oapi.ExportRecordsParams) {
	format := "json"
	if params.Format != nil {
		format = string(*params.Format)
	}
	viewID := ""
	if params.View != nil {
		viewID = *params.View
	}
	body, contentType, err := h.svc.Export(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), string(name), format, viewID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.%s", strings.ToLower(string(name)), format))
	_, _ = w.Write([]byte(body))
}

// ImportRecords creates records from a JSON array or CSV text body.
func (h *Handler) ImportRecords(w http.ResponseWriter, r *http.Request, name oapi.EntityName) {
	var body struct {
		Format string `json:"format"`
		Data   string `json:"data"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if body.Format == "" {
		body.Format = "json"
	}
	created, err := h.svc.Import(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), string(name), body.Format, body.Data)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, map[string]any{"created": created})
}

// RecordHistory answers GET records/{id}/history.
func (h *Handler) RecordHistory(w http.ResponseWriter, r *http.Request, name oapi.EntityName, recordId string) {
	entries, err := h.svc.History(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), string(name), recordId)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, entries)
}

// RestoreRecord answers POST records/{id}/restore.
func (h *Handler) RestoreRecord(w http.ResponseWriter, r *http.Request, name oapi.EntityName, recordId string) {
	rec, err := h.svc.Restore(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), string(name), recordId)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, rec)
}

// MigrateEntity answers POST /entities/{name}/migrate.
func (h *Handler) MigrateEntity(w http.ResponseWriter, r *http.Request, name oapi.EntityName) {
	var m SchemaMigration
	if err := httpx.Decode(r, &m); err != nil {
		httpx.Error(w, r, err)
		return
	}
	e, _, err := h.svc.Migrate(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), string(name), m)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, e)
}

func (h *Handler) ListViews(w http.ResponseWriter, r *http.Request, name oapi.EntityName) {
	views, err := h.svc.Views(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), string(name))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, views)
}

func (h *Handler) CreateView(w http.ResponseWriter, r *http.Request, name oapi.EntityName) {
	var v SavedView
	if err := httpx.Decode(r, &v); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.CreateView(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), string(name), v)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, out)
}

func (h *Handler) UpdateView(w http.ResponseWriter, r *http.Request, name oapi.EntityName, viewId string) {
	var v SavedView
	if err := httpx.Decode(r, &v); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.svc.UpdateView(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), string(name), viewId, v)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) DeleteView(w http.ResponseWriter, r *http.Request, name oapi.EntityName, viewId string) {
	if err := h.svc.DeleteView(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), string(name), viewId); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, map[string]any{"id": viewId, "deleted": true})
}

// RunView answers POST views/{id}/run with the view's records.
func (h *Handler) RunView(w http.ResponseWriter, r *http.Request, name oapi.EntityName, viewId string, params oapi.RunViewParams) {
	includeDeleted := false
	if params.IncludeDeleted != nil {
		includeDeleted = *params.IncludeDeleted
	}
	records, total, err := h.svc.RunView(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), string(name), viewId, includeDeleted)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.ListTotal(w, records, total)
}

type valuesBody struct {
	Values map[string]any `json:"values"`
}

func (h *Handler) CreateRecord(w http.ResponseWriter, r *http.Request, name string) {
	h.write(w, r, name, "create", nil, http.StatusCreated)
}

func (h *Handler) UpdateRecord(w http.ResponseWriter, r *http.Request, name, id string) {
	h.write(w, r, name, "update", &id, http.StatusOK)
}

func (h *Handler) DeleteRecord(w http.ResponseWriter, r *http.Request, name, id string) {
	if err := h.writable(r.Context(), name); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := h.engine.Invoke(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), name+".delete", map[string]any{"id": id})
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) write(w http.ResponseWriter, r *http.Request, name, verb string, id *string, status int) {
	if err := h.writable(r.Context(), name); err != nil {
		httpx.Error(w, r, err)
		return
	}
	var body valuesBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	input := map[string]any{"values": body.Values}
	if id != nil {
		input["id"] = *id
	}
	out, err := h.engine.Invoke(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), name+"."+verb, input)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, status, out)
}

// writable refuses writes to entities owned by an external system.
func (h *Handler) writable(ctx context.Context, name string) error {
	e, err := h.rt.Entity(ctx, name)
	if err != nil {
		return err
	}
	if e.Scope == ScopeExternal {
		return kernel.InvalidState("External entities are read-only")
	}
	return nil
}
