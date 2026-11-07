package obs

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

type fakeSvc struct {
	events   []oapi.PlatformEvent
	audit    []oapi.AuditRecord
	traces   []oapi.TraceSummary
	trace    *oapi.Trace
	health   []oapi.HealthSignal
	err      error
	gotLimit int
}

func (f *fakeSvc) Events(_ context.Context, limit int) ([]oapi.PlatformEvent, error) {
	f.gotLimit = limit
	return f.events, f.err
}
func (f *fakeSvc) Audit(context.Context, oapi.ListAuditParams) ([]oapi.AuditRecord, error) {
	return f.audit, f.err
}
func (f *fakeSvc) Traces(context.Context) ([]oapi.TraceSummary, error) { return f.traces, f.err }
func (f *fakeSvc) Trace(context.Context, string) (*oapi.Trace, error)  { return f.trace, f.err }
func (f *fakeSvc) Health(context.Context) ([]oapi.HealthSignal, error) { return f.health, f.err }

type fakeAuditor struct{ denials []string }

func (f *fakeAuditor) Record(context.Context, kernel.ExecutionContext, string, string, kernel.Outcome, string) error {
	return nil
}
func (f *fakeAuditor) RecordDetached(_ context.Context, _ kernel.ExecutionContext, action, resource string, outcome kernel.Outcome, detail string) error {
	if outcome == kernel.OutcomeDenied {
		f.denials = append(f.denials, action+" "+resource)
	}
	return nil
}

func request(t *testing.T, caller *kernel.Caller) *http.Request {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/audit", nil)
	return req.WithContext(kernel.WithCaller(req.Context(), caller))
}

func decode(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("body: %s", rec.Body.String())
	}
	return out
}

func TestListAuditDeniedWithoutPermission(t *testing.T) {
	auditor := &fakeAuditor{}
	h := NewHandler(&fakeSvc{}, auditor)
	rec := httptest.NewRecorder()
	h.ListAudit(rec, request(t, &kernel.Caller{UserID: "u1", Name: "Nimal", Permissions: kernel.NewPermissions()}), oapi.ListAuditParams{})
	if rec.Code != http.StatusForbidden {
		t.Fatalf("code %d body %s", rec.Code, rec.Body.String())
	}
	if body := decode(t, rec); body["code"] != "FORBIDDEN" {
		t.Fatalf("body: %v", body)
	}
	if len(auditor.denials) != 1 || auditor.denials[0] != "audit.list audit" {
		t.Fatalf("denials: %v", auditor.denials)
	}
}

func TestListAuditAllowed(t *testing.T) {
	h := NewHandler(&fakeSvc{audit: []oapi.AuditRecord{{Id: "a1", Action: "record.create"}}}, &fakeAuditor{})
	rec := httptest.NewRecorder()
	caller := &kernel.Caller{UserID: "u1", Name: "Amaya", Permissions: kernel.NewPermissions(AuditReadPermission)}
	h.ListAudit(rec, request(t, caller), oapi.ListAuditParams{})
	if rec.Code != http.StatusOK {
		t.Fatalf("code %d body %s", rec.Code, rec.Body.String())
	}
	body := decode(t, rec)
	items := body["items"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["id"] != "a1" {
		t.Fatalf("items: %v", items)
	}
}

func TestListTracesAndGetTraceGuarded(t *testing.T) {
	h := NewHandler(&fakeSvc{traces: []oapi.TraceSummary{{TraceId: "t1"}}}, &fakeAuditor{})
	noPerm := request(t, &kernel.Caller{UserID: "u1", Name: "X", Permissions: kernel.NewPermissions()})
	rec := httptest.NewRecorder()
	h.ListTraces(rec, noPerm)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("list traces: %d", rec.Code)
	}
	rec = httptest.NewRecorder()
	h.GetTrace(rec, noPerm, "t1")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("get trace: %d", rec.Code)
	}

	h2 := NewHandler(&fakeSvc{trace: &oapi.Trace{TraceId: "t1", Title: "record.create"}}, &fakeAuditor{})
	ok := request(t, &kernel.Caller{UserID: "u1", Name: "A", Permissions: kernel.NewPermissions(AuditReadPermission)})
	rec = httptest.NewRecorder()
	h2.GetTrace(rec, ok, "t1")
	if rec.Code != http.StatusOK || decode(t, rec)["traceId"] != "t1" {
		t.Fatalf("get trace ok: %d %s", rec.Code, rec.Body.String())
	}
}

func TestGetTraceNotFound(t *testing.T) {
	h := NewHandler(&fakeSvc{err: kernel.NotFound("Trace t9 not found")}, &fakeAuditor{})
	ok := request(t, &kernel.Caller{UserID: "u1", Name: "A", Permissions: kernel.NewPermissions(AuditReadPermission)})
	rec := httptest.NewRecorder()
	h.GetTrace(rec, ok, "t9")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("code %d body %s", rec.Code, rec.Body.String())
	}
}

func TestListEventsDefaultLimit(t *testing.T) {
	svc := &fakeSvc{events: []oapi.PlatformEvent{{Id: "e1", Type: "X", Time: time.Now()}}}
	h := NewHandler(svc, &fakeAuditor{})
	rec := httptest.NewRecorder()
	h.ListEvents(rec, request(t, &kernel.Caller{UserID: "u1", Name: "A", Permissions: kernel.NewPermissions()}), oapi.ListEventsParams{})
	if rec.Code != http.StatusOK || svc.gotLimit != 50 {
		t.Fatalf("code %d limit %d", rec.Code, svc.gotLimit)
	}
	limit := 10
	rec = httptest.NewRecorder()
	h.ListEvents(rec, request(t, &kernel.Caller{UserID: "u1", Name: "A", Permissions: kernel.NewPermissions()}), oapi.ListEventsParams{Limit: &limit})
	if svc.gotLimit != 10 {
		t.Fatalf("limit %d", svc.gotLimit)
	}
}

func TestListHealth(t *testing.T) {
	h := NewHandler(&fakeSvc{health: []oapi.HealthSignal{{Resource: "postgres", Status: oapi.HealthSignalStatusHealthy, Kind: oapi.HealthSignalKindDatabase}}}, &fakeAuditor{})
	rec := httptest.NewRecorder()
	h.ListHealth(rec, request(t, &kernel.Caller{UserID: "u1", Name: "A", Permissions: kernel.NewPermissions()}))
	if rec.Code != http.StatusOK {
		t.Fatalf("code %d", rec.Code)
	}
	if decode(t, rec)["items"].([]any)[0].(map[string]any)["resource"] != "postgres" {
		t.Fatalf("body: %s", rec.Body.String())
	}
}

func TestListEventsError(t *testing.T) {
	h := NewHandler(&fakeSvc{err: errors.New("db down")}, &fakeAuditor{})
	rec := httptest.NewRecorder()
	h.ListEvents(rec, request(t, &kernel.Caller{UserID: "u1", Name: "A", Permissions: kernel.NewPermissions()}), oapi.ListEventsParams{})
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("code %d", rec.Code)
	}
}
