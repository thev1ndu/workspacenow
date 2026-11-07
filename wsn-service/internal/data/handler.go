package data

import (
	"context"
	"net/http"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
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

func (h *Handler) ListRecords(w http.ResponseWriter, r *http.Request, name string) {
	out, err := h.engine.Invoke(r.Context(), httpx.Caller(r).ContextFrom(r.Context(), kernel.EntryStudio, ""), name+".list", nil)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.List(w, out.([]Record))
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
