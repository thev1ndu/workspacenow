// Package server serves the wsn-observer HTTP API: OTLP ingest and telemetry queries.
package server

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
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

// Server wires the routes; errors use the platform's ErrorBody shape.
type Server struct {
	cfg   config.Config
	store *telemetry.Store
}

// New builds the root handler.
func New(cfg config.Config, store *telemetry.Store) http.Handler {
	s := &Server{cfg: cfg, store: store}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.healthz)
	mux.HandleFunc("POST /v1/traces", s.auth(s.ingest(s.storeSpans)))
	mux.HandleFunc("POST /v1/logs", s.auth(s.ingest(s.storeLogs)))
	mux.HandleFunc("POST /v1/metrics", s.auth(s.ingest(s.storeMetrics)))
	mux.HandleFunc("GET /api/v1/traces", s.auth(s.listTraces))
	mux.HandleFunc("GET /api/v1/trace", s.auth(s.getTrace))
	mux.HandleFunc("GET /api/v1/logs", s.auth(s.listLogs))
	mux.HandleFunc("GET /api/v1/metrics", s.auth(s.listMetrics))
	mux.HandleFunc("GET /api/v1/overview", s.auth(s.overview))
	mux.HandleFunc("/", s.notFound)
	return logRequests(mux)
}

func (s *Server) storeSpans(data []byte) (int, error) {
	spans, err := telemetry.ParseTraces(data)
	if err != nil {
		return 0, err
	}
	s.store.AddSpans(spans)
	return len(spans), nil
}

func (s *Server) storeLogs(data []byte) (int, error) {
	logs, err := telemetry.ParseLogs(data)
	if err != nil {
		return 0, err
	}
	s.store.AddLogs(logs)
	return len(logs), nil
}

func (s *Server) storeMetrics(data []byte) (int, error) {
	metrics, err := telemetry.ParseMetrics(data)
	if err != nil {
		return 0, err
	}
	s.store.AddMetrics(metrics)
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

func (s *Server) ingest(accept func([]byte) (int, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := readBody(w, r)
		if err != nil {
			return // readBody already wrote the error
		}
		n, err := accept(body)
		if err != nil {
			writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", "invalid OTLP payload: "+err.Error())
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

func (s *Server) listTraces(w http.ResponseWriter, r *http.Request) {
	service, start, end, limit, offset, desc, err := listParams(r, "desc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	traces, total := s.store.ListTraces(service, start, end, limit, offset, desc)
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
	spans, total := s.store.Spans(traceID, q.Get("serviceName"), limit, !desc)
	writeJSON(w, http.StatusOK, map[string]any{"spans": spans, "totalCount": total})
}

func (s *Server) listLogs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	service, start, end, limit, offset, desc, err := listParams(r, "desc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	logs, total := s.store.ListLogs(service, q.Get("level"), q.Get("q"), start, end, limit, offset, desc)
	writeJSON(w, http.StatusOK, map[string]any{"logs": logs, "totalCount": total})
}

func (s *Server) listMetrics(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	service, start, end, limit, offset, desc, err := listParams(r, "desc")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
		return
	}
	metrics, total := s.store.ListMetrics(service, q.Get("name"), start, end, limit, offset, desc)
	writeJSON(w, http.StatusOK, map[string]any{"metrics": metrics, "totalCount": total})
}

func (s *Server) overview(w http.ResponseWriter, _ *http.Request) {
	services, spans, logs, metrics := s.store.Overview()
	writeJSON(w, http.StatusOK, map[string]any{
		"services": services,
		"spans":    spans,
		"logs":     logs,
		"metrics":  metrics,
	})
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
