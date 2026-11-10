package connect

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

type nopAuditor struct{ denied int }

func (a *nopAuditor) Record(context.Context, kernel.ExecutionContext, string, string, kernel.Outcome, string) error {
	return nil
}
func (a *nopAuditor) RecordDetached(_ context.Context, _ kernel.ExecutionContext, _, _ string, o kernel.Outcome, _ string) error {
	if o == kernel.OutcomeDenied {
		a.denied++
	}
	return nil
}

// stubService answers the list calls; every other method panics if a test reaches it.
type stubService struct {
	Service
	integrations []Integration
	webhooks     []Webhook
}

func (s *stubService) Integrations(context.Context) ([]Integration, error) { return s.integrations, nil }
func (s *stubService) Webhooks(context.Context) ([]Webhook, error)         { return s.webhooks, nil }
func (s *stubService) Keys(context.Context) ([]APIKey, error)              { return []APIKey{}, nil }

func as(perms ...string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	return req.WithContext(kernel.WithCaller(req.Context(), &kernel.Caller{UserID: "u1", Name: "U", Permissions: kernel.NewPermissions(perms...)}))
}

func TestConnectListsNeedManageAndHideCredentials(t *testing.T) {
	svc := &stubService{
		integrations: []Integration{{ID: "int-1", Auth: &AuthConfig{Type: "bearer", Token: "tok-secret", RefreshToken: "ref-secret", ClientID: "client"}}},
		webhooks:     []Webhook{{ID: "wh-1", Secret: "hmac-secret"}},
	}
	aud := &nopAuditor{}
	h := NewHandler(svc, aud)

	for name, call := range map[string]func(http.ResponseWriter, *http.Request){"integrations": h.ListIntegrations, "webhooks": h.ListWebhooks, "keys": h.ListApiKeys} {
		rec := httptest.NewRecorder()
		call(rec, as("inventory.read"))
		assert.Equal(t, http.StatusForbidden, rec.Code, name)
	}
	assert.Equal(t, 3, aud.denied, "denials are audited")

	rec := httptest.NewRecorder()
	h.ListIntegrations(rec, as("connect.manage"))
	require.Equal(t, http.StatusOK, rec.Code)
	assert.NotContains(t, rec.Body.String(), "tok-secret")
	assert.NotContains(t, rec.Body.String(), "ref-secret")
	assert.Contains(t, rec.Body.String(), "client", "non-secret auth settings stay visible")
	assert.Equal(t, "tok-secret", svc.integrations[0].Auth.Token, "redaction must not change the stored integration")

	rec = httptest.NewRecorder()
	h.ListWebhooks(rec, as("connect.manage"))
	var body struct{ Items []Webhook }
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Equal(t, "********", body.Items[0].Secret)
}

func TestReadableSecretPaths(t *testing.T) {
	assert.True(t, readableSecret("integrations/erp"))
	assert.True(t, readableSecret("vault://integrations/erp"))
	assert.False(t, readableSecret("workspacenow/run-grant"))
	assert.False(t, readableSecret("integrations/../workspacenow/mistral"))
	assert.False(t, readableSecret("integrationsx/erp"))
}

func TestUnheld(t *testing.T) {
	assert.Empty(t, unheld(kernel.NewPermissions("*"), []string{"*", "control.manage"}))
	assert.Equal(t, []string{"*", "control.manage"}, unheld(kernel.NewPermissions("connect.manage", "inventory.read"), []string{"inventory.read", "*", "control.manage"}))
}

// gqlRuntime serves one entity and its records; anything else panics.
type gqlRuntime struct{ data.Runtime }

func (gqlRuntime) Entity(_ context.Context, name string) (*data.Entity, error) {
	return &data.Entity{Name: name, ReadPermission: "procurement.read"}, nil
}
func (gqlRuntime) RecordsAs(context.Context, kernel.ExecutionContext, string, bool) ([]data.Record, error) {
	return []data.Record{{ID: "pr-1", Values: map[string]any{"amount": 900}}}, nil
}

func TestGraphQLNeedsEntityReadPermission(t *testing.T) {
	aud := &nopAuditor{}
	s := &service{rt: gqlRuntime{}, auditor: aud}
	fields, err := parseQuery(`{ PurchaseRequest { amount } }`)
	require.NoError(t, err)

	out, errs := s.graphql(context.Background(), kernel.ExecutionContext{Actor: kernel.Actor{Name: "Clerk"}, Permissions: kernel.NewPermissions("inventory.read")}, fields)
	assert.Empty(t, out, "no data without the entity's read permission")
	assert.Len(t, errs, 1)
	assert.Equal(t, 1, aud.denied)

	out, errs = s.graphql(context.Background(), kernel.ExecutionContext{Permissions: kernel.NewPermissions("procurement.read")}, fields)
	assert.Empty(t, errs)
	assert.Len(t, out["PurchaseRequest"], 1)
}

func TestListWebhooksDoesNotMutateStoredSecrets(t *testing.T) {
	svc := &stubService{webhooks: []Webhook{{ID: "wh-1", Secret: "hmac-secret"}}}
	rec := httptest.NewRecorder()
	NewHandler(svc, &nopAuditor{}).ListWebhooks(rec, as("connect.manage"))
	assert.Equal(t, "hmac-secret", svc.webhooks[0].Secret)
}
