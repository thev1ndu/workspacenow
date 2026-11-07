// Package observer ships telemetry to wsn-observer over OTLP/HTTP JSON and queries it back.
package observer

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"sync"
	"time"
)

// Span is one OTLP span waiting to be exported.
type Span struct {
	TraceID      string
	SpanID       string
	ParentSpanID string
	Name         string
	Kind         string // SPAN_KIND_*
	Status       string // "0" unset, "1" ok, "2" error
	Start        time.Time
	End          time.Time
	Attributes   map[string]string
}

// LogRecord is one OTLP log record waiting to be exported.
type LogRecord struct {
	Time           time.Time
	Severity       string
	SeverityNumber int32
	Body           string
	TraceID        string
	SpanID         string
	Attributes     map[string]string
}

// MetricPoint is one OTLP metric data point (gauge, sum or histogram count).
type MetricPoint struct {
	Name       string
	Type       string // gauge, sum, histogram
	Time       time.Time
	Value      string
	Attributes map[string]string
}

// TraceOverview is one trace row as the observer's query API returns it.
type TraceOverview struct {
	TraceID      string    `json:"traceId"`
	RootSpanID   string    `json:"rootSpanId"`
	RootSpanName string    `json:"rootSpanName"`
	Service      string    `json:"service"`
	StartTime    time.Time `json:"startTime"`
	EndTime      time.Time `json:"endTime"`
	SpanCount    int       `json:"spanCount"`
}

type anyValue struct {
	StringValue *string  `json:"stringValue,omitempty"`
	IntValue    *int64   `json:"intValue,omitempty"`
	DoubleValue *float64 `json:"doubleValue,omitempty"`
	BoolValue   *bool    `json:"boolValue,omitempty"`
}

func strValue(s string) anyValue { return anyValue{StringValue: &s} }

type keyValue struct {
	Key   string   `json:"key"`
	Value anyValue `json:"value"`
}

func attrs(m map[string]string) []keyValue {
	if len(m) == 0 {
		return nil
	}
	out := make([]keyValue, 0, len(m))
	for k, v := range m {
		out = append(out, keyValue{Key: k, Value: strValue(v)})
	}
	return out
}

func nano(t time.Time) string { return strconv.FormatInt(t.UnixNano(), 10) }

func resourceAttrs(service string) []keyValue {
	return []keyValue{{Key: "service.name", Value: strValue(service)}}
}

// tracesPayload wraps spans in the OTLP/HTTP JSON envelope the observer ingests.
func tracesPayload(service string, spans []Span) any {
	type otlpSpan struct {
		TraceID           string     `json:"traceId"`
		SpanID            string     `json:"spanId"`
		ParentSpanID      string     `json:"parentSpanId,omitempty"`
		Name              string     `json:"name"`
		Kind              int32      `json:"kind"`
		StartTimeUnixNano string     `json:"startTimeUnixNano"`
		EndTimeUnixNano   string     `json:"endTimeUnixNano"`
		Attributes        []keyValue `json:"attributes,omitempty"`
		Status            struct {
			Code int32 `json:"code"`
		} `json:"status"`
	}
	kinds := map[string]int32{
		"SPAN_KIND_INTERNAL": 1, "SPAN_KIND_SERVER": 2, "SPAN_KIND_CLIENT": 3,
		"SPAN_KIND_PRODUCER": 4, "SPAN_KIND_CONSUMER": 5,
	}
	out := make([]otlpSpan, 0, len(spans))
	for _, s := range spans {
		var st struct {
			Code int32 `json:"code"`
		}
		if code, err := strconv.ParseInt(s.Status, 10, 32); err == nil {
			st.Code = int32(code)
		}
		out = append(out, otlpSpan{
			TraceID: s.TraceID, SpanID: s.SpanID, ParentSpanID: s.ParentSpanID, Name: s.Name,
			Kind: kinds[s.Kind], StartTimeUnixNano: nano(s.Start), EndTimeUnixNano: nano(s.End),
			Attributes: attrs(s.Attributes), Status: st,
		})
	}
	return map[string]any{"resourceSpans": []any{map[string]any{
		"resource":   map[string]any{"attributes": resourceAttrs(service)},
		"scopeSpans": []any{map[string]any{"spans": out}},
	}}}
}

// logsPayload wraps log records in the OTLP/HTTP JSON envelope.
func logsPayload(service string, logs []LogRecord) any {
	type otlpLog struct {
		TimeUnixNano   string     `json:"timeUnixNano"`
		SeverityText   string     `json:"severityText"`
		SeverityNumber int32      `json:"severityNumber"`
		Body           anyValue   `json:"body"`
		TraceID        string     `json:"traceId,omitempty"`
		SpanID         string     `json:"spanId,omitempty"`
		Attributes     []keyValue `json:"attributes,omitempty"`
	}
	out := make([]otlpLog, 0, len(logs))
	for _, l := range logs {
		out = append(out, otlpLog{
			TimeUnixNano: nano(l.Time), SeverityText: l.Severity, SeverityNumber: l.SeverityNumber,
			Body: strValue(l.Body), TraceID: l.TraceID, SpanID: l.SpanID, Attributes: attrs(l.Attributes),
		})
	}
	return map[string]any{"resourceLogs": []any{map[string]any{
		"resource":  map[string]any{"attributes": resourceAttrs(service)},
		"scopeLogs": []any{map[string]any{"logRecords": out}},
	}}}
}

// metricsPayload wraps metric points in the OTLP/HTTP JSON envelope.
func metricsPayload(service string, points []MetricPoint) any {
	type dataPoint struct {
		TimeUnixNano string     `json:"timeUnixNano"`
		AsInt        *int64     `json:"asInt,omitempty"`
		AsDouble     *float64   `json:"asDouble,omitempty"`
		Count        *uint64    `json:"count,omitempty"`
		Attributes   []keyValue `json:"attributes,omitempty"`
	}
	type otlpMetric struct {
		Name  string `json:"name"`
		Gauge *struct {
			DataPoints []dataPoint `json:"dataPoints"`
		} `json:"gauge,omitempty"`
		Sum *struct {
			DataPoints []dataPoint `json:"dataPoints"`
		} `json:"sum,omitempty"`
		Histogram *struct {
			DataPoints []dataPoint `json:"dataPoints"`
		} `json:"histogram,omitempty"`
	}
	metrics := make([]otlpMetric, 0, len(points))
	for _, p := range points {
		dp := dataPoint{TimeUnixNano: nano(p.Time), Attributes: attrs(p.Attributes)}
		if v, err := strconv.ParseInt(p.Value, 10, 64); err == nil {
			dp.AsInt = &v
		} else if f, err := strconv.ParseFloat(p.Value, 64); err == nil {
			dp.AsDouble = &f
		} else {
			c := uint64(1)
			dp.Count = &c
		}
		m := otlpMetric{Name: p.Name}
		switch p.Type {
		case "sum":
			m.Sum = &struct {
				DataPoints []dataPoint `json:"dataPoints"`
			}{DataPoints: []dataPoint{dp}}
		case "histogram":
			m.Histogram = &struct {
				DataPoints []dataPoint `json:"dataPoints"`
			}{DataPoints: []dataPoint{dp}}
		default:
			m.Gauge = &struct {
				DataPoints []dataPoint `json:"dataPoints"`
			}{DataPoints: []dataPoint{dp}}
		}
		metrics = append(metrics, m)
	}
	return map[string]any{"resourceMetrics": []any{map[string]any{
		"resource":     map[string]any{"attributes": resourceAttrs(service)},
		"scopeMetrics": []any{map[string]any{"metrics": metrics}},
	}}}
}

// Exporter batches spans, logs and metrics and posts them to wsn-observer; all sends are best-effort.
type Exporter struct {
	baseURL string
	token   string
	service string
	client  *http.Client

	mu      sync.Mutex
	spans   []Span
	logs    []LogRecord
	metrics []MetricPoint

	done chan struct{}
	wg   sync.WaitGroup
}

// NewExporter starts the background flusher; an empty baseURL returns a disabled exporter.
func NewExporter(baseURL, token, service string, flushInterval time.Duration, client *http.Client) *Exporter {
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second}
	}
	e := &Exporter{baseURL: baseURL, token: token, service: service, client: client, done: make(chan struct{})}
	if e.Enabled() {
		if flushInterval <= 0 {
			flushInterval = 2 * time.Second
		}
		e.wg.Add(1)
		go e.loop(flushInterval)
	}
	return e
}

// Enabled reports whether telemetry is exported at all.
func (e *Exporter) Enabled() bool { return e != nil && e.baseURL != "" }

// NewSpanID returns a random 16-hex-char span id, OTLP style.
func NewSpanID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// Span queues one span; dropped silently when disabled or the batch is momentarily full.
func (e *Exporter) Span(s Span) {
	if !e.Enabled() {
		return
	}
	e.mu.Lock()
	e.spans = append(e.spans, s)
	e.mu.Unlock()
}

// Log queues one log record.
func (e *Exporter) Log(l LogRecord) {
	if !e.Enabled() {
		return
	}
	e.mu.Lock()
	e.logs = append(e.logs, l)
	e.mu.Unlock()
}

// Metric queues one metric data point.
func (e *Exporter) Metric(m MetricPoint) {
	if !e.Enabled() {
		return
	}
	e.mu.Lock()
	e.metrics = append(e.metrics, m)
	e.mu.Unlock()
}

func (e *Exporter) loop(interval time.Duration) {
	defer e.wg.Done()
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-e.done:
			return
		case <-t.C:
			e.Flush(context.Background())
		}
	}
}

// Flush posts everything queued so far; failures are logged and the batch is dropped.
func (e *Exporter) Flush(ctx context.Context) {
	if !e.Enabled() {
		return
	}
	e.mu.Lock()
	spans, logs, metrics := e.spans, e.logs, e.metrics
	e.spans, e.logs, e.metrics = nil, nil, nil
	e.mu.Unlock()
	if len(spans) > 0 {
		e.post(ctx, "/v1/traces", tracesPayload(e.service, spans))
	}
	if len(logs) > 0 {
		e.post(ctx, "/v1/logs", logsPayload(e.service, logs))
	}
	if len(metrics) > 0 {
		e.post(ctx, "/v1/metrics", metricsPayload(e.service, metrics))
	}
}

// Close stops the flusher and sends whatever is still queued.
func (e *Exporter) Close(ctx context.Context) error {
	if !e.Enabled() {
		return nil
	}
	close(e.done)
	e.wg.Wait()
	e.Flush(ctx)
	return nil
}

func (e *Exporter) post(ctx context.Context, path string, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		slog.WarnContext(ctx, "observer: encode payload", "error", err)
		return
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.baseURL+path, bytes.NewReader(body))
	if err != nil {
		slog.WarnContext(ctx, "observer: build request", "error", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if e.token != "" {
		req.Header.Set("Authorization", "Bearer "+e.token)
	}
	resp, err := e.client.Do(req)
	if err != nil {
		slog.WarnContext(ctx, "observer: export failed", "path", path, "error", err)
		return
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusAccepted && resp.StatusCode != http.StatusOK {
		slog.WarnContext(ctx, "observer: export rejected", "path", path, "status", resp.StatusCode)
	}
}

type spanCtxKey struct{}

type spanCtx struct{ traceID, spanID string }

// WithSpan stores the current trace/span ids in ctx so log records can be linked.
func WithSpan(ctx context.Context, traceID, spanID string) context.Context {
	return context.WithValue(ctx, spanCtxKey{}, spanCtx{traceID: traceID, spanID: spanID})
}

// SpanFrom returns the trace/span ids stored by WithSpan.
func SpanFrom(ctx context.Context) (traceID, spanID string) {
	if s, ok := ctx.Value(spanCtxKey{}).(spanCtx); ok {
		return s.traceID, s.spanID
	}
	return "", ""
}

func severityNumber(level slog.Level) int32 {
	switch {
	case level >= slog.LevelError:
		return 17
	case level >= slog.LevelWarn:
		return 13
	case level >= slog.LevelInfo:
		return 9
	default:
		return 5
	}
}

// LogHandler is a slog.Handler that ships every record to the observer as an OTLP log record.
type LogHandler struct {
	exp     *Exporter
	service string
	attrs   []slog.Attr
}

// NewLogHandler builds the handler; a disabled exporter makes it a no-op.
func NewLogHandler(exp *Exporter, service string) *LogHandler {
	return &LogHandler{exp: exp, service: service}
}

func (h *LogHandler) Enabled(context.Context, slog.Level) bool { return h.exp.Enabled() }

func (h *LogHandler) Handle(ctx context.Context, r slog.Record) error {
	attributes := map[string]string{}
	for _, a := range h.attrs {
		attributes[a.Key] = a.Value.String()
	}
	r.Attrs(func(a slog.Attr) bool { attributes[a.Key] = a.Value.String(); return true })
	traceID, spanID := SpanFrom(ctx)
	h.exp.Log(LogRecord{
		Time: r.Time, Severity: r.Level.String(), SeverityNumber: severityNumber(r.Level),
		Body: r.Message, TraceID: traceID, SpanID: spanID, Attributes: attributes,
	})
	return nil
}

func (h *LogHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	c := *h
	c.attrs = append(append([]slog.Attr{}, h.attrs...), attrs...)
	return &c
}

func (h *LogHandler) WithGroup(string) slog.Handler { return h }

// Tee fans records out to several handlers, like slog's multi-handler.
func Tee(handlers ...slog.Handler) slog.Handler { return tee{handlers} }

type tee struct{ handlers []slog.Handler }

func (t tee) Enabled(ctx context.Context, l slog.Level) bool {
	for _, h := range t.handlers {
		if h.Enabled(ctx, l) {
			return true
		}
	}
	return false
}

func (t tee) Handle(ctx context.Context, r slog.Record) error {
	for _, h := range t.handlers {
		if h.Enabled(ctx, r.Level) {
			if err := h.Handle(ctx, r.Clone()); err != nil {
				return fmt.Errorf("tee handler: %w", err)
			}
		}
	}
	return nil
}

func (t tee) WithAttrs(attrs []slog.Attr) slog.Handler {
	out := make([]slog.Handler, len(t.handlers))
	for i, h := range t.handlers {
		out[i] = h.WithAttrs(attrs)
	}
	return tee{out}
}

func (t tee) WithGroup(name string) slog.Handler {
	out := make([]slog.Handler, len(t.handlers))
	for i, h := range t.handlers {
		out[i] = h.WithGroup(name)
	}
	return tee{out}
}
