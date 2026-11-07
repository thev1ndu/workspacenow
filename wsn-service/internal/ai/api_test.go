package ai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-service/config"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/connect"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/identity"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// stubService implements the Service methods the internal mux calls.
type stubService struct {
	Service
	lastToken, lastTool string
	lastInput           map[string]any
	lastRunID           string
	lastStep            json.RawMessage
	out                 InvokeOutcome
}

func (s *stubService) InvokeWithGrant(_ context.Context, token, tool string, input map[string]any) InvokeOutcome {
	s.lastToken, s.lastTool, s.lastInput = token, tool, input
	return s.out
}

func (s *stubService) InvokeAsUser(context.Context, *kernel.Caller, string, map[string]any) InvokeOutcome {
	return s.out
}

func (s *stubService) ToolCatalogue(context.Context) ([]connect.Tool, error) {
	return []connect.Tool{{Name: "get_low_stock_items", Description: "Low stock", Source: "workspacenow", BusinessOperation: "inventory.lowStock", InputSchema: map[string]any{"type": "object"}}}, nil
}

func (s *stubService) AppendStep(_ context.Context, runID string, step json.RawMessage) error {
	s.lastRunID, s.lastStep = runID, step
	return nil
}

type fakeResolver struct{}

func (fakeResolver) Caller(context.Context, string) (*kernel.Caller, error) {
	return &kernel.Caller{UserID: "u1", Name: "U", Permissions: kernel.NewPermissions()}, nil
}
func (fakeResolver) CallerFromClaims(context.Context, identity.Claims) (*kernel.Caller, error) {
	return &kernel.Caller{UserID: "u1", Name: "U", Permissions: kernel.NewPermissions()}, nil
}

func TestInternalMuxAuthAndRoutes(t *testing.T) {
	cfg := &config.Config{}
	cfg.AI.ServiceToken = "grant-token"
	svc := &stubService{out: InvokeOutcome{Outcome: "allowed", Output: map[string]any{"ok": true}}}
	mux := InternalMux(cfg, svc, fakeResolver{})

	// missing/wrong service token -> 401
	for _, hdr := range []string{"", "Bearer nope"} {
		req := httptest.NewRequest(http.MethodPost, InternalBasePath+"/tools/invoke", strings.NewReader(`{"tool":"t","input":{}}`))
		if hdr != "" {
			req.Header.Set("Authorization", hdr)
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("auth %q: %d", hdr, rec.Code)
		}
	}

	// tools/invoke forwards grant, tool and input; answers the outcome shape
	req := httptest.NewRequest(http.MethodPost, InternalBasePath+"/tools/invoke", strings.NewReader(`{"tool":"get_low_stock_items","input":{"limit":3}}`))
	req.Header.Set("Authorization", "Bearer grant-token")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("invoke: %d %s", rec.Code, rec.Body.String())
	}
	if svc.lastToken != "grant-token" || svc.lastTool != "get_low_stock_items" || svc.lastInput["limit"] != float64(3) {
		t.Fatalf("forwarded: %q %q %v", svc.lastToken, svc.lastTool, svc.lastInput)
	}
	var out InvokeOutcome
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil || out.Outcome != "allowed" {
		t.Fatalf("body: %s", rec.Body.String())
	}

	// bad JSON -> 400
	req = httptest.NewRequest(http.MethodPost, InternalBasePath+"/tools/invoke", strings.NewReader(`{nope`))
	req.Header.Set("Authorization", "Bearer grant-token")
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("bad json: %d", rec.Code)
	}

	// mcp/tools catalogue
	req = httptest.NewRequest(http.MethodGet, InternalBasePath+"/mcp/tools", nil)
	req.Header.Set("Authorization", "Bearer grant-token")
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "get_low_stock_items") || !strings.Contains(rec.Body.String(), "inputSchema") {
		t.Fatalf("catalogue: %d %s", rec.Code, rec.Body.String())
	}

	// run steps: 204 on a valid step, 400 on garbage
	req = httptest.NewRequest(http.MethodPost, InternalBasePath+"/runs/run-9/steps", strings.NewReader(`{"kind":"thought","text":"hi"}`))
	req.Header.Set("Authorization", "Bearer grant-token")
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent || svc.lastRunID != "run-9" || !strings.Contains(string(svc.lastStep), "thought") {
		t.Fatalf("steps: %d run=%q step=%s", rec.Code, svc.lastRunID, svc.lastStep)
	}
	req = httptest.NewRequest(http.MethodPost, InternalBasePath+"/runs/run-9/steps", strings.NewReader(`nope`))
	req.Header.Set("Authorization", "Bearer grant-token")
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("bad step: %d", rec.Code)
	}
}

func TestInternalMuxInvokeAsUserRequiresUserToken(t *testing.T) {
	cfg := &config.Config{}
	cfg.AI.ServiceToken = "svc"
	cfg.DemoMode = true // demo.<userId> tokens resolve through the fake resolver
	mux := InternalMux(cfg, &stubService{}, fakeResolver{})

	// no forwarded user token -> 401
	req := httptest.NewRequest(http.MethodPost, InternalBasePath+"/mcp/invoke", strings.NewReader(`{"tool":"t","input":{}}`))
	req.Header.Set("Authorization", "Bearer svc")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("no user token: %d", rec.Code)
	}

	// service token alone is not a user; forwarded demo token works
	req = httptest.NewRequest(http.MethodPost, InternalBasePath+"/mcp/invoke", strings.NewReader(`{"tool":"t","input":{}}`))
	req.Header.Set("Authorization", "Bearer svc")
	req.Header.Set("X-Forwarded-Authorization", "Bearer demo.u-amaya")
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("forwarded user token: %d %s", rec.Code, rec.Body.String())
	}
}
