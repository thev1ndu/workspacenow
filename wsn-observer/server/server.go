// Package server serves the wsn-observer HTTP API: OTLP ingest and telemetry queries.
package server

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-observer/config"
	"github.com/thev1ndu/workspacenow/wsn-observer/telemetry"
)

const (
	maxBodyBytes = 8 << 20 // 8 MiB per OTLP payload
	maxLimit     = 1000
	defaultLimit = 50
)

// errStorage marks a store failure, answered as 500 instead of 400.
var errStorage = errors.New("telemetry store failed")

// Server wires the routes; errors use the platform's ErrorBody shape.
type Server struct {
	cfg   config.Config
	store telemetry.Store
}

// New builds the root handler; every signal is read from and written to store.
func New(cfg config.Config, store telemetry.Store) http.Handler {
	s := &Server{cfg: cfg, store: store}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.healthz)
	mux.HandleFunc("POST /v1/traces", s.auth(s.ingest(s.storeSpans)))
	mux.HandleFunc("POST /v1/logs", s.auth(s.ingest(s.storeLogs)))
	mux.HandleFunc("POST /v1/metrics", s.auth(s.ingest(s.storeMetrics)))
	mux.HandleFunc("POST /v1/segments", s.auth(s.importSegment)) // WAL replication from a primary observer
	mux.HandleFunc("GET /api/v1/traces", s.auth(s.listTraces))
	mux.HandleFunc("GET /api/v1/trace", s.auth(s.getTrace))
	mux.HandleFunc("GET /api/v1/logs", s.auth(s.listLogs))
	mux.HandleFunc("GET /api/v1/metrics", s.auth(s.listMetrics))
	mux.HandleFunc("GET /api/v1/overview", s.auth(s.overview))
	mux.HandleFunc("GET /api/v1/errors", s.auth(s.listErrors))
	mux.HandleFunc("POST /api/v1/errors/query", s.auth(s.queryErrors))
	mux.HandleFunc("GET /api/v1/services", s.auth(s.listServices))
	mux.HandleFunc("POST /api/v1/traces/query", s.auth(s.queryTraces))
	mux.HandleFunc("POST /api/v1/traces/{traceId}/spans/query", s.auth(s.queryTraceSpans))
	mux.HandleFunc("GET /api/v1/traces/{traceId}/spans/{spanId}", s.auth(s.getSpanDetails))
	mux.HandleFunc("POST /api/v1/logs/query", s.auth(s.queryLogs))
	mux.HandleFunc("POST /api/v1/metrics/query", s.auth(s.queryMetrics))
	mux.HandleFunc("/", s.notFound)
	return logRequests(mux)
}

func (s *Server) storeSpans(ctx context.Context, data []byte) (int, error) {
	spans, err := telemetry.ParseTraces(data)
	if err != nil {
		return 0, err
	}
	if err := s.store.AddSpans(ctx, spans); err != nil {
		return 0, fmt.Errorf("%w: %w", errStorage, err)
	}
	return len(spans), nil
}

func (s *Server) storeLogs(ctx context.Context, data []byte) (int, error) {
	logs, err := telemetry.ParseLogs(data)
	if err != nil {
		return 0, err
	}
	if err := s.store.AddLogs(ctx, logs); err != nil {
		return 0, fmt.Errorf("%w: %w", errStorage, err)
	}
	return len(logs), nil
}

func (s *Server) storeMetrics(ctx context.Context, data []byte) (int, error) {
	metrics, err := telemetry.ParseMetrics(data)
	if err != nil {
		return 0, err
	}
	if err := s.store.AddMetrics(ctx, metrics); err != nil {
		return 0, fmt.Errorf("%w: %w", errStorage, err)
	}
	return len(metrics), nil
}

// auth requires the shared bearer token when one is configured; otherwise the NetworkPolicy is the guard.
func (s *Server) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.cfg.Token == "" {
			next(w, r)
			return
		}
		header := r.Header.Get("Authorization")
		present, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || subtle.ConstantTimeCompare([]byte(present), []byte(s.cfg.Token)) != 1 {
			writeError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "a valid bearer token is required")
			return
		}
		next(w, r)
	}
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
		log.Printf("%s %s", r.Method, r.URL.Path)
	})
}

func (s *Server) healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) notFound(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, "NOT_FOUND", r.Method+" "+r.URL.Path+" does not exist")
}

// importSegment receives a sealed WAL segment from a primary observer (replication).
func (s *Server) importSegment(w http.ResponseWriter, r *http.Request) {
	sig := r.URL.Query().Get("signal")
	seq, err := strconv.Atoi(r.URL.Query().Get("seq"))
	if sig == "" || err != nil || seq < 0 {
		http.Error(w, `{"status":400,"code":"VALIDATION_FAILED","message":"signal and seq required"}`, http.StatusBadRequest)
		return
	}
	if !slices.Contains([]string{"traces", "logs", "metrics"}, sig) {
		http.Error(w, `{"status":400,"code":"VALIDATION_FAILED","message":"unknown signal"}`, http.StatusBadRequest)
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 512<<20))
	if err != nil {
		http.Error(w, `{"status":400,"code":"VALIDATION_FAILED","message":"read body"}`, http.StatusBadRequest)
		return
	}
	if err := s.store.ImportSegment(sig, seq, body); err != nil {
		http.Error(w, `{"status":500,"code":"INVALID_STATE","message":"import segment"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusAccepted)
	_, _ = w.Write([]byte(`{"accepted":1}`))
}

func (s *Server) ingest(accept func(context.Context, []byte) (int, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := readBody(w, r)
		if err != nil {
			return // readBody already wrote the error
		}
		n, err := accept(r.Context(), body)
		if err != nil {
			status, code := http.StatusBadRequest, "VALIDATION_FAILED"
			if errors.Is(err, errStorage) {
				status, code = http.StatusInternalServerError, "STORAGE_FAILED"
			}
			writeError(w, status, code, err.Error())
			return
		}
		writeJSON(w, http.StatusAccepted, map[string]int{"accepted": n})
	}
}

func readBody(w http.ResponseWriter, r *http.Request) ([]byte, error) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE", "payload exceeds 8 MiB")
		} else {
			writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", "could not read the body: "+err.Error())
		}
		return nil, err
	}
	return body, nil
}

// storageErr answers a failed store call as 500 STORAGE_FAILED.
func storageErr(w http.ResponseWriter, err error) {
	writeError(w, http.StatusInternalServerError, "STORAGE_FAILED", err.Error())
}

func (s *Server) listTraces(w http.ResponseWriter, r *http.Request) {
	service, start, end, limit, offset, desc, err := listParams(r, "desc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	traces, total, err := s.store.ListTraces(r.Context(), service, start, end, limit, offset, desc)
	if err != nil {
		storageErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"traces": traces, "totalCount": total})
}

func (s *Server) getTrace(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	traceID := q.Get("traceId")
	if traceID == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", "traceId is required")
		return
	}
	limit, err := parseLimit(r, defaultLimit)
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	desc := q.Get("sortOrder") == "desc" // spans default to chronological (asc)
	spans, total, err := s.store.Spans(r.Context(), traceID, q.Get("serviceName"), limit, !desc)
	if err != nil {
		storageErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"spans": spans, "totalCount": total})
}

func (s *Server) listLogs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	service, start, end, limit, offset, desc, err := listParams(r, "desc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	s.serveLogs(w, r, telemetry.LogFilter{
		Service: service, Level: q.Get("level"), Q: q.Get("q"), TraceID: q.Get("traceId"),
		Start: start, End: end, Limit: limit, Offset: offset, Desc: desc,
	})
}

func (s *Server) listMetrics(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	service, start, end, limit, offset, desc, err := listParams(r, "desc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	metrics, total, err := s.store.ListMetrics(r.Context(), service, q.Get("name"), start, end, limit, offset, desc)
	if err != nil {
		storageErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"metrics": metrics, "totalCount": total})
}

// serveLogs runs one logs query against the store.
func (s *Server) serveLogs(w http.ResponseWriter, r *http.Request, f telemetry.LogFilter) {
	logs, total, err := s.store.ListLogs(r.Context(), f)
	if err != nil {
		storageErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"logs": logs, "totalCount": total})
}

// listErrors serves GET /api/v1/errors: error span groups, newest activity first.
func (s *Server) listErrors(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	service, start, end, limit, offset, desc, err := listParams(r, "desc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	s.serveErrors(w, r, telemetry.ErrorFilter{
		Service: service, Q: q.Get("q"),
		Start: start, End: end, Limit: limit, Offset: offset, Desc: desc,
	})
}

// queryErrors serves POST /api/v1/errors/query (agent-manager-style JSON body).
func (s *Server) queryErrors(w http.ResponseWriter, r *http.Request) {
	q, ok := decodeQuery(w, r)
	if !ok {
		return
	}
	start, end, limit, offset, desc, err := q.bounds("desc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	s.serveErrors(w, r, telemetry.ErrorFilter{
		Service: q.ServiceName, Q: q.Q,
		Start: start, End: end, Limit: limit, Offset: offset, Desc: desc,
	})
}

// serveErrors runs one error-group query against the store.
func (s *Server) serveErrors(w http.ResponseWriter, r *http.Request, f telemetry.ErrorFilter) {
	groups, total, err := s.store.ListErrors(r.Context(), f)
	if err != nil {
		storageErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"errors": groups, "totalCount": total})
}

// listServices serves GET /api/v1/services: per-service span/error/log counts and error rate.
func (s *Server) listServices(w http.ResponseWriter, r *http.Request) {
	services, err := s.store.Services(r.Context())
	if err != nil {
		storageErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"services": services})
}

func (s *Server) overview(w http.ResponseWriter, r *http.Request) {
	services, spans, logs, metrics, err := s.store.Overview(r.Context())
	if err != nil {
		storageErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"services": services,
		"spans":    spans,
		"logs":     logs,
		"metrics":  metrics,
	})
}

// queryBody is the POST filter body shared by the /api/v1/*/query endpoints (agent-manager style).
type queryBody struct {
	ServiceName string `json:"serviceName"`
	StartTime   string `json:"startTime"` // RFC3339
	EndTime     string `json:"endTime"`
	Limit       *int   `json:"limit"`
	Offset      *int   `json:"offset"`
	SortOrder   string `json:"sortOrder"` // asc or desc, default desc
	Level       string `json:"level"`     // logs
	Q           string `json:"q"`         // logs: case-insensitive body substring
	TraceID     string `json:"traceId"`   // logs
	Name        string `json:"name"`      // metrics
}

// decodeQuery reads and validates a query body; on failure it writes the error and returns false.
func decodeQuery(w http.ResponseWriter, r *http.Request) (queryBody, bool) {
	var q queryBody
	body, err := readBody(w, r)
	if err != nil {
		return q, false
	}
	if err := json.Unmarshal(body, &q); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", "invalid query body: "+err.Error())
		return q, false
	}
	return q, true
}

// bounds converts the body's time/sort fields into store arguments.
func (q queryBody) bounds(defaultSort string) (start, end time.Time, limit, offset int, desc bool, err error) {
	if q.StartTime != "" {
		start, err = time.Parse(time.RFC3339Nano, q.StartTime)
		if err != nil {
			return time.Time{}, time.Time{}, 0, 0, false, errors.New("startTime must be RFC3339")
		}
	}
	if q.EndTime != "" {
		end, err = time.Parse(time.RFC3339Nano, q.EndTime)
		if err != nil {
			return time.Time{}, time.Time{}, 0, 0, false, errors.New("endTime must be RFC3339")
		}
	}
	limit = defaultLimit
	if q.Limit != nil {
		limit = *q.Limit
	}
	if limit < 1 || limit > maxLimit {
		return time.Time{}, time.Time{}, 0, 0, false, errors.New("limit must be between 1 and 1000")
	}
	offset = 0
	if q.Offset != nil {
		offset = *q.Offset
	}
	if offset < 0 {
		return time.Time{}, time.Time{}, 0, 0, false, errors.New("offset must be zero or more")
	}
	order := q.SortOrder
	if order == "" {
		order = defaultSort
	}
	if order != "asc" && order != "desc" {
		return time.Time{}, time.Time{}, 0, 0, false, errors.New("sortOrder must be asc or desc")
	}
	return start, end, limit, offset, order == "desc", nil
}

func (s *Server) queryTraces(w http.ResponseWriter, r *http.Request) {
	q, ok := decodeQuery(w, r)
	if !ok {
		return
	}
	start, end, limit, offset, desc, err := q.bounds("desc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	traces, total, err := s.store.ListTraces(r.Context(), q.ServiceName, start, end, limit, offset, desc)
	if err != nil {
		storageErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"traces": traces, "totalCount": total})
}

func (s *Server) queryTraceSpans(w http.ResponseWriter, r *http.Request) {
	q, ok := decodeQuery(w, r)
	if !ok {
		return
	}
	_, _, limit, _, desc, err := q.bounds("asc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	spans, total, err := s.store.Spans(r.Context(), r.PathValue("traceId"), q.ServiceName, limit, !desc)
	if err != nil {
		storageErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"spans": spans, "totalCount": total})
}

func (s *Server) getSpanDetails(w http.ResponseWriter, r *http.Request) {
	span, ok, err := s.store.GetSpan(r.Context(), r.PathValue("traceId"), r.PathValue("spanId"))
	if err != nil {
		storageErr(w, err)
		return
	}
	if !ok {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "span not found")
		return
	}
	writeJSON(w, http.StatusOK, span)
}

func (s *Server) queryLogs(w http.ResponseWriter, r *http.Request) {
	q, ok := decodeQuery(w, r)
	if !ok {
		return
	}
	start, end, limit, offset, desc, err := q.bounds("desc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	s.serveLogs(w, r, telemetry.LogFilter{
		Service: q.ServiceName, Level: q.Level, Q: q.Q, TraceID: q.TraceID,
		Start: start, End: end, Limit: limit, Offset: offset, Desc: desc,
	})
}

func (s *Server) queryMetrics(w http.ResponseWriter, r *http.Request) {
	q, ok := decodeQuery(w, r)
	if !ok {
		return
	}
	start, end, limit, offset, desc, err := q.bounds("desc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	metrics, total, err := s.store.ListMetrics(r.Context(), q.ServiceName, q.Name, start, end, limit, offset, desc)
	if err != nil {
		storageErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"metrics": metrics, "totalCount": total})
}

// listParams parses the shared query parameters: serviceName, startTime, endTime (RFC3339),
// limit, offset and sortOrder.
func listParams(r *http.Request, defaultSort string) (service string, start, end time.Time, limit, offset int, desc bool, err error) {
	q := r.URL.Query()
	service = q.Get("serviceName")
	if v := q.Get("startTime"); v != "" {
		start, err = time.Parse(time.RFC3339Nano, v)
		if err != nil {
			return "", time.Time{}, time.Time{}, 0, 0, false, errors.New("startTime must be RFC3339")
		}
	}
	if v := q.Get("endTime"); v != "" {
		end, err = time.Parse(time.RFC3339Nano, v)
		if err != nil {
			return "", time.Time{}, time.Time{}, 0, 0, false, errors.New("endTime must be RFC3339")
		}
	}
	limit, err = parseLimit(r, defaultLimit)
	if err != nil {
		return "", time.Time{}, time.Time{}, 0, 0, false, err
	}
	offset, err = parseOffset(r)
	if err != nil {
		return "", time.Time{}, time.Time{}, 0, 0, false, err
	}
	order := q.Get("sortOrder")
	if order == "" {
		order = defaultSort
	}
	if order != "asc" && order != "desc" {
		return "", time.Time{}, time.Time{}, 0, 0, false, errors.New("sortOrder must be asc or desc")
	}
	return service, start, end, limit, offset, order == "desc", nil
}

func parseLimit(r *http.Request, def int) (int, error) {
	v := r.URL.Query().Get("limit")
	if v == "" {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 1 || n > maxLimit {
		return 0, errors.New("limit must be between 1 and 1000")
	}
	return n, nil
}

func parseOffset(r *http.Request) (int, error) {
	v := r.URL.Query().Get("offset")
	if v == "" {
		return 0, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 0 {
		return 0, errors.New("offset must be zero or more")
	}
	return n, nil
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{"status": status, "code": code, "message": message})
}
