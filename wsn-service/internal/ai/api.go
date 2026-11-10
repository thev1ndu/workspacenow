package ai

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/config"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/middleware"
)

// InternalBasePath is where the service-to-service API is served.
const InternalBasePath = "/internal/v1"

// InternalMux serves the API wsn-ai-service calls on :8081: tool invocation under a
// run grant, the managed MCP catalogue and user-token invocation, and streamed run steps.
// Everything except /mcp/invoke authenticates with the shared service token; /mcp/invoke
// authenticates the forwarded user token instead.
func InternalMux(cfg *config.Config, svc Service, resolver middleware.CallerResolver) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST "+InternalBasePath+"/tools/invoke", serviceOrGrant(cfg, svc, invokeWithGrant(svc)))
	mux.HandleFunc("GET "+InternalBasePath+"/mcp/tools", serviceToken(cfg, listTools(svc)))
	mux.HandleFunc("POST "+InternalBasePath+"/runs/{runId}/steps", serviceToken(cfg, appendStep(svc)))
	var sessionAuth func(ctx context.Context, token string) (string, error)
	if cfg.LocalAuthEnabled() {
		if s, ok := resolver.(interface {
			SessionUser(ctx context.Context, token string) (string, error)
		}); ok {
			sessionAuth = s.SessionUser
		}
	}
	userAuth := middleware.Authenticate(cfg.OIDC, cfg.DemoMode, resolver, func(*http.Request) bool { return false }, nil, sessionAuth)
	mux.Handle("POST "+InternalBasePath+"/mcp/invoke", forwardAuth(userAuth(http.HandlerFunc(invokeAsUser(svc)))))
	return mux
}

// serviceOrGrant accepts the shared AI_SERVICE_TOKEN or a signed run grant (InvokeWithGrant
// verifies the grant itself); ai-service calls tools/invoke with the grant, not the service token.
func serviceOrGrant(cfg *config.Config, svc Service, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || token == "" {
			httpx.Error(w, r, kernel.Unauthenticated("This API is for wsn-ai-service only"))
			return
		}
		if cfg.AI.ServiceToken != "" && subtle.ConstantTimeCompare([]byte(token), []byte(cfg.AI.ServiceToken)) == 1 {
			next(w, r)
			return
		}
		if strings.Count(token, ".") == 1 { // grant <payload>.<sig> — verified inside InvokeWithGrant
			next(w, r)
			return
		}
		httpx.Error(w, r, kernel.Unauthenticated("This API is for wsn-ai-service only"))
	}
}

// serviceToken requires the shared AI_SERVICE_TOKEN bearer.
func serviceToken(cfg *config.Config, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || cfg.AI.ServiceToken == "" || subtle.ConstantTimeCompare([]byte(token), []byte(cfg.AI.ServiceToken)) != 1 {
			httpx.Error(w, r, kernel.Unauthenticated("This API is for wsn-ai-service only"))
			return
		}
		next(w, r)
	}
}

// forwardAuth moves X-Forwarded-Authorization into Authorization so the user auth middleware reads it.
func forwardAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if fwd := r.Header.Get("X-Forwarded-Authorization"); fwd != "" {
			r.Header.Set("Authorization", fwd)
		}
		next.ServeHTTP(w, r)
	})
}

type invokeBody struct {
	Tool  string         `json:"tool"`
	Input map[string]any `json:"input"`
}

func invokeWithGrant(svc Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body invokeBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpx.Error(w, r, kernel.Invalid("The request body is not valid JSON"))
			return
		}
		token, _ := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		out := svc.InvokeWithGrant(r.Context(), token, body.Tool, body.Input)
		httpx.OK(w, out)
	}
}

func invokeAsUser(svc Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body invokeBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpx.Error(w, r, kernel.Invalid("The request body is not valid JSON"))
			return
		}
		caller := httpx.Caller(r)
		out := svc.InvokeAsUser(r.Context(), caller, body.Tool, body.Input)
		httpx.OK(w, out)
	}
}

func listTools(svc Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tools, err := svc.ToolCatalogue(r.Context())
		if err != nil {
			httpx.Error(w, r, err)
			return
		}
		type toolOut struct {
			Name        string         `json:"name"`
			Description string         `json:"description"`
			InputSchema map[string]any `json:"inputSchema"`
		}
		out := make([]toolOut, 0, len(tools))
		for _, t := range tools {
			out = append(out, toolOut{Name: t.Name, Description: t.Description, InputSchema: t.InputSchema})
		}
		httpx.List(w, out)
	}
}

func appendStep(svc Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
		if err != nil {
			httpx.Error(w, r, kernel.Invalid("Could not read the step"))
			return
		}
		var step json.RawMessage
		if err := json.Unmarshal(raw, &step); err != nil {
			httpx.Error(w, r, kernel.Invalid("The step is not valid JSON"))
			return
		}
		if err := svc.AppendStep(r.Context(), r.PathValue("runId"), step); err != nil {
			httpx.Error(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
