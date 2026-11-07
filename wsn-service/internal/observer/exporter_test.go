package observer

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

type captured struct {
	mu     sync.Mutex
	bodies map[string][][]byte
	auths  map[string]string
}

func newCapture(status int) (*captured, *httptest.Server) {
	c := &captured{bodies: map[string][][]byte{}, auths: map[string]string{}}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		c.mu.Lock()
		c.bodies[r.URL.Path] = append(c.bodies[r.URL.Path], body)
		c.auths[r.URL.Path] = r.Header.Get("Authorization")
		c.mu.Unlock()
		w.WriteHeader(status)
	}))
	return c, srv
}

func (c *captured) count(path string) int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.bodies[path])
}

func (c *captured) last(path string) map[string]any {
	c.mu.Lock()
	defer c.mu.Unlock()
	raw := c.bodies[path][len(c.bodies[path])-1]
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		panic(err)
	}
	return out
}

func TestExporterFlushPostsAllSignals(t *testing.T) {
	cap, srv := newCapture(http.StatusAccepted)
	defer srv.Close()
	exp := NewExporter(srv.URL, "tok", "wsn-service", time.Hour, srv.Client())
	exp.Span(Span{TraceID: "t1", SpanID: "s1", Name: "GET /x", Kind: "SPAN_KIND_SERVER", Status: "1",
		Start: time.Unix(0, 1000), End: time.Unix(0, 5000), Attributes: map[string]string{"http.method": "GET"}})
	exp.Log(LogRecord{Time: time.Unix(0, 1000), Severity: "INFO", SeverityNumber: 9, Body: "hello", TraceID: "t1", SpanID: "s1"})
	exp.Metric(MetricPoint{Name: "http.server.requests", Type: "sum", Time: time.Unix(0, 1000), Value: "1"})
	exp.Flush(context.Background())

	if cap.count("/v1/traces") != 1 || cap.count("/v1/logs") != 1 || cap.count("/v1/metrics") != 1 {
		t.Fatalf("expected one post per signal: %v", cap.bodies)
	}
	if cap.auths["/v1/traces"] != "Bearer tok" {
		t.Fatalf("auth header: %q", cap.auths["/v1/traces"])
	}
	traces := cap.last("/v1/traces")
	rs := traces["resourceSpans"].([]any)[0].(map[string]any)
	service := rs["resource"].(map[string]any)["attributes"].([]any)[0].(map[string]any)["value"].(map[string]any)["stringValue"]
	if service != "wsn-service" {
		t.Fatalf("service.name: %v", service)
	}
	span := rs["scopeSpans"].([]any)[0].(map[string]any)["spans"].([]any)[0].(map[string]any)
	if span["traceId"] != "t1" || span["name"] != "GET /x" || span["kind"] != float64(2) || span["status"].(map[string]any)["code"] != float64(1) {
		t.Fatalf("span: %v", span)
	}
	logs := cap.last("/v1/logs")
	rec := logs["resourceLogs"].([]any)[0].(map[string]any)["scopeLogs"].([]any)[0].(map[string]any)["logRecords"].([]any)[0].(map[string]any)
	if rec["body"].(map[string]any)["stringValue"] != "hello" || rec["traceId"] != "t1" {
		t.Fatalf("log record: %v", rec)
	}
	metrics := cap.last("/v1/metrics")
	m := metrics["resourceMetrics"].([]any)[0].(map[string]any)["scopeMetrics"].([]any)[0].(map[string]any)["metrics"].([]any)[0].(map[string]any)
	dp := m["sum"].(map[string]any)["dataPoints"].([]any)[0].(map[string]any)
	if m["name"] != "http.server.requests" || dp["asInt"] != float64(1) {
		t.Fatalf("metric: %v", m)
	}
	if err := exp.Close(context.Background()); err != nil {
		t.Fatal(err)
	}
	if cap.count("/v1/traces") != 1 {
		t.Fatal("Close must not duplicate already-flushed spans")
	}
}

func TestExporterDisabledIsNoOp(t *testing.T) {
	exp := NewExporter("", "", "wsn-service", time.Hour, nil)
	if exp.Enabled() {
		t.Fatal("empty URL must disable the exporter")
	}
	exp.Span(Span{})
	exp.Log(LogRecord{})
	exp.Metric(MetricPoint{})
	exp.Flush(context.Background())
	if err := exp.Close(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func TestExporterDropsRejectedBatches(t *testing.T) {
	cap, srv := newCapture(http.StatusInternalServerError)
	defer srv.Close()
	exp := NewExporter(srv.URL, "", "wsn-service", time.Hour, srv.Client())
	exp.Span(Span{TraceID: "t", SpanID: "s", Name: "n", Start: time.Now(), End: time.Now()})
	exp.Flush(context.Background()) // must not panic on a 500
	if cap.count("/v1/traces") != 1 {
		t.Fatal("flush should have attempted the post")
	}
	_ = exp.Close(context.Background())
}

func TestMetricValueFallbacks(t *testing.T) {
	p := metricsPayload("svc", []MetricPoint{
		{Name: "g", Type: "gauge", Time: time.Unix(0, 1), Value: "2.5"},
		{Name: "h", Type: "histogram", Time: time.Unix(0, 1), Value: "7"},
		{Name: "weird", Type: "gauge", Time: time.Unix(0, 1), Value: "abc"},
	})
	raw, err := json.Marshal(p)
	if err != nil {
		t.Fatal(err)
	}
	s := string(raw)
	if !strings.Contains(s, `"asDouble":2.5`) || !strings.Contains(s, `"asInt":7`) || !strings.Contains(s, `"count":1`) {
		t.Fatalf("payload: %s", s)
	}
}

func TestLogHandlerLinksTraceAndAttrs(t *testing.T) {
	cap, srv := newCapture(http.StatusAccepted)
	defer srv.Close()
	exp := NewExporter(srv.URL, "", "wsn-service", time.Hour, srv.Client())
	h := NewLogHandler(exp, "wsn-service").WithAttrs([]slog.Attr{slog.String("component", "api")})
	if !h.Enabled(context.Background(), slog.LevelInfo) {
		t.Fatal("enabled handler should accept INFO")
	}
	ctx := WithSpan(context.Background(), "trace-9", "span-1")
	rec := slog.NewRecord(time.Unix(0, 42), slog.LevelError, "boom", 0)
	rec.AddAttrs(slog.String("k", "v"))
	if err := h.Handle(ctx, rec); err != nil {
		t.Fatal(err)
	}
	exp.Flush(context.Background())
	logs := cap.last("/v1/logs")
	lr := logs["resourceLogs"].([]any)[0].(map[string]any)["scopeLogs"].([]any)[0].(map[string]any)["logRecords"].([]any)[0].(map[string]any)
	if lr["traceId"] != "trace-9" || lr["spanId"] != "span-1" || lr["severityNumber"] != float64(17) {
		t.Fatalf("log record: %v", lr)
	}
	attrs := lr["attributes"].([]any)
	seen := map[string]string{}
	for _, a := range attrs {
		kv := a.(map[string]any)
		seen[kv["key"].(string)] = kv["value"].(map[string]any)["stringValue"].(string)
	}
	if seen["component"] != "api" || seen["k"] != "v" {
		t.Fatalf("attrs: %v", seen)
	}
	_ = exp.Close(context.Background())
}

func TestLogHandlerDisabled(t *testing.T) {
	h := NewLogHandler(NewExporter("", "", "s", time.Hour, nil), "s")
	if h.Enabled(context.Background(), slog.LevelInfo) {
		t.Fatal("disabled exporter must disable the handler")
	}
}

func TestTeeFansOut(t *testing.T) {
	var a, b int
	h := Tee(handlerFunc(func(slog.Level) { a++ }), handlerFunc(func(slog.Level) { b++ }))
	if !h.Enabled(context.Background(), slog.LevelInfo) {
		t.Fatal("tee is enabled when any child is")
	}
	rec := slog.NewRecord(time.Now(), slog.LevelInfo, "m", 0)
	if err := h.Handle(context.Background(), rec); err != nil {
		t.Fatal(err)
	}
	if a != 1 || b != 1 {
		t.Fatalf("a=%d b=%d", a, b)
	}
	withAttrs := h.WithAttrs([]slog.Attr{slog.Int("n", 1)}).WithGroup("g")
	if err := withAttrs.Handle(context.Background(), rec); err != nil {
		t.Fatal(err)
	}
	if a != 2 || b != 2 {
		t.Fatalf("after WithAttrs/WithGroup: a=%d b=%d", a, b)
	}
}

type handlerFunc func(slog.Level)

func (f handlerFunc) Enabled(context.Context, slog.Level) bool { return true }
func (f handlerFunc) Handle(_ context.Context, r slog.Record) error {
	f(r.Level)
	return nil
}
func (f handlerFunc) WithAttrs([]slog.Attr) slog.Handler { return f }
func (f handlerFunc) WithGroup(string) slog.Handler      { return f }

func TestSpanFromEmpty(t *testing.T) {
	if tr, sp := SpanFrom(context.Background()); tr != "" || sp != "" {
		t.Fatal("no span in context")
	}
	if id := NewSpanID(); len(id) != 16 {
		t.Fatalf("span id: %q", id)
	}
}
