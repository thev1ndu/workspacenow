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
	events       []oapi.PlatformEvent
	audit        []oapi.AuditRecord
	traces       []oapi.TraceSummary
	trace        *oapi.Trace
	errorGroups  []oapi.ErrorGroup
	serviceStats []oapi.ServiceStat
	health       []oapi.HealthSignal
	err          error
	gotLimit     int
	gotOffset    int
	gotQ         string
}

func (f *fakeSvc) Events(_ context.Context, _ string, limit, offset int) ([]oapi.PlatformEvent, int, error) {
	f.gotLimit = limit
	f.gotOffset = offset
	return f.events, len(f.events), f.err
}
func (f *fakeSvc) Audit(context.Context, oapi.ListAuditParams) ([]oapi.AuditRecord, error) {
	return f.audit, f.err
}
func (f *fakeSvc) Traces(_ context.Context, q string, limit, offset int) ([]oapi.TraceSummary, int, error) {
	f.gotQ = q
	return f.traces, len(f.traces), f.err
}
func (f *fakeSvc) Trace(context.Context, string) (*oapi.Trace, error) { return f.trace, f.err }
func (f *fakeSvc) ListErrorGroups(_ context.Context, q ErrorGroupQuery) ([]oapi.ErrorGroup, int, error) {
	f.gotQ = q.Q
	return f.errorGroups, len(f.errorGroups), f.err
}
func (f *fakeSvc) ListObservedServices(context.Context) ([]oapi.ServiceStat, error) {
	return f.serviceStats, f.err
}
func (f *fakeSvc) Health(context.Context) ([]oapi.HealthSignal, error) { return f.health, f.err }
func (f *fakeSvc) Overview(context.Context) (*oapi.OverviewStats, error) {
	return &oapi.OverviewStats{Applications: 2, Agents: 3}, f.err
}
func (f *fakeSvc) Resources(context.Context) ([]oapi.ResourceSummary, error) {
	return []oapi.ResourceSummary{{Id: "app-1", Type: oapi.ResourceTypeApplication, Name: "Inventory", Workspace: oapi.Studio, Owner: "Stores", Lifecycle: "active"}}, f.err
}
func (f *fakeSvc) Search(_ context.Context, _ kernel.ExecutionContext, q string, _ int) ([]oapi.SearchHit, error) {
	return []oapi.SearchHit{{Type: "application", Id: "app-1", Title: "Inventory", Subtitle: "Application"}}, f.err
}
func (f *fakeSvc) Activity(context.Context, int) ([]oapi.ActivityPoint, error) {
	return []oapi.ActivityPoint{{ApiCalls: 5, Denied: 1}}, f.err
}
func (f *fakeSvc) LogMetrics(context.Context, int) ([]oapi.LogMetricPoint, error) { return nil, nil }
func (f *fakeSvc) TokenUsage(context.Context, int) ([]oapi.TokenUsagePoint, error) {
	return []oapi.TokenUsagePoint{{AdditionalProperties: map[string]float32{"mistral_medium_latest": 42}}}, f.err
}
func (f *fakeSvc) EntryPoints(context.Context) ([]oapi.EntryPointBreakdown, error) {
	return []oapi.EntryPointBreakdown{{EntryPoint: "api", Allowed: 9, Denied: 1}}, f.err
}

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

func (f *fakeSvc) AlertRules(context.Context) ([]AlertRule, error) { return nil, nil }
func (f *fakeSvc) CreateAlertRule(context.Context, kernel.ExecutionContext, AlertRule) (*AlertRule, error) {
	return nil, nil
}
func (f *fakeSvc) UpdateAlertRule(context.Context, kernel.ExecutionContext, string, AlertRule) (*AlertRule, error) {
	return nil, nil
}
func (f *fakeSvc) DeleteAlertRule(context.Context, kernel.ExecutionContext, string) error { return nil }
func (f *fakeSvc) AlertFires(context.Context, string) ([]AlertFire, error)                { return nil, nil }
func (f *fakeSvc) AckFire(context.Context, kernel.ExecutionContext, string, string) (*AlertFire, error) {
	return nil, nil
}
func (f *fakeSvc) EvaluateAlerts(context.Context, time.Time) ([]AlertFire, error) { return nil, nil }
func (f *fakeSvc) SLOs(context.Context) ([]SLO, error)                            { return nil, nil }
func (f *fakeSvc) CreateSLO(context.Context, kernel.ExecutionContext, SLO) (*SLO, error) {
	return nil, nil
}
func (f *fakeSvc) SLOStatusByID(context.Context, string) (map[string]any, error) { return nil, nil }
func (f *fakeSvc) RecordSLOCall(context.Context, string, time.Duration, bool)    {}
func (f *fakeSvc) Status(context.Context) map[string]any                         { return nil }

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
	h.ListTraces(rec, noPerm, oapi.ListTracesParams{})
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
	h.ListEvents(rec, request(t, &kernel.Caller{UserID: "u1", Name: "A", Permissions: kernel.NewPermissions(AuditReadPermission)}), oapi.ListEventsParams{})
	if rec.Code != http.StatusOK || svc.gotLimit != 50 {
		t.Fatalf("code %d limit %d", rec.Code, svc.gotLimit)
	}
	limit := 10
	rec = httptest.NewRecorder()
	h.ListEvents(rec, request(t, &kernel.Caller{UserID: "u1", Name: "A", Permissions: kernel.NewPermissions(AuditReadPermission)}), oapi.ListEventsParams{Limit: &limit})
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
	h.ListEvents(rec, request(t, &kernel.Caller{UserID: "u1", Name: "A", Permissions: kernel.NewPermissions(AuditReadPermission)}), oapi.ListEventsParams{})
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("code %d", rec.Code)
	}
}

func TestOverviewResourcesSearchAnalytics(t *testing.T) {
	h := NewHandler(&fakeSvc{}, &fakeAuditor{})
	ok := request(t, &kernel.Caller{UserID: "u1", Name: "A", Permissions: kernel.NewPermissions(AuditReadPermission)})

	rec := httptest.NewRecorder()
	h.GetOverview(rec, ok)
	if rec.Code != 200 || decode(t, rec)["agents"] != float64(3) {
		t.Fatalf("overview: %d %s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	h.ListResources(rec, ok)
	if rec.Code != 200 || decode(t, rec)["items"].([]any)[0].(map[string]any)["workspace"] != "studio" {
		t.Fatalf("resources: %d %s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	q := "inventory"
	h.Search(rec, ok, oapi.SearchParams{Q: q})
	if rec.Code != 200 || decode(t, rec)["items"].([]any)[0].(map[string]any)["title"] != "Inventory" {
		t.Fatalf("search: %d %s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	h.GetActivity(rec, ok, oapi.GetActivityParams{})
	if rec.Code != 200 || decode(t, rec)["items"].([]any)[0].(map[string]any)["apiCalls"] != float64(5) {
		t.Fatalf("activity: %d %s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	h.GetTokenUsage(rec, ok, oapi.GetTokenUsageParams{})
	if rec.Code != 200 {
		t.Fatalf("tokens: %d %s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	h.GetEntryPointBreakdown(rec, ok)
	body := decode(t, rec)
	if rec.Code != 200 || body["items"].([]any)[0].(map[string]any)["entryPoint"] != "api" {
		t.Fatalf("entry points: %d %s", rec.Code, rec.Body.String())
	}
}

func TestListErrorGroupsAndServicesGuarded(t *testing.T) {
	now := time.Date(2026, 11, 8, 12, 0, 0, 0, time.UTC)
	h := NewHandler(&fakeSvc{
		errorGroups:  []oapi.ErrorGroup{{Fingerprint: "fp", Service: "wsn-service", SpanName: "checkout", Message: "card declined", Count: 3, FirstSeen: now, LastSeen: now, TraceIds: []string{"t2"}}},
		serviceStats: []oapi.ServiceStat{{Service: "wsn-service", Spans: 40, Errors: 3, Logs: 9, ErrorRate: 0.075, LastSeen: now}},
	}, &fakeAuditor{})

	noPerm := request(t, &kernel.Caller{UserID: "u1", Name: "X", Permissions: kernel.NewPermissions()})
	rec := httptest.NewRecorder()
	h.ListErrorGroups(rec, noPerm, oapi.ListErrorGroupsParams{})
	if rec.Code != http.StatusForbidden {
		t.Fatalf("list errors denied: %d", rec.Code)
	}
	rec = httptest.NewRecorder()
	h.ListObservedServices(rec, noPerm)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("list services denied: %d", rec.Code)
	}

	svc := h.svc.(*fakeSvc)
	ok := request(t, &kernel.Caller{UserID: "u1", Name: "A", Permissions: kernel.NewPermissions(AuditReadPermission)})
	rec = httptest.NewRecorder()
	q := "card"
	h.ListErrorGroups(rec, ok, oapi.ListErrorGroupsParams{Q: &q, Limit: ptr(10), Offset: ptr(5)})
	if rec.Code != http.StatusOK {
		t.Fatalf("list errors: %d %s", rec.Code, rec.Body.String())
	}
	body := decode(t, rec)
	if body["total"] != float64(1) || svc.gotQ != "card" {
		t.Fatalf("errors body: %v q=%q", body, svc.gotQ)
	}
	rec = httptest.NewRecorder()
	h.ListObservedServices(rec, ok)
	if rec.Code != http.StatusOK || decode(t, rec)["total"] != float64(1) {
		t.Fatalf("list services: %d %s", rec.Code, rec.Body.String())
	}
}

func ptr[T any](v T) *T { return &v }

func TestOperationsReadsNeedPermission(t *testing.T) {
	aud := &fakeAuditor{}
	h := NewHandler(&fakeSvc{}, aud)
	staff := request(t, &kernel.Caller{UserID: "u1", Name: "Staff", Permissions: kernel.NewPermissions("inventory.read")})
	for name, call := range map[string]func(http.ResponseWriter, *http.Request){
		"events":    func(w http.ResponseWriter, r *http.Request) { h.ListEvents(w, r, oapi.ListEventsParams{}) },
		"resources": h.ListResources,
		"alerts":    h.ListAlertRules,
		"slos":      h.ListSLOs,
	} {
		rec := httptest.NewRecorder()
		call(rec, staff)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("%s without permission: %d", name, rec.Code)
		}
	}
	// aggregate charts and health stay open to staff
	rec := httptest.NewRecorder()
	h.GetOverview(rec, staff)
	if rec.Code != http.StatusOK {
		t.Fatalf("overview counts stay open: %d", rec.Code)
	}
}
