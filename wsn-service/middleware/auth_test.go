package middleware

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/config"
)

func b64url(n *big.Int) string { return base64.RawURLEncoding.EncodeToString(n.Bytes()) }

// jwksServer serves one RSA key under kid "k1" while fail is false, then 500s.
func jwksServer(t *testing.T, fail *atomic.Bool) *httptest.Server {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	set := map[string]any{"keys": []map[string]any{{
		"kid": "k1", "kty": "RSA", "use": "sig", "alg": "RS256",
		"n": b64url(key.N), "e": b64url(big.NewInt(int64(key.E))),
	}}}
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if fail.Load() {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(set)
	}))
}

func TestKeyServesStaleWhenRefreshFails(t *testing.T) {
	var fail atomic.Bool
	srv := jwksServer(t, &fail)
	defer srv.Close()
	v := newJWTVerifier(config.OIDCConfig{JWKSURL: srv.URL})

	if _, err := v.key(context.Background(), "k1", "RS256"); err != nil {
		t.Fatalf("initial fetch: %v", err)
	}
	fail.Store(true)
	v.mu.Lock()
	v.fetchedAt = time.Now().Add(-2 * time.Hour) // stale: forces a refresh attempt
	v.mu.Unlock()
	if _, err := v.key(context.Background(), "k1", "RS256"); err != nil {
		t.Fatalf("stale keys must be served when the IdP is down: %v", err)
	}
	if _, err := v.key(context.Background(), "unknown", "RS256"); err == nil {
		t.Fatal("an unknown kid must still error when the IdP is down")
	}
}

func TestKeyRejectsAlgMismatch(t *testing.T) {
	var fail atomic.Bool
	srv := jwksServer(t, &fail)
	defer srv.Close()
	v := newJWTVerifier(config.OIDCConfig{JWKSURL: srv.URL})
	if _, err := v.key(context.Background(), "k1", "RS512"); err == nil {
		t.Fatal("token alg RS512 must be rejected against a JWK declaring RS256")
	}
	if _, err := v.key(context.Background(), "k1", "RS256"); err != nil {
		t.Fatalf("matching alg must pass: %v", err)
	}
}

func TestJWKRejectsSmallRSA(t *testing.T) {
	small := jwk{Kty: "RSA", N: b64url(new(big.Int).Lsh(big.NewInt(1), 1023)), E: "AQAB"}
	if _, err := small.publicKey(); err == nil {
		t.Fatal("a 1024-bit RSA key must be rejected")
	}
	ok := jwk{Kty: "RSA", N: b64url(new(big.Int).Lsh(big.NewInt(1), 2047)), E: "AQAB"}
	if _, err := ok.publicKey(); err != nil {
		t.Fatalf("a 2048-bit RSA key must be accepted: %v", err)
	}
}

func TestAlgCheckAllowsUndeclaredAlg(t *testing.T) {
	e := keyEntry{pub: "pub"} // JWK without alg: nothing to mismatch against
	if _, err := algCheck("k1", "RS512", e); err != nil {
		t.Fatalf("a JWK without alg accepts any token alg: %v", err)
	}
	if _, err := algCheck("k1", "RS256", keyEntry{pub: "pub", alg: "RS256"}); err != nil {
		t.Fatalf("matching alg: %v", err)
	}
	if _, err := algCheck("k1", "RS512", keyEntry{pub: "pub", alg: "RS256"}); err == nil {
		t.Fatal("mismatched alg must be rejected")
	}
}

func TestPasswordRotationAllowed(t *testing.T) {
	get := func(path string) *http.Request {
		r := httptest.NewRequest(http.MethodGet, path, nil)
		return r
	}
	if !passwordRotationAllowed(httptest.NewRequest(http.MethodPost, "/api/v1/auth/password", nil)) {
		t.Fatal("POST /auth/password must be allowed during rotation")
	}
	if !passwordRotationAllowed(httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)) {
		t.Fatal("POST /auth/logout must be allowed during rotation")
	}
	if !passwordRotationAllowed(get("/api/v1/session")) {
		t.Fatal("GET /session must be allowed during rotation")
	}
	if passwordRotationAllowed(get("/api/v1/users")) {
		t.Fatal("other routes must be blocked during rotation")
	}
	if passwordRotationAllowed(httptest.NewRequest(http.MethodPost, "/api/v1/session", nil)) {
		t.Fatal("POST /session must be blocked during rotation")
	}
}
