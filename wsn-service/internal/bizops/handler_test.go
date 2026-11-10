package bizops

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

type recordingEngine struct {
	kernel.Engine
	entry kernel.EntryPoint
	trace string
}

func (e *recordingEngine) Invoke(_ context.Context, ec kernel.ExecutionContext, _ string, _ map[string]any) (any, error) {
	e.entry, e.trace = ec.EntryPoint, ec.TraceID
	return map[string]any{}, nil
}

func invoke(t *testing.T, h *Handler, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/business-operations/invoke", strings.NewReader(body))
	ctx := kernel.WithTraceID(kernel.WithCaller(req.Context(), &kernel.Caller{UserID: "u1", Name: "U"}), "trace-req")
	rec := httptest.NewRecorder()
	h.InvokeBusinessOperation(rec, req.WithContext(ctx))
	return rec
}

func TestInvokeRejectsPlatformEntryPoints(t *testing.T) {
	for _, entry := range []string{"agent", "workflow", "mcp", "system", "control"} {
		eng := &recordingEngine{}
		if rec := invoke(t, NewHandler(eng), `{"operation":"x","entryPoint":"`+entry+`"}`); rec.Code != http.StatusUnprocessableEntity {
			t.Fatalf("entryPoint %s must be refused, got %d", entry, rec.Code)
		}
		if eng.entry != "" {
			t.Fatalf("entryPoint %s must not reach the engine", entry)
		}
	}
	eng := &recordingEngine{}
	if rec := invoke(t, NewHandler(eng), `{"operation":"x","entryPoint":"api"}`); rec.Code != http.StatusCreated || eng.entry != kernel.EntryAPI {
		t.Fatalf("api is allowed: %d %s", rec.Code, eng.entry)
	}
	if eng.trace != "trace-req" {
		t.Fatalf("the request's trace is kept, got %q", eng.trace)
	}
	eng = &recordingEngine{}
	if invoke(t, NewHandler(eng), `{"operation":"x"}`); eng.entry != kernel.EntryStudio {
		t.Fatalf("default entry point is studio, got %s", eng.entry)
	}
}
