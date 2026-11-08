// Package obs serves the observability endpoints: events, audit, traces and health.
package obs

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/nats-io/nats.go"
	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/connect"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/identity"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/cache"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/observer"
)

const (
	eventsLimitMax     = 500
	auditLimitMax      = 500
	tracesScanMax      = 1000
	errorGroupsMax     = 200
	errorGroupsDefault = 50
)

// ErrorGroupQuery is one error-group query proxied to wsn-observer.
type ErrorGroupQuery struct {
	Q       string
	Service string
	Limit   int
	Offset  int
}

// Service reads the observability data: Postgres for events and audit, wsn-observer for spans.
type Service interface {
	Events(ctx context.Context, applicationID string, limit, offset int) ([]oapi.PlatformEvent, int, error)
	Audit(ctx context.Context, params oapi.ListAuditParams) ([]oapi.AuditRecord, error)
	Traces(ctx context.Context, q string, limit, offset int) ([]oapi.TraceSummary, int, error)
	Trace(ctx context.Context, traceID string) (*oapi.Trace, error)
	ListErrorGroups(ctx context.Context, q ErrorGroupQuery) ([]oapi.ErrorGroup, int, error)
	ListObservedServices(ctx context.Context) ([]oapi.ServiceStat, error)
	Health(ctx context.Context) ([]oapi.HealthSignal, error)
	Overview(ctx context.Context) (*oapi.OverviewStats, error)
	Resources(ctx context.Context) ([]oapi.ResourceSummary, error)
	Search(ctx context.Context, ec kernel.ExecutionContext, q string, limit int) ([]oapi.SearchHit, error)
	Activity(ctx context.Context, days int) ([]oapi.ActivityPoint, error)
	LogMetrics(ctx context.Context, days int) ([]oapi.LogMetricPoint, error)
	TokenUsage(ctx context.Context, days int) ([]oapi.TokenUsagePoint, error)
	EntryPoints(ctx context.Context) ([]oapi.EntryPointBreakdown, error)
	// Alerts: rules over audit/event patterns, fires, ack.
	AlertRules(ctx context.Context) ([]AlertRule, error)
	CreateAlertRule(ctx context.Context, ec kernel.ExecutionContext, r AlertRule) (*AlertRule, error)
	UpdateAlertRule(ctx context.Context, ec kernel.ExecutionContext, id string, r AlertRule) (*AlertRule, error)
	DeleteAlertRule(ctx context.Context, ec kernel.ExecutionContext, id string) error
	AlertFires(ctx context.Context, ruleID string) ([]AlertFire, error)
	AckFire(ctx context.Context, ec kernel.ExecutionContext, ruleID, fireID string) (*AlertFire, error)
	EvaluateAlerts(ctx context.Context, now time.Time) ([]AlertFire, error)
	// SLOs per business operation.
	SLOs(ctx context.Context) ([]SLO, error)
	CreateSLO(ctx context.Context, ec kernel.ExecutionContext, s SLO) (*SLO, error)
	SLOStatusByID(ctx context.Context, id string) (map[string]any, error)
	RecordSLOCall(ctx context.Context, operation string, d time.Duration, failed bool)
	// Status page + backups.
	Status(ctx context.Context) map[string]any
}

type service struct {
	db          *gorm.DB
	cache       cache.Cache
	nats        *nats.Conn
	obs         observer.Client
	serviceName string
	aiHealthURL string
	hc          *http.Client
	connect     connect.Service
	runtime     data.Runtime
	identity    identity.Service
	publisher   kernel.Publisher
	auditor     kernel.Auditor
	alertRules  *docstore.Collection[AlertRule]
	alertFires  *docstore.Collection[AlertFire]
	slos        *docstore.Collection[SLO]
}

// Deps are the obs service's collaborators.
type Deps struct {
	DB          *gorm.DB
	Cache       cache.Cache
	NATS        *nats.Conn // nil when the event bus is not connected
	Observer    observer.Client
	ServiceName string
	AIHealthURL string
	Connect     connect.Service
	Runtime     data.Runtime
	Identity    identity.Service
	Publisher   kernel.Publisher
	Auditor     kernel.Auditor
}

// NewService wires the obs service.
func NewService(d Deps) Service {
	return &service{
		db: d.DB, cache: d.Cache, nats: d.NATS, obs: d.Observer, serviceName: d.ServiceName,
		aiHealthURL: d.AIHealthURL, hc: &http.Client{Timeout: 3 * time.Second},
		connect: d.Connect, runtime: d.Runtime, identity: d.Identity, publisher: d.Publisher, auditor: d.Auditor,
		alertRules: docstore.NewCollection(d.DB, "alert_rules", func(a *AlertRule) string { return a.ID }),
		alertFires: docstore.NewCollection(d.DB, "alert_fires", func(a *AlertFire) string { return a.ID }),
		slos:       docstore.NewCollection(d.DB, "slos", func(s *SLO) string { return s.ID }),
	}
}

func (s *service) Events(ctx context.Context, applicationID string, limit, offset int) ([]oapi.PlatformEvent, int, error) {
	if limit < 1 || limit > eventsLimitMax {
		limit = 50
	}
	q := s.db.WithContext(ctx).Model(&models.Event{})
	if applicationID != "" {
		q = q.Where("payload->>'applicationId' = ?", applicationID)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count events: %w", err)
	}
	var rows []models.Event
	if err := q.Order("seq desc").Limit(limit).Offset(offset).Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list events: %w", err)
	}
	out := make([]oapi.PlatformEvent, 0, len(rows))
	for _, e := range rows {
		out = append(out, toEvent(e))
	}
	return out, int(total), nil
}

func toEvent(e models.Event) oapi.PlatformEvent {
	var payload map[string]any
	_ = json.Unmarshal(e.Payload, &payload)
	return oapi.PlatformEvent{Id: e.ID, Type: e.Type, Source: e.Source, TraceId: e.TraceID, Payload: payload, Time: e.Time}
}

func (s *service) Audit(ctx context.Context, params oapi.ListAuditParams) ([]oapi.AuditRecord, error) {
	q := s.db.WithContext(ctx).Model(&models.AuditRecord{})
	if params.ActorKind != nil {
		q = q.Where("actor_kind = ?", string(*params.ActorKind))
	}
	if params.Outcome != nil {
		q = q.Where("outcome = ?", string(*params.Outcome))
	}
	if params.Q != nil && *params.Q != "" {
		like := "%" + *params.Q + "%"
		q = q.Where("action ILIKE ? OR resource ILIKE ? OR detail ILIKE ? OR actor::text ILIKE ?", like, like, like, like)
	}
	var rows []models.AuditRecord
	if err := q.Order("seq desc").Limit(auditLimitMax).Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("list audit: %w", err)
	}
	out := make([]oapi.AuditRecord, 0, len(rows))
	for _, r := range rows {
		out = append(out, toAudit(r))
	}
	return out, nil
}

func toAudit(r models.AuditRecord) oapi.AuditRecord {
	var actor oapi.Actor
	_ = json.Unmarshal(r.Actor, &actor)
	var detail *string
	if r.Detail != "" {
		detail = &r.Detail
	}
	return oapi.AuditRecord{
		Id: r.ID, TraceId: r.TraceID, Time: r.Time, Actor: actor,
		EntryPoint: oapi.EntryPoint(r.EntryPoint), Action: r.Action, Resource: r.Resource,
		Outcome: oapi.AuditRecordOutcome(r.Outcome), Detail: detail,
	}
}

// spanCounts maps trace id to span count from wsn-observer; best-effort, empty when it is down.
func (s *service) spanCounts(ctx context.Context) map[string]int {
	out := map[string]int{}
	list, err := s.obs.ListTraces(ctx, observer.TraceQuery{ServiceName: s.serviceName, Limit: tracesScanMax})
	if err != nil {
		return out
	}
	for _, t := range list.Traces {
		out[t.TraceID] = t.SpanCount
	}
	return out
}

func (s *service) Traces(ctx context.Context, q string, limit, offset int) ([]oapi.TraceSummary, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	db := s.db.WithContext(ctx).Model(&models.AuditRecord{})
	if q != "" {
		like := "%" + q + "%"
		db = db.Where("trace_id ILIKE ? OR action ILIKE ? OR resource ILIKE ? OR actor::text ILIKE ?", like, like, like, like)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count audit for traces: %w", err)
	}
	var rows []models.AuditRecord
	listQ := s.db.WithContext(ctx).Order("seq desc").Limit(tracesScanMax)
	if q != "" {
		like := "%" + q + "%"
		listQ = listQ.Where("trace_id ILIKE ? OR action ILIKE ? OR resource ILIKE ? OR actor::text ILIKE ?", like, like, like, like)
	}
	if err := listQ.Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list audit for traces: %w", err)
	}
	sums := summarize(rows, s.spanCounts(ctx))
	total = int64(len(sums))
	if offset >= len(sums) {
		return []oapi.TraceSummary{}, int(total), nil
	}
	end := len(sums)
	if offset+limit < end {
		end = offset + limit
	}
	return sums[offset:end], int(total), nil
}

// summarize groups newest-first audit rows into per-trace summaries, keeping first-seen order.
func summarize(rows []models.AuditRecord, spans map[string]int) []oapi.TraceSummary {
	byTrace := map[string]*oapi.TraceSummary{}
	var order []string
	for _, r := range rows {
		sum, ok := byTrace[r.TraceID]
		if !ok {
			sum = &oapi.TraceSummary{
				TraceId: r.TraceID, Title: r.Action, Actors: []string{actorName(r)},
				StartedAt: r.Time, EndedAt: r.Time, SpanCount: spans[r.TraceID],
			}
			byTrace[r.TraceID] = sum
			order = append(order, r.TraceID)
			continue
		}
		if !contains(sum.Actors, actorName(r)) {
			sum.Actors = append(sum.Actors, actorName(r))
		}
		if r.Time.Before(sum.StartedAt) {
			sum.StartedAt = r.Time
		}
		if r.Time.After(sum.EndedAt) {
			sum.EndedAt = r.Time
		}
		if r.Outcome == string(kernel.OutcomeDenied) {
			sum.Denied++
		}
	}
	out := make([]oapi.TraceSummary, 0, len(order))
	for _, id := range order {
		out = append(out, *byTrace[id])
	}
	return out
}

func actorName(r models.AuditRecord) string {
	var actor oapi.Actor
	_ = json.Unmarshal(r.Actor, &actor)
	return actor.Name
}

func contains(list []string, v string) bool {
	for _, item := range list {
		if item == v {
			return true
		}
	}
	return false
}

func (s *service) Trace(ctx context.Context, traceID string) (*oapi.Trace, error) {
	var auditRows []models.AuditRecord
	if err := s.db.WithContext(ctx).Where("trace_id = ?", traceID).Order("seq asc").Find(&auditRows).Error; err != nil {
		return nil, fmt.Errorf("list audit for trace: %w", err)
	}
	var eventRows []models.Event
	if err := s.db.WithContext(ctx).Where("trace_id = ?", traceID).Order("seq asc").Find(&eventRows).Error; err != nil {
		return nil, fmt.Errorf("list events for trace: %w", err)
	}
	if len(auditRows) == 0 && len(eventRows) == 0 {
		return nil, kernel.NotFound("Trace %s not found", traceID).WithTrace(traceID)
	}
	spanCount := 0
	if spans, err := s.obs.TraceSpans(ctx, traceID, observer.TraceQuery{Limit: tracesScanMax}); err == nil {
		spanCount = spans.TotalCount
	}
	return buildTrace(traceID, auditRows, eventRows, spanCount), nil
}

// buildTrace assembles one trace from its audit rows (oldest first) and events.
func buildTrace(traceID string, auditRows []models.AuditRecord, eventRows []models.Event, spanCount int) *oapi.Trace {
	audit := make([]oapi.AuditRecord, 0, len(auditRows))
	actors := []string{}
	denied := 0
	for _, r := range auditRows {
		audit = append(audit, toAudit(r))
		if !contains(actors, actorName(r)) {
			actors = append(actors, actorName(r))
		}
		if r.Outcome == string(kernel.OutcomeDenied) {
			denied++
		}
	}
	events := make([]oapi.PlatformEvent, 0, len(eventRows))
	for _, e := range eventRows {
		events = append(events, toEvent(e))
	}
	title := ""
	started, ended := time.Time{}, time.Time{}
	if len(auditRows) > 0 {
		title = auditRows[len(auditRows)-1].Action
		started, ended = auditRows[0].Time, auditRows[len(auditRows)-1].Time
	}
	if len(eventRows) > 0 {
		if title == "" {
			title = eventRows[0].Type
		}
		if started.IsZero() || eventRows[0].Time.Before(started) {
			started = eventRows[0].Time
		}
		if eventRows[len(eventRows)-1].Time.After(ended) {
			ended = eventRows[len(eventRows)-1].Time
		}
	}
	return &oapi.Trace{
		TraceId: traceID, Title: title, Actors: actors, Audit: audit, Events: events,
		Denied: denied, SpanCount: spanCount, StartedAt: started, EndedAt: ended,
	}
}

// Health checks every dependency the API needs and reports one signal each.
func (s *service) Health(ctx context.Context) ([]oapi.HealthSignal, error) {
	signals := []oapi.HealthSignal{
		s.check(ctx, oapi.HealthSignalKindDatabase, "postgres", s.pingDB),
		s.check(ctx, oapi.HealthSignalKindDatabase, "valkey", s.pingCache),
		s.check(ctx, oapi.HealthSignalKindIntegration, "nats", s.pingNATS),
		s.check(ctx, oapi.HealthSignalKindIntegration, "wsn-observer", s.obs.Health),
		s.check(ctx, oapi.HealthSignalKindAgent, "wsn-ai-service", s.pingAI),
	}
	return signals, nil
}

func (s *service) check(ctx context.Context, kind oapi.HealthSignalKind, resource string, ping func(context.Context) error) oapi.HealthSignal {
	checkCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	signal := oapi.HealthSignal{Kind: kind, Resource: resource, Status: oapi.HealthSignalStatusHealthy, Detail: "ok"}
	if err := ping(checkCtx); err != nil {
		signal.Status = oapi.HealthSignalStatusDown
		signal.Detail = err.Error()
	}
	return signal
}

func (s *service) pingDB(ctx context.Context) error {
	if s.db == nil {
		return fmt.Errorf("not connected")
	}
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}

func (s *service) pingCache(ctx context.Context) error {
	if s.cache == nil {
		return fmt.Errorf("not connected")
	}
	return s.cache.Ping(ctx)
}

func (s *service) pingNATS(ctx context.Context) error {
	if s.nats == nil {
		return fmt.Errorf("not connected")
	}
	if s.nats.Status() != nats.CONNECTED {
		return fmt.Errorf("status %s", s.nats.Status())
	}
	return s.nats.FlushWithContext(ctx)
}

func (s *service) pingAI(ctx context.Context) error {
	hc := s.hc
	if hc == nil {
		hc = http.DefaultClient
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.aiHealthURL, nil)
	if err != nil {
		return err
	}
	resp, err := hc.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("status %d", resp.StatusCode)
	}
	return nil
}
