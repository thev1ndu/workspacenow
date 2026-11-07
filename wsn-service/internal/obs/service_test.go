package obs

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/observer"
)

func actorJSON(t *testing.T, name string) models.JSON {
	t.Helper()
	raw, err := json.Marshal(map[string]any{"kind": "user", "id": "u1", "name": name})
	if err != nil {
		t.Fatal(err)
	}
	return models.JSON(raw)
}

func TestSummarizeGroupsByTrace(t *testing.T) {
	t0 := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	rows := []models.AuditRecord{
		{ID: "a3", TraceID: "t1", Time: t0.Add(3 * time.Second), Actor: actorJSON(t, "Amaya"), Action: "entity.create", Resource: "entity/Product", Outcome: "allowed"},
		{ID: "a2", TraceID: "t1", Time: t0.Add(2 * time.Second), Actor: actorJSON(t, "Nimal"), Action: "record.create", Resource: "record/PO-1", Outcome: "denied"},
		{ID: "a1", TraceID: "t1", Time: t0, Actor: actorJSON(t, "Amaya"), Action: "record.read", Resource: "record/PO-1", Outcome: "allowed"},
		{ID: "b1", TraceID: "t2", Time: t0.Add(10 * time.Second), Actor: actorJSON(t, "Ruwan"), Action: "approval.approve", Resource: "approval/ap1", Outcome: "allowed"},
	}
	sums := summarize(rows, map[string]int{"t1": 4})
	if len(sums) != 2 {
		t.Fatalf("summaries: %v", sums)
	}
	first := sums[0]
	if first.TraceId != "t1" || first.Title != "entity.create" || first.Denied != 1 || first.SpanCount != 4 {
		t.Fatalf("first: %+v", first)
	}
	if len(first.Actors) != 2 || first.Actors[0] != "Amaya" || first.Actors[1] != "Nimal" {
		t.Fatalf("actors: %v", first.Actors)
	}
	if !first.StartedAt.Equal(t0) || !first.EndedAt.Equal(t0.Add(3*time.Second)) {
		t.Fatalf("window: %v - %v", first.StartedAt, first.EndedAt)
	}
	if sums[1].TraceId != "t2" || sums[1].SpanCount != 0 {
		t.Fatalf("second: %+v", sums[1])
	}
}

func TestBuildTrace(t *testing.T) {
	t0 := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	audit := []models.AuditRecord{
		{ID: "a1", TraceID: "t1", Time: t0, Actor: actorJSON(t, "Amaya"), EntryPoint: "api", Action: "record.create", Resource: "record/PO-1", Outcome: "denied", Detail: "no permission"},
	}
	events := []models.Event{
		{ID: "e1", Type: "Stock.LowStockReached", Source: "inventory", TraceID: "t1", Payload: models.JSON(`{"sku":"x"}`), Time: t0.Add(time.Second)},
	}
	tr := buildTrace("t1", audit, events, 3)
	if tr.TraceId != "t1" || tr.Title != "record.create" || tr.Denied != 1 || tr.SpanCount != 3 {
		t.Fatalf("trace: %+v", tr)
	}
	if len(tr.Audit) != 1 || tr.Audit[0].Outcome != "denied" || tr.Audit[0].Detail == nil || *tr.Audit[0].Detail != "no permission" {
		t.Fatalf("audit: %+v", tr.Audit)
	}
	if tr.Audit[0].EntryPoint != "api" || tr.Audit[0].Actor.Name != "Amaya" {
		t.Fatalf("audit mapping: %+v", tr.Audit[0])
	}
	if len(tr.Events) != 1 || tr.Events[0].Type != "Stock.LowStockReached" || tr.Events[0].Payload["sku"] != "x" {
		t.Fatalf("events: %+v", tr.Events)
	}
	if !tr.StartedAt.Equal(t0) || !tr.EndedAt.Equal(t0.Add(time.Second)) || len(tr.Actors) != 1 {
		t.Fatalf("window/actors: %+v", tr)
	}
}

func TestBuildTraceEventsOnly(t *testing.T) {
	t0 := time.Now()
	tr := buildTrace("t9", nil, []models.Event{{ID: "e1", Type: "X.Created", TraceID: "t9", Time: t0}}, 0)
	if tr.Title != "X.Created" || len(tr.Audit) != 0 || tr.StartedAt.IsZero() {
		t.Fatalf("events-only trace: %+v", tr)
	}
}

func TestToAuditEmptyDetailIsNil(t *testing.T) {
	a := toAudit(models.AuditRecord{ID: "a", TraceID: "t", Time: time.Now(), Actor: actorJSON(t, "A"), Outcome: "allowed"})
	if a.Detail != nil {
		t.Fatalf("detail should be nil: %+v", a)
	}
}

func TestHealthChecks(t *testing.T) {
	s := &service{obs: nilClient{}}
	signals, err := s.Health(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(signals) != 5 {
		t.Fatalf("signals: %v", signals)
	}
	byResource := map[string]oapi.HealthSignal{}
	for _, sig := range signals {
		byResource[sig.Resource] = sig
	}
	for _, name := range []string{"postgres", "valkey", "nats", "wsn-observer", "wsn-ai-service"} {
		if _, ok := byResource[name]; !ok {
			t.Fatalf("missing %s", name)
		}
	}
	// nil/unreachable deps must report down, not panic
	for _, name := range []string{"nats", "wsn-observer", "wsn-ai-service"} {
		if byResource[name].Status != oapi.HealthSignalStatusDown || byResource[name].Detail == "" {
			t.Fatalf("%s: %+v", name, byResource[name])
		}
	}
}

func TestPingAI(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }))
	defer srv.Close()
	s := &service{aiHealthURL: srv.URL + "/healthz", hc: srv.Client()}
	if err := s.pingAI(context.Background()); err != nil {
		t.Fatal(err)
	}
	sNil := &service{aiHealthURL: srv.URL} // nil http client falls back to the default
	if err := sNil.pingAI(context.Background()); err != nil {
		t.Fatal(err)
	}
	bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusTeapot) }))
	defer bad.Close()
	s2 := &service{aiHealthURL: bad.URL, hc: bad.Client()}
	if err := s2.pingAI(context.Background()); err == nil {
		t.Fatal("non-200 must fail")
	}
}

func TestPingNATSNihil(t *testing.T) {
	s := &service{}
	if err := s.pingNATS(context.Background()); err == nil {
		t.Fatal("nil conn must fail")
	}
}

func TestSpanCountsBestEffort(t *testing.T) {
	s := &service{obs: nilClient{}, serviceName: "wsn-service"}
	if got := s.spanCounts(context.Background()); len(got) != 0 {
		t.Fatalf("expected empty map on error, got %v", got)
	}
}

type nilClient struct{}

func (nilClient) Health(context.Context) error { return context.DeadlineExceeded }
func (nilClient) ListTraces(context.Context, observer.TraceQuery) (*observer.TraceList, error) {
	return nil, context.DeadlineExceeded
}
func (nilClient) TraceSpans(context.Context, string, observer.TraceQuery) (*observer.SpanList, error) {
	return nil, context.DeadlineExceeded
}
func (nilClient) SpanDetails(context.Context, string, string) (*observer.Span, error) {
	return nil, context.DeadlineExceeded
}
func (nilClient) ListLogs(context.Context, observer.LogQuery) (*observer.LogList, error) {
	return nil, context.DeadlineExceeded
}
func (nilClient) ListMetrics(context.Context, observer.MetricQuery) (*observer.MetricList, error) {
	return nil, context.DeadlineExceeded
}

func TestScoreTiers(t *testing.T) {
	terms := []string{"po-1001"}
	if score(terms, "PO-1001", "") != 100 {
		t.Fatal("exact match scores 100")
	}
	if score(terms, "PO-1001 draft", "") != 60 {
		t.Fatal("prefix scores 60")
	}
	if score(terms, "draft PO-1001", "") != 40 {
		t.Fatal("word start scores 40")
	}
	if score(terms, "xPO-1001", "") != 25 {
		t.Fatal("mid-word substring in title scores 25")
	}
	if score(terms, "order", "ref PO-1001") != 10 {
		t.Fatal("substring elsewhere scores 10")
	}
	if score(terms, "order", "nothing") != 0 {
		t.Fatal("no match scores 0")
	}
	if score([]string{"a", "b"}, "a b", "") != 100 {
		t.Fatal("all terms must match")
	}
}

func TestSanitizeModel(t *testing.T) {
	if got := sanitizeModel("mistral-medium-latest"); got != "mistral_medium_latest" {
		t.Fatalf("sanitize: %q", got)
	}
	if got := sanitizeModel(""); got != "unknown" {
		t.Fatalf("empty: %q", got)
	}
}

func TestLastDays(t *testing.T) {
	days := lastDays(3)
	if len(days) != 3 || !days[2].After(days[0]) {
		t.Fatalf("days: %v", days)
	}
	if days[2].Sub(days[0]) != 48*time.Hour {
		t.Fatalf("span: %v", days[2].Sub(days[0]))
	}
}
