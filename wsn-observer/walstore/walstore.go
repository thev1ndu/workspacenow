// Package walstore stores every OTLP signal (traces, logs, metrics) as append-only JSONL
// segment files under a data directory — a write-ahead-log store built for high ingestion,
// with no database: one sequential write per batch, retention by bytes, tail-capped scans.
package walstore

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	neturl "net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-observer/telemetry"
)

const (
	// Signal names double as subdirectory names.
	SignalTraces  = "traces"
	SignalLogs    = "logs"
	SignalMetrics = "metrics"
	segExt        = ".seg"
	pruneInterval = time.Hour
	maxLineBytes  = 4 << 20 // 4 MiB per JSONL record
)

type segment struct {
	file *os.File
	seq  int
	size int64
	path string
}

// segIndex summarizes one segment so query totals can be answered without scanning payloads.
// MinUnix/MaxUnix are the segment's record-time bounds in unix nanos (0 = unknown); Services
// holds per-service record counts (nil = unknown).
type segIndex struct {
	Count    int            `json:"count"`
	MinUnix  int64          `json:"minUnix,omitempty"`
	MaxUnix  int64          `json:"maxUnix,omitempty"`
	Services map[string]int `json:"services,omitempty"`
}

// Store is the segment-file telemetry.Store.
type Store struct {
	dir          string
	retention    int64 // max bytes kept per signal; oldest segments are deleted past it
	segmentBytes int64 // roll the active segment past this size
	scanCap      int   // max records a query scans, newest first

	mu       sync.Mutex // guards segments, counters, indexes and the services set
	segs     map[string]*segment
	counts   map[string]*atomic.Int64
	services map[string]struct{}
	idx      map[string]map[int]*segIndex // signal -> seq -> index (sealed segments + active)
	active   map[string]*segIndex         // accumulating index of the active segment per signal

	stop chan struct{}
	wg   sync.WaitGroup

	replicaURL string // sealed segments are POSTed here when set
	replicaTok string
	hc         *http.Client
	once       sync.Once
	closed     atomic.Bool
}

// Open recovers existing segments under dir, prunes past retention and starts the janitor.
func Open(dir string, retentionBytes, segmentBytes int64, scanCap int) (*Store, error) {
	if retentionBytes < 1 {
		return nil, fmt.Errorf("retentionBytes must be positive")
	}
	if segmentBytes < 1 {
		return nil, fmt.Errorf("segmentBytes must be positive")
	}
	if scanCap < 1 {
		return nil, fmt.Errorf("scanCap must be positive")
	}
	s := &Store{
		dir:          dir,
		retention:    retentionBytes,
		segmentBytes: segmentBytes,
		scanCap:      scanCap,
		segs:         map[string]*segment{},
		counts:       map[string]*atomic.Int64{},
		services:     map[string]struct{}{},
		idx:          map[string]map[int]*segIndex{},
		active:       map[string]*segIndex{},
		stop:         make(chan struct{}),
	}
	for _, sig := range []string{SignalTraces, SignalLogs, SignalMetrics} {
		if err := s.recover(sig); err != nil {
			return nil, err
		}
	}
	s.pruneAll()
	s.wg.Add(1)
	go s.janitor()
	return s, nil
}

// recover opens the newest segment of a signal for appending and counts existing records.
func (s *Store) recover(sig string) error {
	dir := filepath.Join(s.dir, sig)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create %s: %w", dir, err)
	}
	names, err := segmentNames(dir)
	if err != nil {
		return err
	}
	count := &atomic.Int64{}
	s.counts[sig] = count
	var seg *segment
	if len(names) == 0 {
		seg, err = s.newSegment(sig, 0)
		if err != nil {
			return err
		}
	} else {
		last := names[len(names)-1]
		seq, err := strconv.Atoi(strings.TrimSuffix(last, segExt))
		if err != nil {
			return fmt.Errorf("bad segment name %s: %w", last, err)
		}
		path := filepath.Join(dir, last)
		f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
		if err != nil {
			return fmt.Errorf("open %s: %w", path, err)
		}
		info, err := f.Stat()
		if err != nil {
			_ = f.Close()
			return fmt.Errorf("stat %s: %w", path, err)
		}
		seg = &segment{file: f, seq: seq, size: info.Size()}
	}
	s.segs[sig] = seg
	// One startup pass indexes every segment (count, time bounds, per-service counts) so
	// query totals do not depend on the scan window.
	s.idx[sig] = map[int]*segIndex{}
	var total int64
	for _, name := range names {
		seq, err := strconv.Atoi(strings.TrimSuffix(name, segExt))
		if err != nil {
			return fmt.Errorf("bad segment name %s: %w", name, err)
		}
		ix, err := indexSegment(filepath.Join(dir, name), sig)
		if err != nil {
			return err
		}
		s.idx[sig][seq] = ix
		total += int64(ix.Count)
		for svc := range ix.Services {
			s.services[svc] = struct{}{}
		}
	}
	if len(names) == 0 {
		s.idx[sig][0] = &segIndex{Services: map[string]int{}}
	}
	s.active[sig] = s.idx[sig][seg.seq]
	count.Store(total)
	return nil
}

// indexSegment reads one segment file forward and summarizes it: record count, time bounds
// (startTime for traces, timestamp for logs and metrics) and per-service counts.
func indexSegment(path, sig string) (*segIndex, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	defer func() { _ = f.Close() }()
	ix := &segIndex{Services: map[string]int{}}
	r := bufio.NewReaderSize(f, 64<<10)
	for {
		line, err := r.ReadBytes('\n')
		if len(line) > 0 {
			var rec struct {
				Service string    `json:"service"`
				Start   time.Time `json:"startTime"`
				TS      time.Time `json:"timestamp"`
			}
			if json.Unmarshal(line, &rec) == nil {
				ix.Count++
				if rec.Service != "" {
					ix.Services[rec.Service]++
				}
				t := rec.Start
				if t.IsZero() {
					t = rec.TS
				}
				if !t.IsZero() {
					ns := t.UnixNano()
					if ix.MinUnix == 0 || ns < ix.MinUnix {
						ix.MinUnix = ns
					}
					if ns > ix.MaxUnix {
						ix.MaxUnix = ns
					}
				}
			}
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return nil, fmt.Errorf("read %s: %w", path, err)
		}
	}
	return ix, nil
}

// track folds one appended batch into the active segment's index.
func (s *Store) track(sig string, n int, services map[string]int, minT, maxT time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ix := s.active[sig]
	if ix == nil {
		return
	}
	ix.Count += n
	if !minT.IsZero() {
		if ns := minT.UnixNano(); ix.MinUnix == 0 || ns < ix.MinUnix {
			ix.MinUnix = ns
		}
		if ns := maxT.UnixNano(); ns > ix.MaxUnix {
			ix.MaxUnix = ns
		}
	}
	if ix.Services == nil {
		ix.Services = map[string]int{}
	}
	for svc, c := range services {
		ix.Services[svc] += c
	}
}

// totalExact answers a signal's record total from the segment index without scanning payloads.
// exact is false when the query cuts through a segment's time range or asks for a per-service
// count a segment lacks; callers then fall back to the capped scan and report approximate=true.
func (s *Store) totalExact(sig, service string, start, end time.Time) (total int, exact bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	exact = true
	for _, ix := range s.idx[sig] {
		if service != "" && ix.Services == nil {
			return 0, false
		}
		if !start.IsZero() || !end.IsZero() {
			if ix.MinUnix == 0 {
				return 0, false
			}
			segStart, segEnd := time.Unix(0, ix.MinUnix), time.Unix(0, ix.MaxUnix)
			if !end.IsZero() && segStart.After(end) {
				continue // fully after the range
			}
			if !start.IsZero() && segEnd.Before(start) {
				continue // fully before the range
			}
			if (!start.IsZero() && segStart.Before(start)) || (!end.IsZero() && segEnd.After(end)) {
				return 0, false // partial overlap needs a scan
			}
		}
		if service != "" {
			total += ix.Services[service]
		} else {
			total += ix.Count
		}
	}
	return total, exact
}

func segmentNames(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", dir, err)
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), segExt) {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names) // zero-padded seqs sort lexically
	return names, nil
}

func (s *Store) newSegment(sig string, seq int) (*segment, error) {
	path := filepath.Join(s.dir, sig, fmt.Sprintf("%020d%s", seq, segExt))
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return nil, fmt.Errorf("create %s: %w", path, err)
	}
	return &segment{file: f, seq: seq, path: path}, nil
}

// append writes one batch of JSONL lines to the signal's active segment, rolling past segmentBytes.
func (s *Store) append(sig string, payload []byte) error {
	if s.closed.Load() {
		return errors.New("walstore: store is closed")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	seg := s.segs[sig]
	if seg == nil {
		return fmt.Errorf("signal %s is not open", sig)
	}
	if seg.size > 0 && seg.size+int64(len(payload)) > s.segmentBytes {
		if err := s.roll(sig); err != nil {
			return err
		}
		seg = s.segs[sig]
	}
	n, err := seg.file.Write(payload)
	seg.size += int64(n)
	if err != nil {
		return fmt.Errorf("append %s: %w", sig, err)
	}
	s.counts[sig].Add(int64(countLines(payload)))
	return nil
}

func (s *Store) roll(sig string) error {
	old := s.segs[sig]
	if err := old.file.Close(); err != nil {
		return fmt.Errorf("close segment: %w", err)
	}
	s.idx[sig][old.seq] = s.active[sig] // sealed: index is final now
	s.replicate(sig, old.seq, old.path) // sealed segment -> replica (best effort, async)
	seg, err := s.newSegment(sig, old.seq+1)
	if err != nil {
		return err
	}
	s.segs[sig] = seg
	s.active[sig] = &segIndex{Services: map[string]int{}}
	s.idx[sig][seg.seq] = s.active[sig]
	return nil
}

// SetReplicator enables WAL segment replication to a standby observer.
// Call it once right after Open, before any writes: the fields are read without the lock.
func (s *Store) SetReplicator(url, token string, hc *http.Client) {
	s.replicaURL, s.replicaTok, s.hc = url, token, hc
}

// replicate POSTs a sealed segment to the replica. Best effort: failures are logged, never fatal.
func (s *Store) replicate(sig string, seq int, path string) {
	url, tok, hc := s.replicaURL, s.replicaTok, s.hc // set once before writes; no lock needed
	if url == "" || hc == nil {
		return
	}
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		data, err := os.ReadFile(path)
		if err != nil {
			return
		}
		req, err := http.NewRequest(http.MethodPost, strings.TrimRight(url, "/")+"/v1/segments?signal="+neturl.QueryEscape(sig)+"&seq="+strconv.Itoa(seq), bytes.NewReader(data))
		if err != nil {
			return
		}
		req.Header.Set("Content-Type", "application/octet-stream")
		if tok != "" {
			req.Header.Set("Authorization", "Bearer "+tok)
		}
		resp, err := hc.Do(req)
		if err == nil {
			_ = resp.Body.Close()
		}
	}()
}

// ImportSegment writes a replicated segment into the store (used by the standby's /v1/segments).
// Refuses to overwrite an existing segment.
func (s *Store) ImportSegment(sig string, seq int, data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := os.MkdirAll(filepath.Join(s.dir, sig), 0o755); err != nil {
		return err
	}
	path := filepath.Join(s.dir, sig, fmt.Sprintf("%020d%s", seq, segExt))
	if _, err := os.Stat(path); err == nil {
		return nil // already have it
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return err
	}
	if ix, err := indexSegment(path, sig); err == nil {
		s.idx[sig][seq] = ix
		for svc := range ix.Services {
			s.services[svc] = struct{}{}
		}
	}
	if cur, ok := s.segs[sig]; ok && seq >= cur.seq {
		// standby ingest: adopt as active if newer
		if seq > cur.seq {
			if f, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0o644); err == nil {
				s.segs[sig] = &segment{file: f, seq: seq, path: path, size: int64(len(data))}
				s.active[sig] = s.idx[sig][seq]
			}
		}
	}
	s.counts[sig].Store(s.counts[sig].Load() + int64(countLines(data)))
	return nil
}

func countLines(b []byte) int {
	n := 0
	for _, c := range b {
		if c == '\n' {
			n++
		}
	}
	return n
}

func marshalLines[T any](items []T) ([]byte, error) {
	var buf []byte
	for _, it := range items {
		line, err := json.Marshal(it)
		if err != nil {
			return nil, fmt.Errorf("encode record: %w", err)
		}
		buf = append(buf, line...)
		buf = append(buf, '\n')
	}
	return buf, nil
}

// AddSpans appends span records to the traces signal.
func (s *Store) AddSpans(_ context.Context, spans []telemetry.Span) error {
	if len(spans) == 0 {
		return nil
	}
	payload, err := marshalLines(spans)
	if err != nil {
		return err
	}
	svc := map[string]int{}
	var minT, maxT time.Time
	for _, sp := range spans {
		if sp.Service != "" {
			svc[sp.Service]++
		}
		if !sp.Start.IsZero() && (minT.IsZero() || sp.Start.Before(minT)) {
			minT = sp.Start
		}
		if sp.End.After(maxT) {
			maxT = sp.End
		}
	}
	s.rememberServices(spansToServices(spans))
	if err := s.append(SignalTraces, payload); err != nil {
		return err
	}
	s.track(SignalTraces, len(spans), svc, minT, maxT)
	return nil
}

// AddLogs appends log records to the logs signal.
func (s *Store) AddLogs(_ context.Context, logs []telemetry.LogRecord) error {
	if len(logs) == 0 {
		return nil
	}
	payload, err := marshalLines(logs)
	if err != nil {
		return err
	}
	svc := map[string]int{}
	var minT, maxT time.Time
	for _, l := range logs {
		if l.Service != "" {
			svc[l.Service]++
		}
		if !l.Timestamp.IsZero() && (minT.IsZero() || l.Timestamp.Before(minT)) {
			minT = l.Timestamp
		}
		if l.Timestamp.After(maxT) {
			maxT = l.Timestamp
		}
	}
	s.rememberServices(recordServices(logs))
	if err := s.append(SignalLogs, payload); err != nil {
		return err
	}
	s.track(SignalLogs, len(logs), svc, minT, maxT)
	return nil
}

// AddMetrics appends metric points to the metrics signal.
func (s *Store) AddMetrics(_ context.Context, points []telemetry.MetricPoint) error {
	if len(points) == 0 {
		return nil
	}
	payload, err := marshalLines(points)
	if err != nil {
		return err
	}
	svc := map[string]int{}
	var minT, maxT time.Time
	for _, p := range points {
		if p.Service != "" {
			svc[p.Service]++
		}
		if !p.Timestamp.IsZero() && (minT.IsZero() || p.Timestamp.Before(minT)) {
			minT = p.Timestamp
		}
		if p.Timestamp.After(maxT) {
			maxT = p.Timestamp
		}
	}
	s.rememberServices(pointServices(points))
	if err := s.append(SignalMetrics, payload); err != nil {
		return err
	}
	s.track(SignalMetrics, len(points), svc, minT, maxT)
	return nil
}

func spansToServices(spans []telemetry.Span) []string {
	out := make([]string, 0, len(spans))
	for _, sp := range spans {
		out = append(out, sp.Service)
	}
	return out
}

func recordServices(logs []telemetry.LogRecord) []string {
	out := make([]string, 0, len(logs))
	for _, l := range logs {
		out = append(out, l.Service)
	}
	return out
}

func pointServices(points []telemetry.MetricPoint) []string {
	out := make([]string, 0, len(points))
	for _, p := range points {
		out = append(out, p.Service)
	}
	return out
}

func (s *Store) rememberServices(names []string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, n := range names {
		if n != "" {
			s.services[n] = struct{}{}
		}
	}
}

// scanLines reads lines of a signal, newest segment first and newest line first within a
// segment, calling visit per line. cap < 0 means no limit; otherwise at most cap lines.
func (s *Store) scanLines(sig string, cap int, visit func([]byte)) (int, error) {
	return s.scanLinesRange(sig, cap, time.Time{}, time.Time{}, visit)
}

// scanLinesRange is scanLines with segment pruning: segments whose indexed time bounds lie
// fully outside [start, end] are skipped without reading their payloads.
func (s *Store) scanLinesRange(sig string, cap int, start, end time.Time, visit func([]byte)) (int, error) {
	if s.closed.Load() {
		return 0, errors.New("walstore: store is closed")
	}
	if cap < 0 {
		cap = math.MaxInt
	}
	dir := filepath.Join(s.dir, sig)
	names, err := segmentNames(dir)
	if err != nil {
		return 0, err
	}
	s.mu.Lock()
	idx := make(map[string]*segIndex, len(s.idx[sig]))
	for seq, ix := range s.idx[sig] {
		idx[fmt.Sprintf("%020d%s", seq, segExt)] = ix
	}
	s.mu.Unlock()
	scanned := 0
	for i := len(names) - 1; i >= 0 && scanned < cap; i-- {
		if ix := idx[names[i]]; ix != nil && ix.MinUnix != 0 {
			segStart, segEnd := time.Unix(0, ix.MinUnix), time.Unix(0, ix.MaxUnix)
			if !end.IsZero() && segStart.After(end) {
				continue
			}
			if !start.IsZero() && segEnd.Before(start) {
				continue
			}
		}
		n, err := scanFileReverse(filepath.Join(dir, names[i]), cap-scanned, visit)
		scanned += n
		if err != nil {
			return scanned, err
		}
	}
	return scanned, nil
}

// scanFileReverse reads a JSONL segment from its end, yielding whole lines newest first.
func scanFileReverse(path string, cap int, visit func([]byte)) (int, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil // segment pruned between listing and reading
		}
		return 0, fmt.Errorf("open %s: %w", path, err)
	}
	defer func() { _ = f.Close() }()
	info, err := f.Stat()
	if err != nil {
		return 0, fmt.Errorf("stat %s: %w", path, err)
	}
	pos := info.Size()
	var carry []byte // partial line prefix carried into the next (earlier) chunk
	n := 0
	for pos > 0 && n < cap {
		size := int64(64 << 10)
		if pos < size {
			size = pos
		}
		pos -= size
		chunk := make([]byte, size)
		if _, err := f.ReadAt(chunk, pos); err != nil {
			return n, fmt.Errorf("read %s: %w", path, err)
		}
		data := append(chunk, carry...)
		parts := bytes.Split(data, []byte{'\n'})
		// A trailing newline leaves an empty last part; drop it.
		if len(parts) > 0 && len(parts[len(parts)-1]) == 0 {
			parts = parts[:len(parts)-1]
		}
		if len(parts) == 0 {
			carry = data
			continue
		}
		// Emit from the end; parts[0] may be a partial line, carried to the next chunk.
		for i := len(parts) - 1; i >= 1 && n < cap; i-- {
			visit(parts[i])
			n++
		}
		carry = parts[0]
	}
	if n < cap && len(carry) > 0 { // the file's first line
		visit(carry)
		n++
	}
	return n, nil
}

// inRange reports whether t falls in [start, end]; zero bounds are open.
func inRange(t, start, end time.Time) bool {
	if !start.IsZero() && t.Before(start) {
		return false
	}
	if !end.IsZero() && t.After(end) {
		return false
	}
	return true
}

func page[T any](items []T, limit, offset int) []T {
	if offset >= len(items) {
		return []T{}
	}
	end := len(items)
	if limit > 0 && offset+limit < end {
		end = offset + limit
	}
	return items[offset:end]
}

// ListTraces groups scanned spans into trace overviews, filtered by service and time range.
// The page is built from the newest scan window; the returned bool is true when the total had
// to be derived from that window (scan cap reached) instead of the segment index.
func (s *Store) ListTraces(ctx context.Context, service string, start, end time.Time, limit, offset int, desc bool) ([]telemetry.TraceOverview, int, bool, error) {
	var spans []telemetry.Span
	scanned, err := s.scanLinesRange(SignalTraces, s.scanCap, start, end, func(line []byte) {
		var sp telemetry.Span
		if json.Unmarshal(line, &sp) != nil {
			return
		}
		if service != "" && sp.Service != service {
			return
		}
		if !inRange(sp.Start, start, end) {
			return
		}
		spans = append(spans, sp)
	})
	if err != nil {
		return nil, 0, false, err
	}
	select {
	case <-ctx.Done():
		return nil, 0, false, ctx.Err()
	default:
	}
	byTrace := map[string]*telemetry.TraceOverview{}
	order := []string{}
	for _, sp := range spans {
		key := sp.Service + "\x00" + sp.TraceID
		ov, ok := byTrace[key]
		if !ok {
			ov = &telemetry.TraceOverview{TraceID: sp.TraceID, Service: sp.Service, StartTime: sp.Start, EndTime: sp.End}
			byTrace[key] = ov
			order = append(order, key)
		}
		ov.SpanCount++
		if sp.Start.Before(ov.StartTime) {
			ov.StartTime = sp.Start
		}
		if sp.End.After(ov.EndTime) {
			ov.EndTime = sp.End
		}
		if sp.ParentSpanID == "" {
			ov.RootSpanID, ov.RootSpanName = sp.SpanID, sp.Name
		} else if ov.RootSpanID == "" {
			ov.RootSpanID, ov.RootSpanName = sp.SpanID, sp.Name
		}
	}
	out := make([]telemetry.TraceOverview, 0, len(byTrace))
	for _, key := range order {
		out = append(out, *byTrace[key])
	}
	sort.Slice(out, func(i, j int) bool {
		if desc {
			return out[i].StartTime.After(out[j].StartTime)
		}
		return out[i].StartTime.Before(out[j].StartTime)
	})
	return page(out, limit, offset), len(out), scanned >= s.scanCap, nil
}

// Spans returns the spans of one trace, filtered by service, sorted and limited.
func (s *Store) Spans(ctx context.Context, traceID, service string, limit int, asc bool) ([]telemetry.Span, int, bool, error) {
	var out []telemetry.Span
	scanned, err := s.scanLines(SignalTraces, s.scanCap, func(line []byte) {
		var sp telemetry.Span
		if json.Unmarshal(line, &sp) != nil {
			return
		}
		if sp.TraceID != traceID {
			return
		}
		if service != "" && sp.Service != service {
			return
		}
		out = append(out, sp)
	})
	if err != nil {
		return nil, 0, false, err
	}
	select {
	case <-ctx.Done():
		return nil, 0, false, ctx.Err()
	default:
	}
	sort.Slice(out, func(i, j int) bool {
		if asc {
			return out[i].Start.Before(out[j].Start)
		}
		return out[i].Start.After(out[j].Start)
	})
	return page(out, limit, 0), len(out), scanned >= s.scanCap, nil
}

// GetSpan returns one span by trace and span id, scanning newest first.
func (s *Store) GetSpan(_ context.Context, traceID, spanID string) (telemetry.Span, bool, error) {
	var found telemetry.Span
	ok := false
	_, err := s.scanLines(SignalTraces, s.scanCap, func(line []byte) {
		if ok {
			return
		}
		var sp telemetry.Span
		if json.Unmarshal(line, &sp) == nil && sp.TraceID == traceID && sp.SpanID == spanID {
			found, ok = sp, true
		}
	})
	return found, ok, err
}

// ListLogs filters scanned log records by the LogFilter, sorts and paginates. The total is
// exact (from the segment index) unless the query is text/level/trace filtered or cuts through
// a segment's time range; then the returned bool is true (total over the scan window).
func (s *Store) ListLogs(ctx context.Context, f telemetry.LogFilter) ([]telemetry.LogRecord, int, bool, error) {
	total, exact := 0, false
	if f.Level == "" && f.Q == "" && f.TraceID == "" {
		total, exact = s.totalExact(SignalLogs, f.Service, f.Start, f.End)
	}
	var out []telemetry.LogRecord
	if _, err := s.scanLinesRange(SignalLogs, s.scanCap, f.Start, f.End, func(line []byte) {
		var l telemetry.LogRecord
		if json.Unmarshal(line, &l) != nil {
			return
		}
		if f.Service != "" && l.Service != f.Service {
			return
		}
		if f.Level != "" && !strings.EqualFold(l.Severity, f.Level) {
			return
		}
		if f.Q != "" && !strings.Contains(strings.ToLower(l.Body), strings.ToLower(f.Q)) {
			return
		}
		if f.TraceID != "" && l.TraceID != f.TraceID {
			return
		}
		if !inRange(l.Timestamp, f.Start, f.End) {
			return
		}
		out = append(out, l)
	}); err != nil {
		return nil, 0, false, err
	}
	select {
	case <-ctx.Done():
		return nil, 0, false, ctx.Err()
	default:
	}
	sort.Slice(out, func(i, j int) bool {
		if f.Desc {
			return out[i].Timestamp.After(out[j].Timestamp)
		}
		return out[i].Timestamp.Before(out[j].Timestamp)
	})
	if !exact {
		total = len(out)
	}
	return page(out, f.Limit, f.Offset), total, !exact, nil
}

// ListMetrics filters scanned metric points by service, name and time range; sorted, paginated.
// The total is exact (segment index) unless a name filter is set or the range cuts a segment.
func (s *Store) ListMetrics(ctx context.Context, service, name string, start, end time.Time, limit, offset int, desc bool) ([]telemetry.MetricPoint, int, bool, error) {
	total, exact := 0, false
	if name == "" {
		total, exact = s.totalExact(SignalMetrics, service, start, end)
	}
	var out []telemetry.MetricPoint
	if _, err := s.scanLinesRange(SignalMetrics, s.scanCap, start, end, func(line []byte) {
		var m telemetry.MetricPoint
		if json.Unmarshal(line, &m) != nil {
			return
		}
		if service != "" && m.Service != service {
			return
		}
		if name != "" && m.Name != name {
			return
		}
		if !inRange(m.Timestamp, start, end) {
			return
		}
		out = append(out, m)
	}); err != nil {
		return nil, 0, false, err
	}
	select {
	case <-ctx.Done():
		return nil, 0, false, ctx.Err()
	default:
	}
	sort.Slice(out, func(i, j int) bool {
		if desc {
			return out[i].Timestamp.After(out[j].Timestamp)
		}
		return out[i].Timestamp.Before(out[j].Timestamp)
	})
	if !exact {
		total = len(out)
	}
	return page(out, limit, offset), total, !exact, nil
}

// ListErrors scans error spans (OTLP status 2) newest first, groups them by fingerprint
// (service + span name + message) and returns the groups sorted by lastSeen and paged.
// TraceIDs samples up to 5 of the newest trace ids per group.
func (s *Store) ListErrors(ctx context.Context, f telemetry.ErrorFilter) ([]telemetry.ErrorGroup, int, bool, error) {
	type acc struct {
		group telemetry.ErrorGroup
	}
	groups := map[string]*acc{}
	order := []string{}
	scanned, err := s.scanLinesRange(SignalTraces, s.scanCap, f.Start, f.End, func(line []byte) {
		var sp telemetry.Span
		if json.Unmarshal(line, &sp) != nil {
			return
		}
		msg, failed := telemetry.SpanError(sp)
		if !failed {
			return
		}
		if f.Service != "" && sp.Service != f.Service {
			return
		}
		if !inRange(sp.Start, f.Start, f.End) {
			return
		}
		if f.Q != "" {
			hay := strings.ToLower(sp.Name + " " + msg)
			if !strings.Contains(hay, strings.ToLower(f.Q)) {
				return
			}
		}
		fp := sp.Service + "\x00" + sp.Name + "\x00" + msg
		g, ok := groups[fp]
		if !ok {
			g = &acc{group: telemetry.ErrorGroup{
				Fingerprint: fp,
				Service:     sp.Service,
				SpanName:    sp.Name,
				Message:     msg,
				FirstSeen:   sp.Start,
				LastSeen:    sp.Start,
			}}
			groups[fp] = g
			order = append(order, fp)
		}
		g.group.Count++
		if sp.Start.Before(g.group.FirstSeen) {
			g.group.FirstSeen = sp.Start
		}
		if sp.Start.After(g.group.LastSeen) {
			g.group.LastSeen = sp.Start
		}
		if len(g.group.TraceIDs) < 5 && sp.TraceID != "" { // scan is newest first
			g.group.TraceIDs = append(g.group.TraceIDs, sp.TraceID)
		}
	})
	if err != nil {
		return nil, 0, false, err
	}
	select {
	case <-ctx.Done():
		return nil, 0, false, ctx.Err()
	default:
	}
	out := make([]telemetry.ErrorGroup, 0, len(groups))
	for _, fp := range order {
		out = append(out, groups[fp].group)
	}
	sort.Slice(out, func(i, j int) bool {
		if f.Desc {
			return out[i].LastSeen.After(out[j].LastSeen)
		}
		return out[i].LastSeen.Before(out[j].LastSeen)
	})
	return page(out, f.Limit, f.Offset), len(out), scanned >= s.scanCap, nil
}

// Services aggregates per-service span, error and log counts plus the last-seen timestamp
// within the scan window. ErrorRate is errors/spans (0 when the service has no spans).
func (s *Store) Services(ctx context.Context) ([]telemetry.ServiceStat, error) {
	stats := map[string]*telemetry.ServiceStat{}
	order := []string{}
	bump := func(service string, at time.Time) *telemetry.ServiceStat {
		st, ok := stats[service]
		if !ok {
			st = &telemetry.ServiceStat{Service: service}
			stats[service] = st
			order = append(order, service)
		}
		if at.After(st.LastSeen) {
			st.LastSeen = at
		}
		return st
	}
	if _, err := s.scanLines(SignalTraces, s.scanCap, func(line []byte) {
		var sp telemetry.Span
		if json.Unmarshal(line, &sp) != nil || sp.Service == "" {
			return
		}
		st := bump(sp.Service, sp.End)
		st.Spans++
		if _, failed := telemetry.SpanError(sp); failed {
			st.Errors++
		}
	}); err != nil {
		return nil, err
	}
	if _, err := s.scanLines(SignalLogs, s.scanCap, func(line []byte) {
		var l telemetry.LogRecord
		if json.Unmarshal(line, &l) != nil || l.Service == "" {
			return
		}
		bump(l.Service, l.Timestamp).Logs++
	}); err != nil {
		return nil, err
	}
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}
	out := make([]telemetry.ServiceStat, 0, len(stats))
	for _, svc := range order {
		st := stats[svc]
		if st.Spans > 0 {
			st.ErrorRate = float64(st.Errors) / float64(st.Spans)
		}
		out = append(out, *st)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Service < out[j].Service
	})
	return out, nil
}

// Overview returns the distinct service names seen and the stored record counts per signal.
func (s *Store) Overview(context.Context) ([]string, int, int, int, error) {
	if s.closed.Load() {
		return nil, 0, 0, 0, errors.New("walstore: store is closed")
	}
	s.mu.Lock()
	services := make([]string, 0, len(s.services))
	for svc := range s.services {
		services = append(services, svc)
	}
	s.mu.Unlock()
	sort.Strings(services)
	return services,
		int(s.counts[SignalTraces].Load()),
		int(s.counts[SignalLogs].Load()),
		int(s.counts[SignalMetrics].Load()), nil
}

// pruneAll deletes the oldest segments of every signal while the stored bytes exceed retention.
func (s *Store) pruneAll() {
	for _, sig := range []string{SignalTraces, SignalLogs, SignalMetrics} {
		if err := s.prune(sig); err != nil {
			// retention is best-effort; the next janitor run retries
			_ = err
		}
	}
}

func (s *Store) prune(sig string) error {
	dir := filepath.Join(s.dir, sig)
	names, err := segmentNames(dir)
	if err != nil {
		return err
	}
	s.mu.Lock()
	active := s.segs[sig]
	s.mu.Unlock()
	type segInfo struct {
		name   string
		size   int64
		active bool
	}
	segs := make([]segInfo, 0, len(names))
	total := int64(0)
	for _, name := range names {
		info, err := os.Stat(filepath.Join(dir, name))
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return err
		}
		isActive := active != nil && name == fmt.Sprintf("%020d%s", active.seq, segExt)
		segs = append(segs, segInfo{name: name, size: info.Size(), active: isActive})
		if !isActive {
			total += info.Size()
		}
	}
	// Oldest first; the active segment is never deleted.
	for _, seg := range segs {
		if total <= s.retention || seg.active {
			continue
		}
		if err := os.Remove(filepath.Join(dir, seg.name)); err != nil && !os.IsNotExist(err) {
			return err
		}
		if seq, err := strconv.Atoi(strings.TrimSuffix(seg.name, segExt)); err == nil {
			s.mu.Lock()
			delete(s.idx[sig], seq)
			s.mu.Unlock()
		}
		total -= seg.size
	}
	return nil
}

func (s *Store) janitor() {
	defer s.wg.Done()
	t := time.NewTicker(pruneInterval)
	defer t.Stop()
	for {
		select {
		case <-s.stop:
			return
		case <-t.C:
			s.pruneAll()
		}
	}
}

// Close stops the janitor and closes all segment files; safe to call twice.
func (s *Store) Close() error {
	s.once.Do(func() { close(s.stop) })
	s.wg.Wait()
	s.closed.Store(true)
	s.mu.Lock()
	defer s.mu.Unlock()
	var firstErr error
	for sig, seg := range s.segs {
		if err := seg.file.Close(); err != nil && firstErr == nil {
			firstErr = fmt.Errorf("close %s segment: %w", sig, err)
		}
	}
	s.segs = map[string]*segment{}
	return firstErr
}
