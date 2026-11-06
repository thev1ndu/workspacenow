package telemetry

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"
)

// OTLP/HTTP JSON payloads (https://opentelemetry.io/docs/specs/otlp/) decoded into the
// normalized model. Only the fields the observer stores are decoded.

type anyValue struct {
	StringValue *string  `json:"stringValue"`
	IntValue    *int64   `json:"intValue"`
	DoubleValue *float64 `json:"doubleValue"`
	BoolValue   *bool    `json:"boolValue"`
}

func (v anyValue) String() string {
	switch {
	case v.StringValue != nil:
		return *v.StringValue
	case v.IntValue != nil:
		return strconv.FormatInt(*v.IntValue, 10)
	case v.DoubleValue != nil:
		return strconv.FormatFloat(*v.DoubleValue, 'g', -1, 64)
	case v.BoolValue != nil:
		return strconv.FormatBool(*v.BoolValue)
	default:
		return ""
	}
}

type keyValue struct {
	Key   string   `json:"key"`
	Value anyValue `json:"value"`
}

func attributes(list []keyValue) map[string]string {
	if len(list) == 0 {
		return nil
	}
	out := make(map[string]string, len(list))
	for _, kv := range list {
		out[kv.Key] = kv.Value.String()
	}
	return out
}

func resourceService(attrs []keyValue) string {
	for _, kv := range attrs {
		if kv.Key == "service.name" {
			if s := kv.Value.String(); s != "" {
				return s
			}
		}
	}
	return "unknown"
}

func parseUnixNano(raw string) (time.Time, error) {
	if raw == "" {
		return time.Time{}, nil
	}
	ns, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid unix nano timestamp %q", raw)
	}
	return time.Unix(0, ns).UTC(), nil
}

var spanKinds = map[int32]string{
	0: "SPAN_KIND_UNSPECIFIED",
	1: "SPAN_KIND_INTERNAL",
	2: "SPAN_KIND_SERVER",
	3: "SPAN_KIND_CLIENT",
	4: "SPAN_KIND_PRODUCER",
	5: "SPAN_KIND_CONSUMER",
}

type otlpSpan struct {
	TraceID           string     `json:"traceId"`
	SpanID            string     `json:"spanId"`
	ParentSpanID      string     `json:"parentSpanId"`
	Name              string     `json:"name"`
	Kind              int32      `json:"kind"`
	StartTimeUnixNano string     `json:"startTimeUnixNano"`
	EndTimeUnixNano   string     `json:"endTimeUnixNano"`
	Attributes        []keyValue `json:"attributes"`
	Status            struct {
		Code int32 `json:"code"`
	} `json:"status"`
}

type otlpTraces struct {
	ResourceSpans []struct {
		Resource struct {
			Attributes []keyValue `json:"attributes"`
		} `json:"resource"`
		ScopeSpans []struct {
			Spans []otlpSpan `json:"spans"`
		} `json:"scopeSpans"`
	} `json:"resourceSpans"`
}

// ParseTraces decodes an OTLP/JSON traces payload into normalized spans.
func ParseTraces(data []byte) ([]Span, error) {
	var payload otlpTraces
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, fmt.Errorf("not valid OTLP JSON: %w", err)
	}
	var out []Span
	for _, rs := range payload.ResourceSpans {
		service := resourceService(rs.Resource.Attributes)
		for _, ss := range rs.ScopeSpans {
			for _, raw := range ss.Spans {
				start, err := parseUnixNano(raw.StartTimeUnixNano)
				if err != nil {
					return nil, err
				}
				end, err := parseUnixNano(raw.EndTimeUnixNano)
				if err != nil {
					return nil, err
				}
				kind, ok := spanKinds[raw.Kind]
				if !ok {
					kind = spanKinds[0]
				}
				out = append(out, Span{
					TraceID:      raw.TraceID,
					SpanID:       raw.SpanID,
					ParentSpanID: raw.ParentSpanID,
					Name:         raw.Name,
					Service:      service,
					Kind:         kind,
					Status:       strconv.Itoa(int(raw.Status.Code)),
					Start:        start,
					End:          end,
					DurationNs:   end.Sub(start).Nanoseconds(),
					Attributes:   attributes(raw.Attributes),
				})
			}
		}
	}
	return out, nil
}

type otlpLogRecord struct {
	TimeUnixNano   string     `json:"timeUnixNano"`
	SeverityText   string     `json:"severityText"`
	SeverityNumber int32      `json:"severityNumber"`
	Body           anyValue   `json:"body"`
	TraceID        string     `json:"traceId"`
	SpanID         string     `json:"spanId"`
	Attributes     []keyValue `json:"attributes"`
}

type otlpLogs struct {
	ResourceLogs []struct {
		Resource struct {
			Attributes []keyValue `json:"attributes"`
		} `json:"resource"`
		ScopeLogs []struct {
			LogRecords []otlpLogRecord `json:"logRecords"`
		} `json:"scopeLogs"`
	} `json:"resourceLogs"`
}

// ParseLogs decodes an OTLP/JSON logs payload into normalized log records.
func ParseLogs(data []byte) ([]LogRecord, error) {
	var payload otlpLogs
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, fmt.Errorf("not valid OTLP JSON: %w", err)
	}
	var out []LogRecord
	for _, rl := range payload.ResourceLogs {
		service := resourceService(rl.Resource.Attributes)
		for _, sl := range rl.ScopeLogs {
			for _, raw := range sl.LogRecords {
				ts, err := parseUnixNano(raw.TimeUnixNano)
				if err != nil {
					return nil, err
				}
				sev := raw.SeverityText
				if sev == "" {
					sev = "INFO"
				}
				out = append(out, LogRecord{
					Timestamp:      ts,
					Severity:       sev,
					SeverityNumber: raw.SeverityNumber,
					Body:           raw.Body.String(),
					Service:        service,
					TraceID:        raw.TraceID,
					SpanID:         raw.SpanID,
					Attributes:     attributes(raw.Attributes),
				})
			}
		}
	}
	return out, nil
}

type otlpDataPoint struct {
	TimeUnixNano string     `json:"timeUnixNano"`
	AsInt        *int64     `json:"asInt"`
	AsDouble     *float64   `json:"asDouble"`
	Count        *uint64    `json:"count"`
	Attributes   []keyValue `json:"attributes"`
}

func (dp otlpDataPoint) value() string {
	switch {
	case dp.AsInt != nil:
		return strconv.FormatInt(*dp.AsInt, 10)
	case dp.AsDouble != nil:
		return strconv.FormatFloat(*dp.AsDouble, 'g', -1, 64)
	case dp.Count != nil:
		return strconv.FormatUint(*dp.Count, 10)
	default:
		return ""
	}
}

type otlpMetric struct {
	Name  string `json:"name"`
	Gauge *struct {
		DataPoints []otlpDataPoint `json:"dataPoints"`
	} `json:"gauge"`
	Sum *struct {
		DataPoints []otlpDataPoint `json:"dataPoints"`
	} `json:"sum"`
	Histogram *struct {
		DataPoints []otlpDataPoint `json:"dataPoints"`
	} `json:"histogram"`
}

type otlpMetrics struct {
	ResourceMetrics []struct {
		Resource struct {
			Attributes []keyValue `json:"attributes"`
		} `json:"resource"`
		ScopeMetrics []struct {
			Metrics []otlpMetric `json:"metrics"`
		} `json:"scopeMetrics"`
	} `json:"resourceMetrics"`
}

// ParseMetrics decodes an OTLP/JSON metrics payload into normalized data points.
func ParseMetrics(data []byte) ([]MetricPoint, error) {
	var payload otlpMetrics
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, fmt.Errorf("not valid OTLP JSON: %w", err)
	}
	var out []MetricPoint
	for _, rm := range payload.ResourceMetrics {
		service := resourceService(rm.Resource.Attributes)
		for _, sm := range rm.ScopeMetrics {
			for _, m := range sm.Metrics {
				typeName, points := "gauge", []otlpDataPoint{}
				switch {
				case m.Gauge != nil:
					typeName, points = "gauge", m.Gauge.DataPoints
				case m.Sum != nil:
					typeName, points = "sum", m.Sum.DataPoints
				case m.Histogram != nil:
					typeName, points = "histogram", m.Histogram.DataPoints
				}
				for _, dp := range points {
					ts, err := parseUnixNano(dp.TimeUnixNano)
					if err != nil {
						return nil, err
					}
					out = append(out, MetricPoint{
						Name:       m.Name,
						Service:    service,
						Type:       typeName,
						Timestamp:  ts,
						Value:      dp.value(),
						Attributes: attributes(dp.Attributes),
					})
				}
			}
		}
	}
	return out, nil
}
