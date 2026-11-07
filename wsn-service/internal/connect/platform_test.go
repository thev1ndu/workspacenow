package connect

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/cache/cachemocks"
)

func TestWebhookSignatureRoundTrip(t *testing.T) {
	body := []byte(`{"type":"Sale.Created"}`)
	sig := signPayload("s3cret", 1700000000, body)
	assert.True(t, verifyPayload("s3cret", sig, body, 1700000000, 5*time.Minute))
	assert.False(t, verifyPayload("wrong", sig, body, 1700000000, 5*time.Minute))
	assert.False(t, verifyPayload("s3cret", sig, []byte(`{"tampered":true}`), 1700000000, 5*time.Minute))
	assert.False(t, verifyPayload("s3cret", sig, body, 1700000000+3600, 5*time.Minute)) // too old
	assert.False(t, verifyPayload("s3cret", "v1=abc", body, 1700000000, 5*time.Minute))
}

func TestMatchesEvent(t *testing.T) {
	h := &Webhook{Events: []string{"Sale", "Stock.LowStockReached"}}
	assert.True(t, matchesEvent(h, "Sale.Created"))
	assert.True(t, matchesEvent(h, "Stock.LowStockReached"))
	assert.False(t, matchesEvent(h, "PurchaseOrder.Created"))
	assert.True(t, matchesEvent(&Webhook{}, "Anything.Goes"))
}

func TestBackoffCaps(t *testing.T) {
	assert.Equal(t, time.Second, backoff(1))
	assert.Equal(t, 2*time.Second, backoff(2))
	assert.Equal(t, 64*time.Second, backoff(7))
	assert.Equal(t, 5*time.Minute, backoff(20)) // capped
}

func TestTransformMapping(t *testing.T) {
	in := map[string]any{"values": map[string]any{"total": 42.0}, "id": "x"}
	out := applyTransform(in, map[string]string{"amount": "values.total"}, false)
	assert.Equal(t, map[string]any{"amount": 42.0}, out)

	resp := map[string]any{"output": map[string]any{"receipt": "KDY-T0001"}, "traceId": "t"}
	mapped, err := transformResponse(resp, &Transform{Response: map[string]string{"receipt": "output.receipt"}})
	require.NoError(t, err)
	assert.Equal(t, map[string]any{"receipt": "KDY-T0001"}, mapped)

	_, err = transformResponse("not-a-map", &Transform{Response: map[string]string{"a": "b"}})
	assert.Error(t, err)
}

func TestCheckVersionLifecycle(t *testing.T) {
	active := &APIVersion{Version: "v1", Status: VersionActive}
	h, err := checkVersion(active, "v1")
	assert.NoError(t, err)
	assert.Empty(t, h)

	dep := &APIVersion{Version: "v1", Status: VersionDeprecated, DeprecatedAt: &time.Time{}, Sunset: &time.Time{}}
	h, err = checkVersion(dep, "v1")
	assert.NoError(t, err)
	assert.Contains(t, h, "Deprecation")
	assert.Contains(t, h, "Sunset")

	retired := &APIVersion{Version: "v0", Status: VersionRetired}
	_, err = checkVersion(retired, "v0")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "retired")
}

func TestParseQuery(t *testing.T) {
	fields, err := parseQuery(`query { Product(where: {category: "Grocery"}, first: 5) { id name price } Supplier { id } }`)
	require.NoError(t, err)
	require.Len(t, fields, 2)
	assert.Equal(t, "Product", fields[0].name)
	assert.Equal(t, map[string]any{"category": "Grocery"}, fields[0].args["where"])
	assert.Equal(t, 5, fields[0].args["first"])
	assert.Equal(t, []string{"id", "name", "price"}, fields[0].body)
	assert.Equal(t, "Supplier", fields[1].name)

	_, err = parseQuery("query { }")
	assert.Error(t, err)
}

func TestTokenSourceClientCredentials(t *testing.T) {
	var gotAuth string
	var gotForm map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Content-Type")
		_ = r.ParseForm()
		gotForm = map[string]any{"grant_type": r.Form.Get("grant_type"), "client_id": r.Form.Get("client_id"), "scope": r.Form.Get("scope")}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"access_token": "tok-1", "token_type": "Bearer", "expires_in": 3600})
	}))
	defer srv.Close()

	calls := 0
	cache := &cachemocks.CacheMock{
		GetFunc: func(ctx context.Context, key string) (string, bool, error) { return "", false, nil },
		SetJSONFunc: func(ctx context.Context, key string, v any, ttl time.Duration) error {
			calls++
			assert.Equal(t, time.Duration(3540)*time.Second, ttl)
			return nil
		},
	}
	ts := newTokenSource(cache, srv.Client())
	tok, err := ts.token(context.Background(), &AuthConfig{Type: "oauth2", TokenURL: srv.URL, ClientID: "cid", Scopes: []string{"read", "write"}}, "shh")
	require.NoError(t, err)
	assert.Equal(t, "tok-1", tok)
	assert.Equal(t, "application/x-www-form-urlencoded", gotAuth)
	assert.Equal(t, map[string]any{"grant_type": "client_credentials", "client_id": "cid", "scope": "read write"}, gotForm)
	assert.Equal(t, 1, calls) // cached
}

func TestTokenSourceErrors(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer srv.Close()
	cache := &cachemocks.CacheMock{
		GetFunc:     func(ctx context.Context, key string) (string, bool, error) { return "", false, nil },
		SetJSONFunc: func(ctx context.Context, key string, v any, ttl time.Duration) error { return nil },
	}
	ts := newTokenSource(cache, srv.Client())
	_, err := ts.token(context.Background(), &AuthConfig{Type: "oauth2", TokenURL: srv.URL, ClientID: "c"}, "s")
	assert.ErrorContains(t, err, "400")

	// non-oauth2 auth yields no token
	tok, err := ts.token(context.Background(), &AuthConfig{Type: "none"}, "")
	assert.NoError(t, err)
	assert.Empty(t, tok)
}
