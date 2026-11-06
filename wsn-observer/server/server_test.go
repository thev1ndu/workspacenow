package server

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-observer/config"
	"github.com/thev1ndu/workspacenow/wsn-observer/telemetry"
)

func newServer(token string) *httptest.Server {
	cfg := config.Config{Port: 0, Token: token, Retention: 100}
	return httptest.NewServer(New(cfg, telemetry.NewStore(cfg.Retention)))
}

func do(t *testing.T, method, url, token, body string) (int, map[string]any) {
	t.Helper()
	req, err := http.NewRequest(method, url, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var parsed map[string]any
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &parsed); err != nil {
			t.Fatalf("response is not JSON: %s", raw)
		}
	}
	return resp.StatusCode, parsed
}

const tracesPayload = `{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"wsn-service"}}]},
"scopeSpans":[{"spans":[
 {"traceId":"t1","spanId":"a","name":"root","kind":1,"startTimeUnixNano":"1000","endTimeUnixNano":"5000","status":{"code":1}},
 {"traceId":"t1","spanId":"b","parentSpanId":"a","name":"child","kind":1,"startTimeUnixNano":"2000","endTimeUnixNano":"4000","status":{"code":0}}
]}]}]}`

const logsPayload = `{"resourceLogs":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"wsn-service"}}]},
"scopeLogs":[{"logRecords":[{"timeUnixNano":"1000","severityText":"ERROR","severityNumber":17,"body":{"stringValue":"sale failed"}}]}]}]}`

const metricsPayload = `{"resourceMetrics":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"wsn-service"}}]},
"scopeMetrics":[{"metrics":[{"name":"requests","sum":{"dataPoints":[{"timeUnixNano":"1000","asInt":3}]}}]}]}]}`

func TestHealthzIsOpen(t *testing.T) {
	srv := newServer("tok")
	defer srv.Close()
	status, body := do(t, "GET", srv.URL+"/healthz", "", "")
	if status != 200 || body["status"] != "ok" {
		t.Fatalf("healthz: %d %v", status, body)
	}
}

func TestIngestAndQueryRoundTrip(t *testing.T) {
	srv := newServer("")
	defer srv.Close()

	for path, payload := range map[string]string{
		"/v1/traces":  tracesPayload,
		"/v1/logs":    logsPayload,
		"/v1/metrics": metricsPayload,
	} {
		status, body := do(t, "POST", srv.URL+path, "", payload)
		if status != 202 || body["accepted"] != float64(2) && path == "/v1/traces" {
			t.Fatalf("POST %s: %d %v", path, status, body)
		}
	}

	status, body := do(t, "GET", srv.URL+"/api/v1/traces?serviceName=wsn-service", "", "")
	if status != 200 || body["totalCount"] != float64(1) {
		t.Fatalf("list traces: %d %v", status, body)
	}
	traces := body["traces"].([]any)
	first := traces[0].(map[string]any)
	if first["traceId"] != "t1" || first["rootSpanName"] != "root" || first["spanCount"] != float64(2) {
		t.Fatalf("trace overview: %v", first)
	}

	status, body = do(t, "GET", srv.URL+"/api/v1/trace?traceId=t1", "", "")
	if status != 200 || body["totalCount"] != float64(2) {
		t.Fatalf("get trace: %d %v", status, body)
	}
	spans := body["spans"].([]any)
	if spans[0].(map[string]any)["spanId"] != "a" { // asc by default
		t.Fatalf("spans sorted asc: %v", spans)
	}

	status, body = do(t, "GET", srv.URL+"/api/v1/logs?level=error&q=sale", "", "")
	if status != 200 || body["totalCount"] != float64(1) {
		t.Fatalf("list logs: %d %v", status, body)
	}

	status, body = do(t, "GET", srv.URL+"/api/v1/metrics?name=requests", "", "")
	if status != 200 || body["totalCount"] != float64(1) {
		t.Fatalf("list metrics: %d %v", status, body)
	}

	status, body = do(t, "GET", srv.URL+"/api/v1/overview", "", "")
	if status != 200 || body["spans"] != float64(2) || body["logs"] != float64(1) || body["metrics"] != float64(1) {
		t.Fatalf("overview: %d %v", status, body)
	}
	services := body["services"].([]any)
	if len(services) != 1 || services[0] != "wsn-service" {
		t.Fatalf("services: %v", services)
	}
}

func TestAuthIsEnforcedWhenTokenIsSet(t *testing.T) {
	srv := newServer("secret")
	defer srv.Close()
	for _, path := range []string{"/v1/traces", "/api/v1/traces", "/api/v1/overview"} {
		method := "POST"
		if strings.HasPrefix(path, "/api/") {
			method = "GET"
		}
		if status, body := do(t, method, srv.URL+path, "", tracesPayload); status != 401 || body["code"] != "UNAUTHENTICATED" {
			t.Fatalf("%s without token: %d %v", path, status, body)
		}
		if status, _ := do(t, method, srv.URL+path, "wrong", tracesPayload); status != 401 {
			t.Fatalf("%s with wrong token: %d", path, status)
		}
		if status, _ := do(t, method, srv.URL+path, "secret", tracesPayload); status == 401 {
			t.Fatalf("%s with right token must pass", path)
		}
	}
}

func TestBadRequestsUseThePlatformErrorShape(t *testing.T) {
	srv := newServer("")
	defer srv.Close()

	status, body := do(t, "POST", srv.URL+"/v1/traces", "", "{nope")
	if status != 400 || body["code"] != "VALIDATION_FAILED" || body["status"] != float64(400) {
		t.Fatalf("bad OTLP: %d %v", status, body)
	}

	status, body = do(t, "GET", srv.URL+"/api/v1/trace", "", "")
	if status != 400 || body["code"] != "VALIDATION_FAILED" {
		t.Fatalf("missing traceId: %d %v", status, body)
	}

	for _, url := range []string{
		"/api/v1/traces?limit=0",
		"/api/v1/traces?limit=1001",
		"/api/v1/traces?limit=abc",
		"/api/v1/traces?offset=-1",
		"/api/v1/traces?offset=abc",
		"/api/v1/traces?startTime=yesterday",
		"/api/v1/traces?endTime=soon",
		"/api/v1/traces?sortOrder=sideways",
		"/api/v1/logs?sortOrder=sideways",
		"/api/v1/logs?limit=abc",
		"/api/v1/metrics?offset=-2",
		"/api/v1/metrics?endTime=soon",
	} {
		if status, body := do(t, "GET", srv.URL+url, "", ""); status != 400 || body["code"] != "VALIDATION_FAILED" {
			t.Fatalf("%s: %d %v", url, status, body)
		}
	}

	for _, path := range []string{"/v1/logs", "/v1/metrics"} {
		if status, body := do(t, "POST", srv.URL+path, "", "{nope"); status != 400 || body["code"] != "VALIDATION_FAILED" {
			t.Fatalf("bad OTLP on %s: %d %v", path, status, body)
		}
	}

	status, body = do(t, "GET", srv.URL+"/nope", "", "")
	if status != 404 || body["code"] != "NOT_FOUND" {
		t.Fatalf("unknown route: %d %v", status, body)
	}
}

func TestOversizedBodyIsRejected(t *testing.T) {
	srv := newServer("")
	defer srv.Close()
	big := bytes.Repeat([]byte("x"), maxBodyBytes+1)
	status, body := do(t, "POST", srv.URL+"/v1/logs", "", string(big))
	if status != 413 || body["code"] != "PAYLOAD_TOO_LARGE" {
		t.Fatalf("oversized: %d %v", status, body)
	}
}

func TestGetTraceSortAndLimit(t *testing.T) {
	srv := newServer("")
	defer srv.Close()
	do(t, "POST", srv.URL+"/v1/traces", "", tracesPayload)

	status, body := do(t, "GET", srv.URL+"/api/v1/trace?traceId=t1&sortOrder=desc&limit=1", "", "")
	if status != 200 {
		t.Fatalf("status %d", status)
	}
	spans := body["spans"].([]any)
	if body["totalCount"] != float64(2) || len(spans) != 1 || spans[0].(map[string]any)["spanId"] != "b" {
		t.Fatalf("desc limit 1: %v", body)
	}

	status, body = do(t, "GET", srv.URL+"/api/v1/trace?traceId=t1&limit=banana", "", "")
	if status != 400 {
		t.Fatalf("bad limit: %d %v", status, body)
	}
}
