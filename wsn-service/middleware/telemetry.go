package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/observer"
)

// TraceHeader carries a trace id from an upstream caller.
const TraceHeader = "X-Trace-Id"

// Telemetry puts the request's trace id in the context and exports one span plus request metrics
// to wsn-observer; the id is set even when export is disabled so audit records stay traceable.
func Telemetry(exp *observer.Exporter) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			traceID := r.Header.Get(TraceHeader)
			if traceID == "" || len(traceID) > 64 {
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
