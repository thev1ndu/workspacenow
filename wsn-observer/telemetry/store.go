package telemetry

import (
	"sort"
	"strings"
	"sync"
	"time"
)

// Store keeps the most recent entries per signal in memory. Retention bounds memory; the
// observer is a live view, not an archive (the durable audit trail lives in wsn-service).
type Store struct {
	mu        sync.RWMutex
	retention int
	spans     []Span
	logs      []LogRecord
	metrics   []MetricPoint
}

func NewStore(retention int) *Store {
	if retention < 1 {
		retention = 1
	}
	return &Store{retention: retention}
}

func (s *Store) AddSpans(spans []Span) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.spans = append(s.spans, spans...)
	if len(s.spans) > s.retention {
		s.spans = s.spans[len(s.spans)-s.retention:]
	}
}

func (s *Store) AddLogs(logs []LogRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.logs = append(s.logs, logs...)
	if len(s.logs) > s.retention {
		s.logs = s.logs[len(s.logs)-s.retention:]
	}
}

func (s *Store) AddMetrics(metrics []MetricPoint) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.metrics = append(s.metrics, metrics...)
	if len(s.metrics) > s.retention {
		s.metrics = s.metrics[len(s.metrics)-s.retention:]
	}
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

// ListTraces groups spans into trace overviews, filtered by service and time range,
// sorted by start time (desc by default) and paginated. It returns the page and total matches.
func (s *Store) ListTraces(service string, start, end time.Time, limit, offset int, desc bool) ([]TraceOverview, int) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	byTrace := map[string]*TraceOverview{}
	order := []string{}
	for _, sp := range s.spans {
		if service != "" && sp.Service != service {
			continue
		}
		if !inRange(sp.Start, start, end) {
			continue
		}
		key := sp.Service + "\x00" + sp.TraceID
		ov, ok := byTrace[key]
		if !ok {
			ov = &TraceOverview{TraceID: sp.TraceID, Service: sp.Service, StartTime: sp.Start, EndTime: sp.End}
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
		if sp.ParentSpanID == "" || ov.RootSpanID == "" {
			ov.RootSpanID = sp.SpanID
			ov.RootSpanName = sp.Name
		}
	}
	out := make([]TraceOverview, 0, len(byTrace))
	for _, key := range order {
		out = append(out, *byTrace[key])
	}
	sort.Slice(out, func(i, j int) bool {
		if desc {
			return out[i].StartTime.After(out[j].StartTime)
		}
		return out[i].StartTime.Before(out[j].StartTime)
	})
	total := len(out)
	return page(out, limit, offset), total
}

// Spans returns the spans of one trace, filtered by service, sorted (asc by default) and limited.
func (s *Store) Spans(traceID, service string, limit int, asc bool) ([]Span, int) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []Span
	for _, sp := range s.spans {
		if sp.TraceID != traceID {
			continue
		}
		if service != "" && sp.Service != service {
			continue
		}
		out = append(out, sp)
	}
	sort.Slice(out, func(i, j int) bool {
		if asc {
			return out[i].Start.Before(out[j].Start)
		}
		return out[i].Start.After(out[j].Start)
	})
	total := len(out)
	return page(out, limit, 0), total
}

// ListLogs filters log records by service, severity level, a case-insensitive substring of the
// body, and time range; sorted by timestamp (desc by default) and paginated.
func (s *Store) ListLogs(service, level, q string, start, end time.Time, limit, offset int, desc bool) ([]LogRecord, int) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []LogRecord
	for _, lg := range s.logs {
		if service != "" && lg.Service != service {
			continue
		}
		if level != "" && !strings.EqualFold(lg.Severity, level) {
			continue
		}
		if q != "" && !strings.Contains(strings.ToLower(lg.Body), strings.ToLower(q)) {
			continue
		}
		if !inRange(lg.Timestamp, start, end) {
			continue
		}
		out = append(out, lg)
	}
	sort.Slice(out, func(i, j int) bool {
		if desc {
			return out[i].Timestamp.After(out[j].Timestamp)
		}
		return out[i].Timestamp.Before(out[j].Timestamp)
	})
	total := len(out)
	return page(out, limit, offset), total
}

// ListMetrics filters metric points by service, name and time range; sorted (desc by default), paginated.
func (s *Store) ListMetrics(service, name string, start, end time.Time, limit, offset int, desc bool) ([]MetricPoint, int) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []MetricPoint
	for _, m := range s.metrics {
		if service != "" && m.Service != service {
			continue
		}
		if name != "" && m.Name != name {
			continue
		}
		if !inRange(m.Timestamp, start, end) {
			continue
		}
		out = append(out, m)
	}
	sort.Slice(out, func(i, j int) bool {
		if desc {
			return out[i].Timestamp.After(out[j].Timestamp)
		}
		return out[i].Timestamp.Before(out[j].Timestamp)
	})
	total := len(out)
	return page(out, limit, offset), total
}

// Overview returns the distinct service names seen and the stored counts per signal.
func (s *Store) Overview() (services []string, spans, logs, metrics int) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	seen := map[string]bool{}
	for _, sp := range s.spans {
		seen[sp.Service] = true
	}
	for _, lg := range s.logs {
		seen[lg.Service] = true
	}
	for _, m := range s.metrics {
		seen[m.Service] = true
	}
	for svc := range seen {
		services = append(services, svc)
	}
	sort.Strings(services)
	return services, len(s.spans), len(s.logs), len(s.metrics)
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
