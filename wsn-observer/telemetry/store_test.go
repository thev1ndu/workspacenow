package telemetry

import (
	"testing"
	"time"
)

func at(ns int64) time.Time { return time.Unix(0, ns).UTC() }

func sampleSpans() []Span {
	return []Span{
		{TraceID: "t1", SpanID: "a", Name: "root", Service: "wsn-service", Start: at(1000), End: at(5000)},
		{TraceID: "t1", SpanID: "b", ParentSpanID: "a", Name: "child", Service: "wsn-service", Start: at(2000), End: at(4000)},
		{TraceID: "t2", SpanID: "c", Name: "other", Service: "wsn-ai-service", Start: at(3000), End: at(3500)},
	}
}

func TestRetentionTrimsOldest(t *testing.T) {
	s := NewStore(2)
	s.AddSpans(sampleSpans()) // keeps the last two spans: b (t1) and c (t2); a is trimmed
	spans, total := s.Spans("t1", "", 100, true)
	if total != 1 || spans[0].SpanID != "b" {
		t.Fatalf("oldest span a must be trimmed, leaving b: %+v total=%d", spans, total)
	}
	spans, total = s.Spans("t2", "", 100, true)
	if total != 1 || spans[0].SpanID != "c" {
		t.Fatalf("newest span survives: %+v", spans)
	}
}

func TestNewStoreClampsRetention(t *testing.T) {
	s := NewStore(0) // clamps to 1: only the last span survives
	s.AddSpans(sampleSpans())
	if _, total := s.Spans("t1", "", 100, true); total != 0 {
		t.Fatalf("retention 1 keeps only the last span, t1 total=%d", total)
	}
	if spans, total := s.Spans("t2", "", 100, true); total != 1 || spans[0].SpanID != "c" {
		t.Fatalf("retention must clamp to 1: %+v total=%d", spans, total)
	}
}

func TestListTracesGroupsFiltersSortsPaginates(t *testing.T) {
	s := NewStore(100)
	s.AddSpans(sampleSpans())

	all, total := s.ListTraces("", time.Time{}, time.Time{}, 50, 0, true)
	if total != 2 || all[0].TraceID != "t2" || all[1].TraceID != "t1" {
		t.Fatalf("desc order by start: %+v", all)
	}
	t1 := all[1]
	if t1.RootSpanID != "a" || t1.RootSpanName != "root" || t1.SpanCount != 2 ||
		!t1.StartTime.Equal(at(1000)) || !t1.EndTime.Equal(at(5000)) {
		t.Fatalf("bad overview: %+v", t1)
	}

	filtered, total := s.ListTraces("wsn-ai-service", time.Time{}, time.Time{}, 50, 0, false)
	if total != 1 || filtered[0].TraceID != "t2" {
		t.Fatalf("service filter: %+v", filtered)
	}

	windowed, total := s.ListTraces("", at(2500), time.Time{}, 50, 0, true)
	if total != 1 || windowed[0].TraceID != "t2" {
		t.Fatalf("time window keeps only t2 (starts at 3000): %+v total=%d", windowed, total)
	}

	paged, total := s.ListTraces("", time.Time{}, time.Time{}, 1, 1, true)
	if total != 2 || len(paged) != 1 || paged[0].TraceID != "t1" {
		t.Fatalf("limit/offset page: %+v total=%d", paged, total)
	}
	if empty := page(all, 50, 99); len(empty) != 0 {
		t.Fatalf("offset past the end must be empty: %+v", empty)
	}
}

func TestSpansFiltersAndLimits(t *testing.T) {
	s := NewStore(100)
	s.AddSpans(sampleSpans())
	spans, total := s.Spans("t1", "wsn-service", 1, true)
	if total != 2 || len(spans) != 1 || spans[0].SpanID != "a" {
		t.Fatalf("asc limit 1: %+v total=%d", spans, total)
	}
	if _, total := s.Spans("t1", "wsn-ai-service", 100, true); total != 0 {
		t.Fatal("service filter must exclude t1 for wsn-ai-service")
	}
	desc, _ := s.Spans("t1", "", 100, false)
	if desc[0].SpanID != "b" {
		t.Fatalf("desc order: %+v", desc)
	}
}

func TestListLogsFilters(t *testing.T) {
	s := NewStore(100)
	s.AddLogs([]LogRecord{
		{Timestamp: at(1000), Severity: "INFO", Body: "started", Service: "wsn-service"},
		{Timestamp: at(2000), Severity: "ERROR", Body: "Sale failed", Service: "wsn-service", TraceID: "t1"},
		{Timestamp: at(3000), Severity: "info", Body: "note", Service: "wsn-ai-service"},
	})
	all, total := s.ListLogs("", "", "", time.Time{}, time.Time{}, 50, 0, true)
	if total != 3 || all[0].Timestamp != at(3000) {
		t.Fatalf("desc all: %+v", all)
	}
	byLevel, _ := s.ListLogs("", "error", "", time.Time{}, time.Time{}, 50, 0, true)
	if len(byLevel) != 1 || byLevel[0].Body != "Sale failed" {
		t.Fatalf("level filter is case-insensitive: %+v", byLevel)
	}
	byQ, total := s.ListLogs("", "", "sale", time.Time{}, time.Time{}, 50, 0, true)
	if total != 1 || byQ[0].Severity != "ERROR" {
		t.Fatalf("q matches body case-insensitively: %+v", byQ)
	}
	bySvc, _ := s.ListLogs("wsn-ai-service", "", "", time.Time{}, time.Time{}, 50, 0, false)
	if len(bySvc) != 1 || bySvc[0].Severity != "info" {
		t.Fatalf("service filter: %+v", bySvc)
	}
	byTime, total := s.ListLogs("", "", "", at(1500), at(2500), 50, 0, true)
	if total != 1 || byTime[0].Timestamp != at(2000) {
		t.Fatalf("time range: %+v", byTime)
	}
	asc, _ := s.ListLogs("", "", "", time.Time{}, time.Time{}, 2, 1, false)
	if len(asc) != 2 || asc[0].Timestamp != at(2000) || asc[1].Timestamp != at(3000) {
		t.Fatalf("asc page offset 1 limit 2 over 3 logs: %+v", asc)
	}
}

func TestListMetricsFilters(t *testing.T) {
	s := NewStore(100)
	s.AddMetrics([]MetricPoint{
		{Name: "requests", Service: "wsn-service", Type: "sum", Timestamp: at(1000), Value: "1"},
		{Name: "requests", Service: "wsn-service", Type: "sum", Timestamp: at(2000), Value: "2"},
		{Name: "depth", Service: "wsn-ai-service", Type: "gauge", Timestamp: at(3000), Value: "3"},
	})
	byName, total := s.ListMetrics("", "requests", time.Time{}, time.Time{}, 50, 0, true)
	if total != 2 || byName[0].Value != "2" {
		t.Fatalf("name filter desc: %+v", byName)
	}
	bySvc, total := s.ListMetrics("wsn-ai-service", "", time.Time{}, time.Time{}, 50, 0, true)
	if total != 1 || bySvc[0].Name != "depth" {
		t.Fatalf("service filter: %+v", bySvc)
	}
	byTime, total := s.ListMetrics("", "", at(2500), time.Time{}, 50, 0, true)
	if total != 1 || byTime[0].Value != "3" {
		t.Fatalf("time filter: %+v", byTime)
	}
	paged, total := s.ListMetrics("", "", time.Time{}, time.Time{}, 1, 2, true)
	if total != 3 || len(paged) != 1 || paged[0].Value != "1" {
		t.Fatalf("page: %+v total=%d", paged, total)
	}
}

func TestRetentionTrimsLogsAndMetrics(t *testing.T) {
	s := NewStore(2)
	s.AddLogs([]LogRecord{{Body: "1", Timestamp: at(1)}, {Body: "2", Timestamp: at(2)}, {Body: "3", Timestamp: at(3)}})
	s.AddMetrics([]MetricPoint{{Name: "m", Timestamp: at(1)}, {Name: "m", Timestamp: at(2)}, {Name: "m", Timestamp: at(3)}})
	logs, total := s.ListLogs("", "", "", time.Time{}, time.Time{}, 50, 0, false)
	if total != 2 || logs[0].Body != "2" || logs[1].Body != "3" {
		t.Fatalf("logs trimmed to the newest two: %+v", logs)
	}
	metrics, total := s.ListMetrics("", "", time.Time{}, time.Time{}, 50, 0, false)
	if total != 2 || metrics[0].Timestamp != at(2) {
		t.Fatalf("metrics trimmed to the newest two: %+v", metrics)
	}
}

func TestOverview(t *testing.T) {
	s := NewStore(100)
	s.AddSpans(sampleSpans())
	s.AddLogs([]LogRecord{{Service: "wsn-ai-service", Timestamp: at(1), Severity: "INFO", Body: "x"}})
	s.AddMetrics([]MetricPoint{{Service: "console", Name: "m", Timestamp: at(1)}})
	services, spans, logs, metrics := s.Overview()
	if len(services) != 3 || services[0] != "console" || services[1] != "wsn-ai-service" || services[2] != "wsn-service" {
		t.Fatalf("services sorted: %+v", services)
	}
	if spans != 3 || logs != 1 || metrics != 1 {
		t.Fatalf("counts: spans=%d logs=%d metrics=%d", spans, logs, metrics)
	}
}
