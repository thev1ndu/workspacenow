// Package telemetry models the OTLP signals and the Store interface that keeps them.
package telemetry

import (
	"context"
	"time"
)

// Span is one OTLP span, normalized for storage and querying.
type Span struct {
	TraceID      string            `json:"traceId"`
	SpanID       string            `json:"spanId"`
	ParentSpanID string            `json:"parentSpanId,omitempty"`
	Name         string            `json:"name"`
	Service      string            `json:"service"`
	Kind         string            `json:"kind"`   // SPAN_KIND_*
	Status       string            `json:"status"` // "0" unset, "1" ok, "2" error
	Start        time.Time         `json:"startTime"`
	End          time.Time         `json:"endTime"`
	DurationNs   int64             `json:"durationNs"`
	Attributes   map[string]string `json:"attributes,omitempty"`
}

// TraceOverview aggregates one trace's spans, like the console's trace list row.
type TraceOverview struct {
	TraceID      string    `json:"traceId"`
	RootSpanID   string    `json:"rootSpanId"`
	RootSpanName string    `json:"rootSpanName"`
	Service      string    `json:"service"`
	StartTime    time.Time `json:"startTime"`
	EndTime      time.Time `json:"endTime"`
	SpanCount    int       `json:"spanCount"`
}

// LogRecord is one OTLP log record.
type LogRecord struct {
	Timestamp      time.Time         `json:"timestamp"`
	Severity       string            `json:"severity"`
	SeverityNumber int32             `json:"severityNumber"`
	Body           string            `json:"body"`
	Service        string            `json:"service"`
	TraceID        string            `json:"traceId,omitempty"`
	SpanID         string            `json:"spanId,omitempty"`
	Attributes     map[string]string `json:"attributes,omitempty"`
}

// MetricPoint is one OTLP metric data point (gauge, sum or histogram count).
type MetricPoint struct {
	Name       string            `json:"name"`
	Service    string            `json:"service"`
	Type       string            `json:"type"` // gauge, sum, histogram
	Timestamp  time.Time         `json:"timestamp"`
	Value      string            `json:"value"`
	Attributes map[string]string `json:"attributes,omitempty"`
}

// LogFilter is one logs query: exact match on service, level and trace id, a case-insensitive
// substring on the body, an inclusive time range, sort order and a page.
type LogFilter struct {
	Service string
	Level   string
	Q       string
	TraceID string
	Start   time.Time
	End     time.Time
	Limit   int
	Offset  int
	Desc    bool
}

// Store keeps every telemetry signal durably — no database, no in-memory payload. The
// reference implementation (walstore) appends JSONL segment files; queries scan at most
// the newest ScanLimit records per signal.
type Store interface {
	AddSpans(ctx context.Context, spans []Span) error
	AddLogs(ctx context.Context, logs []LogRecord) error
	AddMetrics(ctx context.Context, points []MetricPoint) error
	ListTraces(ctx context.Context, service string, start, end time.Time, limit, offset int, desc bool) ([]TraceOverview, int, error)
	Spans(ctx context.Context, traceID, service string, limit int, asc bool) ([]Span, int, error)
	GetSpan(ctx context.Context, traceID, spanID string) (Span, bool, error)
	ListLogs(ctx context.Context, f LogFilter) ([]LogRecord, int, error)
	ListMetrics(ctx context.Context, service, name string, start, end time.Time, limit, offset int, desc bool) ([]MetricPoint, int, error)
	Overview(ctx context.Context) (services []string, spans, logs, metrics int, err error)
	Close() error
}
