package telemetry

import (
	"testing"
	"time"
)

const tracesPayload = `{
  "resourceSpans": [
    {
      "resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "wsn-service"}}]},
      "scopeSpans": [
        {"spans": [
          {"traceId": "aaaa", "spanId": "s1", "name": "root", "kind": 2,
           "startTimeUnixNano": "1000000000", "endTimeUnixNano": "3000000000",
           "status": {"code": 1},
           "attributes": [{"key": "http.status_code", "value": {"intValue": 200}},
                          {"key": "ratio", "value": {"doubleValue": 0.5}},
                          {"key": "ok", "value": {"boolValue": true}}]},
          {"traceId": "aaaa", "spanId": "s2", "parentSpanId": "s1", "name": "child", "kind": 99,
           "startTimeUnixNano": "1500000000", "endTimeUnixNano": "2500000000", "status": {"code": 2}}
        ]}
      ]
    },
    {
      "resource": {"attributes": []},
      "scopeSpans": [{"spans": [{"traceId": "bbbb", "spanId": "s3", "name": "other"}]}]
    }
  ]
}`

func TestParseTraces(t *testing.T) {
	spans, err := ParseTraces([]byte(tracesPayload))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(spans) != 3 {
		t.Fatalf("want 3 spans, got %d", len(spans))
	}
	root := spans[0]
	if root.Service != "wsn-service" || root.Kind != "SPAN_KIND_SERVER" || root.Status != "1" {
		t.Fatalf("unexpected root span: %+v", root)
	}
	if root.Start != time.Unix(0, 1_000_000_000).UTC() || root.DurationNs != 2_000_000_000 {
		t.Fatalf("bad times: %+v", root)
	}
	if root.Attributes["http.status_code"] != "200" || root.Attributes["ratio"] != "0.5" || root.Attributes["ok"] != "true" {
		t.Fatalf("bad attributes: %+v", root.Attributes)
	}
	child := spans[1]
	if child.ParentSpanID != "s1" || child.Kind != "SPAN_KIND_UNSPECIFIED" || child.Status != "2" {
		t.Fatalf("unexpected child span: %+v", child)
	}
	if spans[2].Service != "unknown" || !spans[2].Start.IsZero() {
		t.Fatalf("missing service.name defaults to unknown, empty time to zero: %+v", spans[2])
	}
}

func TestParseTracesRejectsBadJSONAndBadTimestamps(t *testing.T) {
	if _, err := ParseTraces([]byte("{nope")); err == nil {
		t.Fatal("expected a JSON error")
	}
	bad := `{"resourceSpans":[{"scopeSpans":[{"spans":[{"traceId":"x","spanId":"y","startTimeUnixNano":"soon"}]}]}]}`
	if _, err := ParseTraces([]byte(bad)); err == nil {
		t.Fatal("expected a timestamp error")
	}
}

const logsPayload = `{
  "resourceLogs": [
    {"resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "wsn-ai-service"}}]},
     "scopeLogs": [{"logRecords": [
       {"timeUnixNano": "5000000000", "severityText": "ERROR", "severityNumber": 17,
        "body": {"stringValue": "run failed"}, "traceId": "aaaa", "spanId": "s2",
        "attributes": [{"key": "run.id", "value": {"stringValue": "run-1"}}]},
       {"body": {"intValue": 7}}
     ]}]}
  ]
}`

func TestParseLogs(t *testing.T) {
	logs, err := ParseLogs([]byte(logsPayload))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(logs) != 2 {
		t.Fatalf("want 2 logs, got %d", len(logs))
	}
	first := logs[0]
	if first.Service != "wsn-ai-service" || first.Severity != "ERROR" || first.SeverityNumber != 17 ||
		first.Body != "run failed" || first.TraceID != "aaaa" || first.SpanID != "s2" ||
		first.Timestamp != time.Unix(0, 5_000_000_000).UTC() || first.Attributes["run.id"] != "run-1" {
		t.Fatalf("unexpected log: %+v", first)
	}
	second := logs[1]
	if second.Severity != "INFO" || second.Body != "7" || second.Service != "wsn-ai-service" {
		t.Fatalf("defaults missing: %+v", second)
	}
}

func TestParseTracesRejectsBadEndTime(t *testing.T) {
	bad := `{"resourceSpans":[{"scopeSpans":[{"spans":[{"traceId":"x","spanId":"y","startTimeUnixNano":"1","endTimeUnixNano":"later"}]}]}]}`
	if _, err := ParseTraces([]byte(bad)); err == nil {
		t.Fatal("expected an end-time error")
	}
}

func TestParseLogsEmptyBodyAndEmptyAttributeValue(t *testing.T) {
	payload := `{"resourceLogs":[{"scopeLogs":[{"logRecords":[
		{"body": {}, "attributes": [{"key": "k", "value": {}}]}
	]}]}]}`
	logs, err := ParseLogs([]byte(payload))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if logs[0].Body != "" || logs[0].Service != "unknown" || logs[0].Attributes["k"] != "" {
		t.Fatalf("empty values render as empty strings: %+v", logs[0])
	}
}

func TestParseLogsRejectsBadPayload(t *testing.T) {
	if _, err := ParseLogs([]byte("nope")); err == nil {
		t.Fatal("expected an error")
	}
	bad := `{"resourceLogs":[{"scopeLogs":[{"logRecords":[{"timeUnixNano":"later"}]}]}]}`
	if _, err := ParseLogs([]byte(bad)); err == nil {
		t.Fatal("expected a timestamp error")
	}
}

const metricsPayload = `{
  "resourceMetrics": [
    {"resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "wsn-service"}}]},
     "scopeMetrics": [{"metrics": [
       {"name": "http_requests_total", "sum": {"dataPoints": [
         {"timeUnixNano": "1000000000", "asInt": 5, "attributes": [{"key": "route", "value": {"stringValue": "/api/v1/session"}}]}]}},
       {"name": "queue_depth", "gauge": {"dataPoints": [{"timeUnixNano": "2000000000", "asDouble": 1.5}]}},
       {"name": "latency", "histogram": {"dataPoints": [{"timeUnixNano": "3000000000", "count": 9, "sum": 42.0}]}}
     ]}]}
  ]
}`

func TestParseMetrics(t *testing.T) {
	points, err := ParseMetrics([]byte(metricsPayload))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(points) != 3 {
		t.Fatalf("want 3 points, got %d", len(points))
	}
	if points[0].Type != "sum" || points[0].Value != "5" || points[0].Name != "http_requests_total" ||
		points[0].Attributes["route"] != "/api/v1/session" {
		t.Fatalf("bad sum point: %+v", points[0])
	}
	if points[1].Type != "gauge" || points[1].Value != "1.5" {
		t.Fatalf("bad gauge point: %+v", points[1])
	}
	if points[2].Type != "histogram" || points[2].Value != "9" {
		t.Fatalf("bad histogram point: %+v", points[2])
	}
	for _, p := range points {
		if p.Service != "wsn-service" {
			t.Fatalf("service not picked up: %+v", p)
		}
	}
}

func TestParseMetricsEdgeCases(t *testing.T) {
	if _, err := ParseMetrics([]byte("nope")); err == nil {
		t.Fatal("expected an error")
	}
	bad := `{"resourceMetrics":[{"scopeMetrics":[{"metrics":[{"name":"m","gauge":{"dataPoints":[{"timeUnixNano":"x"}]}}]}]}]}`
	if _, err := ParseMetrics([]byte(bad)); err == nil {
		t.Fatal("expected a timestamp error")
	}
	// A metric with no recognized type still yields zero points but no error.
	points, err := ParseMetrics([]byte(`{"resourceMetrics":[{"scopeMetrics":[{"metrics":[{"name":"empty"}]}]}]}`))
	if err != nil || len(points) != 0 {
		t.Fatalf("empty metric: points=%d err=%v", len(points), err)
	}
	// A data point with no value renders as an empty string.
	points, err = ParseMetrics([]byte(`{"resourceMetrics":[{"scopeMetrics":[{"metrics":[{"name":"m","gauge":{"dataPoints":[{"timeUnixNano":"1"}]}}]}]}]}`))
	if err != nil || len(points) != 1 || points[0].Value != "" {
		t.Fatalf("empty value: %+v err=%v", points, err)
	}
}
