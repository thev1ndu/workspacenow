package observer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// Client queries wsn-observer's API, mirroring agent-manager's observer client.
type Client interface {
	Health(ctx context.Context) error
	ListTraces(ctx context.Context, q TraceQuery) (*TraceList, error)
	TraceSpans(ctx context.Context, traceID string, q TraceQuery) (*SpanList, error)
	SpanDetails(ctx context.Context, traceID, spanID string) (*Span, error)
	ListLogs(ctx context.Context, q LogQuery) (*LogList, error)
	ListMetrics(ctx context.Context, q MetricQuery) (*MetricList, error)
}

// TraceQuery is the POST body of the trace and span queries.
type TraceQuery struct {
	ServiceName string    `json:"serviceName,omitempty"`
	StartTime   time.Time `json:"startTime,omitempty"`
	EndTime     time.Time `json:"endTime,omitempty"`
	Limit       int       `json:"limit,omitempty"`
	Offset      int       `json:"offset,omitempty"`
	SortOrder   string    `json:"sortOrder,omitempty"`
}

// LogQuery is the POST body of the logs query.
type LogQuery struct {
	ServiceName string    `json:"serviceName,omitempty"`
	Level       string    `json:"level,omitempty"`
	Q           string    `json:"q,omitempty"`
	TraceID     string    `json:"traceId,omitempty"`
	StartTime   time.Time `json:"startTime,omitempty"`
	EndTime     time.Time `json:"endTime,omitempty"`
	Limit       int       `json:"limit,omitempty"`
	Offset      int       `json:"offset,omitempty"`
	SortOrder   string    `json:"sortOrder,omitempty"`
}

// MetricQuery is the POST body of the metrics query.
type MetricQuery struct {
	ServiceName string    `json:"serviceName,omitempty"`
	Name        string    `json:"name,omitempty"`
	StartTime   time.Time `json:"startTime,omitempty"`
	EndTime     time.Time `json:"endTime,omitempty"`
	Limit       int       `json:"limit,omitempty"`
	Offset      int       `json:"offset,omitempty"`
	SortOrder   string    `json:"sortOrder,omitempty"`
}

// TraceList is the observer's trace-query response.
type TraceList struct {
	Traces     []TraceOverview `json:"traces"`
	TotalCount int             `json:"totalCount"`
}

// SpanList is the observer's span-query response.
type SpanList struct {
	Spans      []spanWire `json:"spans"`
	TotalCount int        `json:"totalCount"`
}

// LogList is the observer's logs-query response.
type LogList struct {
	Logs       []LogRecord `json:"logs"`
	TotalCount int         `json:"totalCount"`
}

// MetricList is the observer's metrics-query response.
type MetricList struct {
	Metrics    []MetricPoint `json:"metrics"`
	TotalCount int           `json:"totalCount"`
}

// spanWire decodes a queried span, including its string-valued attributes.
type spanWire struct {
	TraceID      string            `json:"traceId"`
	SpanID       string            `json:"spanId"`
	ParentSpanID string            `json:"parentSpanId"`
	Name         string            `json:"name"`
	Service      string            `json:"service"`
	Kind         string            `json:"kind"`
	Status       string            `json:"status"`
	Start        time.Time         `json:"startTime"`
	End          time.Time         `json:"endTime"`
	DurationNs   int64             `json:"durationNs"`
	Attributes   map[string]string `json:"attributes"`
}

type client struct {
	baseURL string
	token   string
	hc      *http.Client
}

// NewClient builds the query client; an empty baseURL returns a client whose calls fail fast.
func NewClient(baseURL, token string) Client {
	return &client{baseURL: baseURL, token: token, hc: &http.Client{Timeout: 5 * time.Second}}
}

func (c *client) Health(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/healthz", nil)
	if err != nil {
		return fmt.Errorf("observer health: %w", err)
	}
	c.setAuth(req)
	resp, err := c.hc.Do(req)
	if err != nil {
		return fmt.Errorf("observer health: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("observer health: status %d", resp.StatusCode)
	}
	return nil
}

func (c *client) ListTraces(ctx context.Context, q TraceQuery) (*TraceList, error) {
	var out TraceList
	if err := c.post(ctx, "/api/v1/traces/query", q, &out); err != nil {
		return nil, fmt.Errorf("observer.ListTraces: %w", err)
	}
	return &out, nil
}

func (c *client) TraceSpans(ctx context.Context, traceID string, q TraceQuery) (*SpanList, error) {
	var out SpanList
	path := "/api/v1/traces/" + url.PathEscape(traceID) + "/spans/query"
	if err := c.post(ctx, path, q, &out); err != nil {
		return nil, fmt.Errorf("observer.TraceSpans: %w", err)
	}
	return &out, nil
}

func (c *client) SpanDetails(ctx context.Context, traceID, spanID string) (*Span, error) {
	var out spanWire
	path := "/api/v1/traces/" + url.PathEscape(traceID) + "/spans/" + url.PathEscape(spanID)
	if err := c.get(ctx, path, &out); err != nil {
		return nil, fmt.Errorf("observer.SpanDetails: %w", err)
	}
	return &Span{
		TraceID: out.TraceID, SpanID: out.SpanID, ParentSpanID: out.ParentSpanID, Name: out.Name,
		Kind: out.Kind, Status: out.Status, Start: out.Start, End: out.End, Attributes: out.Attributes,
	}, nil
}

func (c *client) ListLogs(ctx context.Context, q LogQuery) (*LogList, error) {
	var out LogList
	if err := c.post(ctx, "/api/v1/logs/query", q, &out); err != nil {
		return nil, fmt.Errorf("observer.ListLogs: %w", err)
	}
	return &out, nil
}

func (c *client) ListMetrics(ctx context.Context, q MetricQuery) (*MetricList, error) {
	var out MetricList
	if err := c.post(ctx, "/api/v1/metrics/query", q, &out); err != nil {
		return nil, fmt.Errorf("observer.ListMetrics: %w", err)
	}
	return &out, nil
}

func (c *client) setAuth(req *http.Request) {
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
}

func (c *client) post(ctx context.Context, path string, body any, out any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal query: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	c.setAuth(req)
	return c.do(req, out)
}

func (c *client) get(ctx context.Context, path string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return err
	}
	c.setAuth(req)
	return c.do(req, out)
}

func (c *client) do(req *http.Request, out any) error {
	resp, err := c.hc.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("status %d: %s", resp.StatusCode, string(raw))
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}
	return nil
}
