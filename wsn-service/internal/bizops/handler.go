// Package bizops serves the business operation catalogue and its generic invoke endpoint.
package bizops

import (
	"net/http"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

type Handler struct{ engine kernel.Engine }

func NewHandler(engine kernel.Engine) *Handler { return &Handler{engine: engine} }

func (h *Handler) ListBusinessOperations(w http.ResponseWriter, r *http.Request) {
	httpx.ListFrom(w, r, h.engine.List)
}

// Result is what invoking an operation returns from any entry point.
type Result struct {
	TraceID string `json:"traceId"`
	Output  any    `json:"output"`
}

func (h *Handler) InvokeBusinessOperation(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Operation  string            `json:"operation"`
		Input      map[string]any    `json:"input"`
		EntryPoint kernel.EntryPoint `json:"entryPoint"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, r, err)
		return
	}
	entry := body.EntryPoint
	if entry == "" {
		entry = kernel.EntryStudio
	}
	ec := httpx.Caller(r).Context(entry, "")
	out, err := h.engine.Invoke(r.Context(), ec, body.Operation, body.Input)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.Created(w, Result{TraceID: ec.TraceID, Output: out})
}
