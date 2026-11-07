package walstore

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-observer/telemetry"
)

func at(ns int64) time.Time { return time.Unix(0, ns).UTC() }

func open(t *testing.T, dir string, retention, segment int64, scanCap int) *Store {
	t.Helper()
	s, err := Open(dir, retention, segment, scanCap)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	return s
}

func sampleSpans() []telemetry.Span {
	return []telemetry.Span{
		{TraceID: "t1", SpanID: "a", Name: "root", Service: "wsn-service", Kind: "SPAN_KIND_SERVER", Status: "1", Start: at(1000), End: at(5000), Attributes: map[string]string{"http.method": "GET"}},
		{TraceID: "t1", SpanID: "b", ParentSpanID: "a", Name: "child", Service: "wsn-service", Start: at(2000), End: at(4000)},
		{TraceID: "t2", SpanID: "c", Name: "other", Service: "wsn-ai-service", Start: at(3000), End: at(3500)},
	}
}

func sampleLogs() []telemetry.LogRecord {
	return []telemetry.LogRecord{
		{Timestamp: at(1000), Severity: "INFO", SeverityNumber: 9, Body: "started", Service: "wsn-service"},
		{Timestamp: at(2000), Severity: "ERROR", SeverityNumber: 17, Body: "Sale failed", Service: "wsn-service", TraceID: "t1", SpanID: "a"},
		{Timestamp: at(3000), Severity: "info", SeverityNumber: 9, Body: "note", Service: "wsn-ai-service"},
	}
}

func sampleMetrics() []telemetry.MetricPoint {
	return []telemetry.MetricPoint{
		{Name: "requests", Service: "wsn-service", Type: "sum", Timestamp: at(1000), Value: "1"},
		{Name: "requests", Service: "wsn-service", Type: "sum", Timestamp: at(2000), Value: "2"},
		{Name: "depth", Service: "wsn-ai-service", Type: "gauge", Timestamp: at(3000), Value: "3"},
	}
}

func TestOpenRejectsBadParams(t *testing.T) {
	dir := t.TempDir()
	for _, args := range [][3]int64{{0, 100, 10}, {100, 0, 10}, {100, 100, 0}} {
		if _, err := Open(dir, args[0], args[1], int(args[2])); err == nil {
			t.Fatalf("Open(%v) must fail", args)
		}
	}
}

func TestRoundTripAllSignals(t *testing.T) {
	s := open(t, t.TempDir(), 1<<20, 1<<16, 1000)
	ctx := context.Background()
	if err := s.AddSpans(ctx, sampleSpans()); err != nil {
		t.Fatal(err)
	}
	if err := s.AddLogs(ctx, sampleLogs()); err != nil {
		t.Fatal(err)
	}
	if err := s.AddMetrics(ctx, sampleMetrics()); err != nil {
		t.Fatal(err)
	}
	if err := s.AddSpans(ctx, nil); err != nil { // empty batch is a no-op
		t.Fatal(err)
	}

	traces, total, err := s.ListTraces(ctx, "", time.Time{}, time.Time{}, 50, 0, true)
	if err != nil || total != 2 || traces[0].TraceID != "t2" || traces[1].SpanCount != 2 || traces[1].RootSpanName != "root" {
		t.Fatalf("traces: %v %d %v", traces, total, err)
	}
	t1, _, err := s.ListTraces(ctx, "wsn-service", time.Time{}, time.Time{}, 50, 0, false)
	if err != nil || len(t1) != 1 || t1[0].TraceID != "t1" || t1[0].SpanCount != 2 || t1[0].RootSpanName != "root" || !t1[0].StartTime.Equal(at(1000)) {
		t.Fatalf("filtered traces: %v %v", t1, err)
	}

	spans, total, err := s.Spans(ctx, "t1", "", 1, true)
	if err != nil || total != 2 || len(spans) != 1 || spans[0].SpanID != "a" {
		t.Fatalf("spans asc limit 1: %v %d %v", spans, total, err)
	}
	span, ok, err := s.GetSpan(ctx, "t1", "a")
	if err != nil || !ok || span.Name != "root" || span.Attributes["http.method"] != "GET" {
		t.Fatalf("get span: %v %v %v", span, ok, err)
	}
	if _, ok, err := s.GetSpan(ctx, "t1", "zz"); err != nil || ok {
		t.Fatalf("missing span: %v %v", ok, err)
	}

	logs, total, err := s.ListLogs(ctx, telemetry.LogFilter{Limit: 50, Desc: true})
	if err != nil || total != 3 || logs[0].Body != "note" {
		t.Fatalf("logs desc: %v %d %v", logs, total, err)
	}
	byLevel, total, _ := s.ListLogs(ctx, telemetry.LogFilter{Level: "error", Limit: 50, Desc: true})
	if total != 1 || byLevel[0].Body != "Sale failed" {
		t.Fatalf("level filter: %v %d", byLevel, total)
	}
	byQ, total, _ := s.ListLogs(ctx, telemetry.LogFilter{Q: "sale", Limit: 50})
	if total != 1 || byQ[0].Severity != "ERROR" {
		t.Fatalf("q filter: %v %d", byQ, total)
	}
	byTrace, total, _ := s.ListLogs(ctx, telemetry.LogFilter{TraceID: "t1", Limit: 50})
	if total != 1 || byTrace[0].SpanID != "a" {
		t.Fatalf("trace filter: %v %d", byTrace, total)
	}
	byTime, total, _ := s.ListLogs(ctx, telemetry.LogFilter{Start: at(1500), End: at(2500), Limit: 50})
	if total != 1 || byTime[0].Timestamp != at(2000) {
		t.Fatalf("time range inclusive: %v %d", byTime, total)
	}
	asc, total, _ := s.ListLogs(ctx, telemetry.LogFilter{Limit: 2, Offset: 1, Desc: false})
	if total != 3 || len(asc) != 2 || asc[0].Timestamp != at(2000) {
		t.Fatalf("asc page: %v %d", asc, total)
	}

	metrics, total, err := s.ListMetrics(ctx, "", "requests", time.Time{}, time.Time{}, 50, 0, true)
	if err != nil || total != 2 || metrics[0].Value != "2" {
		t.Fatalf("metrics: %v %d %v", metrics, total, err)
	}
	bySvc, _, _ := s.ListMetrics(ctx, "wsn-ai-service", "", time.Time{}, time.Time{}, 50, 0, true)
	if len(bySvc) != 1 || bySvc[0].Name != "depth" {
		t.Fatalf("service filter: %v", bySvc)
	}

	svcs, nSpans, nLogs, nMetrics, err := s.Overview(ctx)
	if err != nil || nSpans != 3 || nLogs != 3 || nMetrics != 3 {
		t.Fatalf("overview counts: %d %d %d %v", nSpans, nLogs, nMetrics, err)
	}
	if len(svcs) != 2 || svcs[0] != "wsn-ai-service" || svcs[1] != "wsn-service" {
		t.Fatalf("services: %v", svcs)
	}
}

func TestSegmentsRotateAndPersistAcrossReopen(t *testing.T) {
	dir := t.TempDir()
	s := open(t, dir, 1<<20, 200, 1000) // tiny segments force rotation
	ctx := context.Background()
	for i := 0; i < 20; i++ {
		if err := s.AddLogs(ctx, []telemetry.LogRecord{{Timestamp: at(int64(i)), Severity: "INFO", Body: fmt.Sprintf("line-%d", i), Service: "svc"}}); err != nil {
			t.Fatal(err)
		}
	}
	names, _ := segmentNames(filepath.Join(dir, SignalLogs))
	if len(names) < 2 {
		t.Fatalf("expected rotation into multiple segments, got %v", names)
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}

	// Reopen: data, counts and service names survive; appends continue in a new segment.
	s2 := open(t, dir, 1<<20, 200, 1000)
	logs, total, err := s2.ListLogs(ctx, telemetry.LogFilter{Limit: 100, Desc: true})
	if err != nil || total != 20 || logs[0].Body != "line-19" {
		t.Fatalf("after reopen: total=%d first=%v err=%v", total, logs[0], err)
	}
	if err := s2.AddLogs(ctx, []telemetry.LogRecord{{Timestamp: at(999), Severity: "INFO", Body: "after-reopen", Service: "svc"}}); err != nil {
		t.Fatal(err)
	}
	_, total, err = s2.ListLogs(ctx, telemetry.LogFilter{Limit: 100})
	if err != nil || total != 21 {
		t.Fatalf("after reopen + append: total=%d err=%v", total, err)
	}
	svcs, _, nLogs, _, _ := s2.Overview(ctx)
	if nLogs != 21 || len(svcs) != 1 || svcs[0] != "svc" {
		t.Fatalf("overview after reopen: %v %d", svcs, nLogs)
	}
}

func TestRetentionPrunesOldestSegments(t *testing.T) {
	dir := t.TempDir()
	s := open(t, dir, 1<<20, 100, 1000)
	ctx := context.Background()
	for i := 0; i < 30; i++ { // each record ~40 bytes; 30 records with 100-byte segments roll often
		if err := s.AddLogs(ctx, []telemetry.LogRecord{{Timestamp: at(int64(i)), Severity: "INFO", Body: strings.Repeat("x", 30), Service: "svc"}}); err != nil {
			t.Fatal(err)
		}
	}
	s.pruneAll()
	names, _ := segmentNames(filepath.Join(dir, SignalLogs))
	total := int64(0)
	for _, n := range names {
		info, _ := os.Stat(filepath.Join(dir, SignalLogs, n))
		total += info.Size()
	}
	// Non-active segments must fit the retention budget (active segment is never pruned).
	s.mu.Lock()
	activeSeq := s.segs[SignalLogs].seq
	s.mu.Unlock()
	kept := int64(0)
	for _, n := range names {
		var seq int
		_, _ = fmt.Sscanf(n, "%020d.seg", &seq)
		if seq == activeSeq {
			continue
		}
		info, _ := os.Stat(filepath.Join(dir, SignalLogs, n))
		kept += info.Size()
	}
	if kept > s.retention {
		t.Fatalf("retention: kept %d bytes over budget %d (segments %v, active %d)", kept, s.retention, names, activeSeq)
	}
	_ = total
}

func TestScanCapLimitsNewestFirst(t *testing.T) {
	dir := t.TempDir()
	s := open(t, dir, 1<<20, 1<<16, 5) // scan only the newest 5 records
	ctx := context.Background()
	for i := 0; i < 10; i++ {
		if err := s.AddLogs(ctx, []telemetry.LogRecord{{Timestamp: at(int64(i)), Severity: "INFO", Body: fmt.Sprintf("line-%d", i), Service: "svc"}}); err != nil {
			t.Fatal(err)
		}
	}
	logs, total, err := s.ListLogs(ctx, telemetry.LogFilter{Limit: 100, Desc: true})
	if err != nil || total != 5 || logs[0].Body != "line-9" || logs[4].Body != "line-5" {
		t.Fatalf("scan cap: total=%d first=%v last=%v err=%v", total, logs[0].Body, logs[4].Body, err)
	}
}

func TestClosedStoreFails(t *testing.T) {
	s := open(t, t.TempDir(), 1<<20, 1<<16, 100)
	ctx := context.Background()
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	if err := s.Close(); err != nil { // idempotent
		t.Fatal(err)
	}
	if err := s.AddLogs(ctx, sampleLogs()); err == nil {
		t.Fatal("append on closed store must fail")
	}
	if _, _, err := s.ListLogs(ctx, telemetry.LogFilter{Limit: 10}); err == nil {
		t.Fatal("query on closed store must fail")
	}
	if _, _, _, _, err := s.Overview(ctx); err == nil {
		t.Fatal("overview on closed store must fail")
	}
}

func TestSealedSegmentsReplicateToStandby(t *testing.T) {
	var mu sync.Mutex
	var gotSignal, gotSeq string
	var gotBody []byte
	replica := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		gotSignal, gotSeq, gotBody = r.URL.Query().Get("signal"), r.URL.Query().Get("seq"), body
		mu.Unlock()
		w.WriteHeader(http.StatusAccepted)
	}))
	defer replica.Close()

	s := open(t, t.TempDir(), 16<<20, 1<<10, 10000) // tiny segments force rolls
	s.SetReplicator(replica.URL, "", replica.Client())
	for i := 0; i < 50; i++ {
		if err := s.AddSpans(context.Background(), []telemetry.Span{{TraceID: "t", SpanID: "s", Name: "n", Service: "svc", Kind: "SPAN_KIND_SERVER", Status: "1", Start: time.Now(), End: time.Now(), DurationNs: 1}}); err != nil {
			t.Fatal(err)
		}
	}
	_ = s.Close()
	if gotSignal != "traces" || gotSeq == "" || len(gotBody) == 0 {
		t.Fatalf("replica got signal=%q seq=%q bytes=%d", gotSignal, gotSeq, len(gotBody))
	}
}

func TestImportSegmentWritesAndCounts(t *testing.T) {
	s := open(t, t.TempDir(), 16<<20, 1<<16, 10000)
	defer func() { _ = s.Close() }()
	data := []byte(`{"traceId":"t1"}` + "\n" + `{"traceId":"t2"}` + "\n")
	if err := s.ImportSegment("traces", 7, data); err != nil {
		t.Fatal(err)
	}
	if err := s.ImportSegment("traces", 7, data); err != nil {
		t.Fatal("duplicate import must be a no-op, not an error:", err)
	}
	overviews, total, err := s.ListTraces(context.Background(), "", time.Time{}, time.Now(), 10, 0, false)
	_ = overviews
	if err != nil || total != 2 {
		t.Fatalf("total=%d err=%v", total, err)
	}
}
