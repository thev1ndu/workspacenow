// Package telemetry models OTLP signals and keeps them in bounded memory.
package telemetry

import "time"

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
