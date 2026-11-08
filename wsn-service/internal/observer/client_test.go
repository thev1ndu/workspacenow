package observer

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newQueryServer(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	mux.HandleFunc("POST /api/v1/traces/query", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.Write([]byte(`{"traces":[{"traceId":"t1","rootSpanName":"root","service":"wsn-service","spanCount":2}],"totalCount":1}`))
	})
	mux.HandleFunc("POST /api/v1/traces/t1/spans/query", func(w http.ResponseWriter, _ *http.Request) {
		w.Write([]byte(`{"spans":[{"traceId":"t1","spanId":"s1","name":"root","service":"wsn-service","kind":"SPAN_KIND_SERVER","status":"1","startTime":"2026-01-01T00:00:00Z","endTime":"2026-01-01T00:00:01Z","durationNs":1000000000,"attributes":{"a":"b"}}],"totalCount":1}`))
	})
	mux.HandleFunc("GET /api/v1/traces/t1/spans/s1", func(w http.ResponseWriter, _ *http.Request) {
		w.Write([]byte(`{"traceId":"t1","spanId":"s1","name":"root","kind":"SPAN_KIND_SERVER","status":"1","startTime":"2026-01-01T00:00:00Z","endTime":"2026-01-01T00:00:01Z","durationNs":1000000000,"attributes":{"a":"b"}}`))
	})
	mux.HandleFunc("POST /api/v1/logs/query", func(w http.ResponseWriter, _ *http.Request) {
		w.Write([]byte(`{"logs":[{"timestamp":"2026-01-01T00:00:00Z","severity":"ERROR","severityNumber":17,"body":"boom","service":"wsn-service","traceId":"t1"}],"totalCount":1}`))
	})
	mux.HandleFunc("POST /api/v1/metrics/query", func(w http.ResponseWriter, _ *http.Request) {
		w.Write([]byte(`{"metrics":[{"name":"requests","service":"wsn-service","type":"sum","timestamp":"2026-01-01T00:00:00Z","value":"3"}],"totalCount":1}`))
	})
	mux.HandleFunc("POST /api/v1/traces/fail/spans/query", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"message":"upstream down"}`))
	})
	return httptest.NewServer(mux)
}

func TestClientQueries(t *testing.T) {
	srv := newQueryServer(t)
	defer srv.Close()
	c := NewClient(srv.URL, "tok")
	ctx := context.Background()

	if err := c.Health(ctx); err != nil {
		t.Fatal(err)
	}
	traces, err := c.ListTraces(ctx, TraceQuery{ServiceName: "wsn-service", Limit: 10})
	if err != nil || traces.TotalCount != 1 || traces.Traces[0].TraceID != "t1" || traces.Traces[0].SpanCount != 2 {
		t.Fatalf("ListTraces: %v %v", traces, err)
	}
	spans, err := c.TraceSpans(ctx, "t1", TraceQuery{Limit: 50})
	if err != nil || spans.TotalCount != 1 {
		t.Fatalf("TraceSpans: %v %v", spans, err)
	}
	span, err := c.SpanDetails(ctx, "t1", "s1")
	if err != nil || span.SpanID != "s1" || span.Name != "root" || span.Attributes["a"] != "b" {
		t.Fatalf("SpanDetails: %v %v", span, err)
	}
	logs, err := c.ListLogs(ctx, LogQuery{Level: "ERROR"})
	if err != nil || logs.TotalCount != 1 || logs.Logs[0].Body != "boom" || logs.Logs[0].TraceID != "t1" {
		t.Fatalf("ListLogs: %v %v", logs, err)
	}
	metrics, err := c.ListMetrics(ctx, MetricQuery{Name: "requests"})
	if err != nil || metrics.Metrics[0].Value != "3" {
		t.Fatalf("ListMetrics: %v %v", metrics, err)
	}
}

func TestClientErrors(t *testing.T) {
	srv := newQueryServer(t)
	defer srv.Close()
	c := NewClient(srv.URL, "tok")
	if _, err := c.TraceSpans(context.Background(), "fail", TraceQuery{}); err == nil || !strings.Contains(err.Error(), "500") {
		t.Fatalf("expected a 500 error, got %v", err)
	}
	bad := NewClient(srv.URL, "wrong")
	if _, err := bad.ListTraces(context.Background(), TraceQuery{}); err == nil || !strings.Contains(err.Error(), "401") {
		t.Fatalf("expected a 401 error, got %v", err)
	}
	down := NewClient("http://127.0.0.1:1", "")
	if err := down.Health(context.Background()); err == nil {
		t.Fatal("unreachable observer must error")
	}
}

func TestClientErrorsAndServices(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/errors/query", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body["q"] != "card" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.Write([]byte(`{"errors":[{"fingerprint":"fp","service":"wsn-service","spanName":"checkout","message":"card declined","count":3,"firstSeen":"2026-01-01T00:00:00Z","lastSeen":"2026-01-01T01:00:00Z","traceIds":["t2","t1"]}],"totalCount":1}`))
	})
	mux.HandleFunc("GET /api/v1/services", func(w http.ResponseWriter, _ *http.Request) {
		w.Write([]byte(`{"services":[{"service":"wsn-service","spans":40,"errors":2,"logs":9,"errorRate":0.05,"lastSeen":"2026-01-01T01:00:00Z"}]}`))
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()
	c := NewClient(srv.URL, "tok")
	ctx := context.Background()

	groups, err := c.ListErrors(ctx, ErrorQuery{Q: "card", Limit: 10, SortOrder: "desc"})
	if err != nil || groups.TotalCount != 1 || groups.Errors[0].Message != "card declined" ||
		groups.Errors[0].Count != 3 || len(groups.Errors[0].TraceIDs) != 2 || groups.Errors[0].TraceIDs[0] != "t2" {
		t.Fatalf("ListErrors: %+v %v", groups, err)
	}
	if groups.Errors[0].LastSeen.Hour() != 1 {
		t.Fatalf("lastSeen not parsed: %v", groups.Errors[0].LastSeen)
	}
	if _, err := c.ListErrors(ctx, ErrorQuery{Q: "other"}); err == nil {
		t.Fatal("expected 400 to surface as error")
	}
	svcs, err := c.Services(ctx)
	if err != nil || len(svcs.Services) != 1 || svcs.Services[0].Service != "wsn-service" ||
		svcs.Services[0].ErrorRate != 0.05 || svcs.Services[0].Spans != 40 {
		t.Fatalf("Services: %+v %v", svcs, err)
	}
}
