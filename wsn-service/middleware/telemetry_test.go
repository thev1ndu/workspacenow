package middleware

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/observer"
)

type postCapture struct {
	mu     sync.Mutex
	bodies map[string][][]byte
}

func (p *postCapture) handler(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	p.mu.Lock()
	p.bodies[r.URL.Path] = append(p.bodies[r.URL.Path], body)
	p.mu.Unlock()
	w.WriteHeader(http.StatusAccepted)
}

func (p *postCapture) count(path string) int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.bodies[path])
}

func (p *postCapture) lastJSON(path string) map[string]any {
	p.mu.Lock()
	raw := p.bodies[path][len(p.bodies[path])-1]
	p.mu.Unlock()
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		panic(err)
	}
	return out
}

func TestTelemetryExportsSpanAndMetrics(t *testing.T) {
	cap := &postCapture{bodies: map[string][][]byte{}}
	srv := httptest.NewServer(http.HandlerFunc(cap.handler))
	defer srv.Close()
	exp := observer.NewExporter(srv.URL, "", "wsn-service", time.Hour, srv.Client())

	var ctxTrace, ctxSpan string
	h := Telemetry(exp)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctxTrace = kernel.TraceIDFrom(r.Context())
		_, ctxSpan = observer.SpanFrom(r.Context())
		w.WriteHeader(http.StatusCreated)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/widgets", nil)
	req.Header.Set(TraceHeader, "trace-abc")
	h.ServeHTTP(httptest.NewRecorder(), req)

	if ctxTrace != "trace-abc" || ctxSpan == "" {
		t.Fatalf("trace/span in ctx: %q %q", ctxTrace, ctxSpan)
	}
	exp.Flush(context.Background())
	if cap.count("/v1/traces") != 1 || cap.count("/v1/metrics") != 1 {
		t.Fatalf("posts: %v", cap.bodies)
	}
	traces := cap.lastJSON("/v1/traces")
	span := traces["resourceSpans"].([]any)[0].(map[string]any)["scopeSpans"].([]any)[0].(map[string]any)["spans"].([]any)[0].(map[string]any)
	if span["traceId"] != "trace-abc" || span["spanId"] != ctxSpan || span["kind"] != float64(2) || span["status"].(map[string]any)["code"] != float64(1) {
		t.Fatalf("span: %v", span)
	}
	attrs := map[string]string{}
	for _, a := range span["attributes"].([]any) {
		kv := a.(map[string]any)
		attrs[kv["key"].(string)] = kv["value"].(map[string]any)["stringValue"].(string)
	}
	if attrs["http.status_code"] != "201" || attrs["http.method"] != "GET" {
		t.Fatalf("span attrs: %v", attrs)
	}
	metrics := cap.bodies["/v1/metrics"]
	names := map[string]bool{}
	for _, raw := range metrics {
		var m map[string]any
		_ = json.Unmarshal(raw, &m)
		rm := m["resourceMetrics"].([]any)[0].(map[string]any)["scopeMetrics"].([]any)[0].(map[string]any)["metrics"].([]any)
		for _, mm := range rm {
			names[mm.(map[string]any)["name"].(string)] = true
		}
	}
	if !names["http.server.requests"] || !names["http.server.duration_ms"] {
		t.Fatalf("metric names: %v", names)
	}
	_ = exp.Close(context.Background())
}

func TestTelemetryErrorStatusMarksSpan(t *testing.T) {
	cap := &postCapture{bodies: map[string][][]byte{}}
	srv := httptest.NewServer(http.HandlerFunc(cap.handler))
	defer srv.Close()
	exp := observer.NewExporter(srv.URL, "", "wsn-service", time.Hour, srv.Client())
	h := Telemetry(exp)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusInternalServerError) }))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/api/v1/x", nil))
	exp.Flush(context.Background())
	span := cap.lastJSON("/v1/traces")["resourceSpans"].([]any)[0].(map[string]any)["scopeSpans"].([]any)[0].(map[string]any)["spans"].([]any)[0].(map[string]any)
	if span["status"].(map[string]any)["code"] != float64(2) {
		t.Fatalf("error span status: %v", span["status"])
	}
	_ = exp.Close(context.Background())
}

func TestTelemetryDisabledStillSetsTraceID(t *testing.T) {
	exp := observer.NewExporter("", "", "wsn-service", time.Hour, nil)
	var got string
	h := Telemetry(exp)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = kernel.TraceIDFrom(r.Context())
		w.WriteHeader(http.StatusOK)
	}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if got == "" {
		t.Fatal("trace id must be set even with the observer disabled")
	}
	if _, span := observer.SpanFrom(context.Background()); span != "" {
		t.Fatal("no span without telemetry")
	}
}
