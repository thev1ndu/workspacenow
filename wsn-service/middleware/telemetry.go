package middleware

import (
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/observer"
)

// Telemetry puts the request's trace id in the context and exports one span plus request metrics
// to wsn-observer; the id is set even when export is disabled so audit records stay traceable.
// Clients cannot choose the trace id: only internal (loopback) callers may attach a W3C
// traceparent, so nobody can attach audit rows or spans to someone else's trace.
func Telemetry(exp *observer.Exporter) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			traceID := ""
			if id, ok := parseTraceparent(r.Header.Get("traceparent")); ok && isLoopback(r.RemoteAddr) {
				traceID = id
			}
			if traceID == "" {
				traceID = kernel.NewTraceID()
			}
			spanID := observer.NewSpanID()
			ctx := observer.WithSpan(kernel.WithTraceID(r.Context(), traceID), traceID, spanID)
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r.WithContext(ctx))
			if !exp.Enabled() {
				return
			}
			end := time.Now()
			status := strconv.Itoa(rec.status)
			spanStatus := "1"
			if rec.status >= 500 {
				spanStatus = "2"
			}
			attrs := map[string]string{
				"http.method":      r.Method,
				"http.path":        r.URL.Path,
				"http.status_code": status,
				"correlation_id":   CorrelationIDFrom(ctx),
				"http.duration_ms": strconv.FormatInt(end.Sub(start).Milliseconds(), 10),
			}
			if c, ok := kernel.CallerFrom(ctx); ok {
				attrs["actor"] = c.UserID
			}
			exp.Span(observer.Span{
				TraceID: traceID, SpanID: spanID, Name: r.Method + " " + r.URL.Path,
				Kind: "SPAN_KIND_SERVER", Status: spanStatus, Start: start, End: end, Attributes: attrs,
			})
			exp.Metric(observer.MetricPoint{
				Name: "http.server.requests", Type: "sum", Time: end, Value: "1",
				Attributes: map[string]string{"http.method": r.Method, "http.status_code": status},
			})
			exp.Metric(observer.MetricPoint{
				Name: "http.server.duration_ms", Type: "histogram", Time: end,
				Value:      strconv.FormatInt(end.Sub(start).Milliseconds(), 10),
				Attributes: map[string]string{"http.method": r.Method},
			})
		})
	}
}

// parseTraceparent parses a W3C traceparent header (00-<32 hex trace id>-<16 hex span id>-<2 hex
// flags>) and returns the trace id; anything malformed is rejected.
func parseTraceparent(h string) (string, bool) {
	parts := strings.Split(h, "-")
	if len(parts) != 4 || parts[0] != "00" {
		return "", false
	}
	traceID, ok := hexPart(parts[1], 32)
	if !ok || traceID == strings.Repeat("0", 32) {
		return "", false
	}
	if _, ok := hexPart(parts[2], 16); !ok {
		return "", false
	}
	if _, ok := hexPart(parts[3], 2); !ok {
		return "", false
	}
	return traceID, true
}

func hexPart(s string, n int) (string, bool) {
	if len(s) != n {
		return "", false
	}
	for _, c := range s {
		if !('0' <= c && c <= '9' || 'a' <= c && c <= 'f') {
			return "", false
		}
	}
	return s, true
}

// isLoopback reports whether the peer address is a loopback address (an internal caller).
func isLoopback(remoteAddr string) bool {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		host = remoteAddr
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
