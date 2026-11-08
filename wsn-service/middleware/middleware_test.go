package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-service/config"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/identity"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// TestStatusRecorderUnwraps ensures http.ResponseController can flush through the recorder
// (SSE streams depend on it; without Unwrap the stream closes after the first write).
func TestStatusRecorderUnwraps(t *testing.T) {
	rec := &statusRecorder{ResponseWriter: httptest.NewRecorder(), status: 200}
	rc := http.NewResponseController(rec)
	if err := rc.Flush(); err != nil {
		t.Fatalf("flush through statusRecorder: %v", err)
	}
}

type stubResolver struct{ userID string }

func (s stubResolver) Caller(_ context.Context, userID string) (*kernel.Caller, error) {
	if userID == s.userID {
		return &kernel.Caller{UserID: userID, Name: "admin"}, nil
	}
	return nil, kernel.Unauthenticated("unknown user")
}
func (s stubResolver) CallerFromClaims(_ context.Context, _ identity.Claims) (*kernel.Caller, error) {
	return nil, kernel.Unauthenticated("no claims")
}

// TestLocalSessionTokenWithOIDC ensures a local system-user session token is accepted even when
// an OIDC verifier is configured (Rancher-style: both login options stay available).
func TestLocalSessionTokenWithOIDC(t *testing.T) {
	mw := Authenticate(
		config.OIDCConfig{JWKSURL: "https://idp.example/jwks"}, // OIDC enabled
		false,
		stubResolver{userID: "local:admin@workspacenow.local"},
		func(*http.Request) bool { return false },
		nil,
		func(_ context.Context, token string) (string, error) {
			if token == "abc123session" {
				return "local:admin@workspacenow.local", nil
			}
			return "", kernel.Unauthenticated("Sign in to continue")
		},
	)
	called := false
	h := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		if c, ok := kernel.CallerFrom(r.Context()); !ok || c == nil {
			t.Error("no caller in context")
		}
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/session", nil)
	req.Header.Set("Authorization", "Bearer abc123session") // opaque token, not a JWT
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !called {
		t.Fatalf("local session token rejected while OIDC configured: code=%d called=%v", rec.Code, called)
	}
}
