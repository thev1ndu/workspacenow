package obs

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/config"
	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/connect"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

/* ---- alerts on audit/event patterns ---- */

// AlertRule pages (via webhook) when matching audit or event records cross the threshold in the window.
type AlertRule struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Source        string    `json:"source"`            // "audit" or "event"
	Action        string    `json:"action"`            // audit action or event type, e.g. "approval.decision" / "Stock.LowStockReached"
	Outcome       string    `json:"outcome,omitempty"` // audit outcome filter, e.g. "denied"
	Threshold     int       `json:"threshold"`
	WindowMinutes int       `json:"windowMinutes"`
	WebhookID     string    `json:"webhookId,omitempty"`
	Active        bool      `json:"active"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// AlertFire is one triggered alert; ack closes it.
type AlertFire struct {
	ID        string     `json:"id"`
	RuleID    string     `json:"ruleId"`
	FiredAt   time.Time  `json:"firedAt"`
	Count     int        `json:"count"`
	Status    string     `json:"status"` // firing, acked
	AckedBy   string     `json:"ackedBy,omitempty"`
	AckedAt   *time.Time `json:"ackedAt,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

// ruleFires decides whether a count in the window crosses the rule's threshold.
func ruleFires(rule *AlertRule, count int) bool {
	return rule.Active && rule.Threshold > 0 && count >= rule.Threshold
}

// evaluateRule counts matching audit/event rows in the rule's window.
func (s *service) countMatches(ctx context.Context, rule *AlertRule, now time.Time) (int, error) {
	from := now.Add(-time.Duration(rule.WindowMinutes) * time.Minute)
	if rule.Source == "event" {
		var n int64
		err := s.db.WithContext(ctx).Model(&models.Event{}).Where("type = ? AND time >= ?", rule.Action, from).Count(&n).Error
		return int(n), err
	}
	q := s.db.WithContext(ctx).Model(&models.AuditRecord{}).Where("action = ? AND time >= ?", rule.Action, from)
	if rule.Outcome != "" {
		q = q.Where("outcome = ?", rule.Outcome)
	}
	var n int64
	err := q.Count(&n).Error
	return int(n), err
}

// EvaluateAlerts runs one pass: fire rules whose window count crossed the threshold and that have
// no open fire. Returns the fires created. Called by the evaluator goroutine and in tests.
func (s *service) EvaluateAlerts(ctx context.Context, now time.Time) ([]AlertFire, error) {
	rules, err := s.alertRules.List(ctx)
	if err != nil {
		return nil, err
	}
	fires, err := s.alertFires.List(ctx)
	if err != nil {
		return nil, err
	}
	open := map[string]bool{}
	for _, f := range fires {
		if f.Status == "firing" {
			open[f.RuleID] = true
		}
	}
	var out []AlertFire
	for i := range rules {
		r := &rules[i]
		if !r.Active || open[r.ID] {
			continue
		}
		count, err := s.countMatches(ctx, r, now)
		if err != nil {
			return out, err
		}
		if !ruleFires(r, count) {
			continue
		}
		fire := AlertFire{ID: kernel.NewID("fire"), RuleID: r.ID, FiredAt: now, Count: count, Status: "firing", CreatedAt: now}
		if err := s.alertFires.Put(ctx, &fire); err != nil {
			return out, err
		}
		out = append(out, fire)
		s.notify(ctx, r, &fire)
	}
	return out, nil
}

// notify delivers the fire to the rule's webhook and emits an Alert.Fired event.
func (s *service) notify(ctx context.Context, rule *AlertRule, fire *AlertFire) {
	payload, _ := json.Marshal(map[string]any{
		"alert": rule.Name, "ruleId": rule.ID, "fireId": fire.ID,
		"count": fire.Count, "windowMinutes": rule.WindowMinutes, "firedAt": fire.FiredAt,
	})
	if rule.WebhookID != "" {
		hooks, err := s.connect.Webhooks(ctx)
		if err == nil {
			for i := range hooks {
				if hooks[i].ID == rule.WebhookID && hooks[i].Active {
					_, _ = connect.DeliverOnce(ctx, s.hc, &hooks[i], "Alert.Fired", payload)
				}
			}
		}
	}
	_, _ = s.publisher.Publish(ctx, kernel.ExecutionContext{Actor: kernel.Actor{Kind: kernel.ActorSystem, ID: "alerts", Name: "Alerting"}, TraceID: fire.ID}, "Alert.Fired", "alert/"+rule.ID, map[string]any{"fireId": fire.ID, "count": fire.Count})
}

/* ---- SLOs per business operation ---- */

// SLO is a service-level objective for one business operation.
type SLO struct {
	ID            string    `json:"id"`
	Operation     string    `json:"operation"`
	TargetSuccess float64   `json:"targetSuccess"` // 0..1
	TargetP95Ms   int       `json:"targetP95Ms"`
	WindowMinutes int       `json:"windowMinutes"`
	CreatedAt     time.Time `json:"createdAt"`
}

// latencyBuckets are the upper bounds (ms) of the SLO latency histogram buckets.
var latencyBuckets = []int64{50, 100, 200, 500, 1000, 2000, 5000, 10000}

// bucketOf returns the bucket index for a duration in ms.
func bucketOf(ms int64) int {
	for i, b := range latencyBuckets {
		if ms <= b {
			return i
		}
	}
	return len(latencyBuckets) // overflow bucket
}

// p95FromBuckets estimates p95 from histogram bucket counts (cumulative).
func p95FromBuckets(counts []int64, total int64) int64 {
	if total == 0 {
		return 0
	}
	need := int64(float64(total) * 0.95)
	var cum int64
	for i, c := range counts {
		cum += c
		if cum >= need {
			if i == 0 {
				return latencyBuckets[0] / 2
			}
			return latencyBuckets[i]
		}
	}
	return latencyBuckets[len(latencyBuckets)-1]
}

// RecordSLOCall is the engine OnInvoke hook: it bumps the operation's window counters in Valkey.
func (s *service) RecordSLOCall(ctx context.Context, operation string, d time.Duration, failed bool) {
	if s.cache == nil {
		return
	}
	ms := d.Milliseconds()
	b := bucketOf(ms)
	key := fmt.Sprintf("wsn:slo:%s:%d", operation, time.Now().Unix()/60)
	_, _ = s.cache.IncrWindow(ctx, key+":total", time.Hour)
	_, _ = s.cache.IncrWindow(ctx, fmt.Sprintf("%s:b%d", key, b), time.Hour)
	if failed {
		_, _ = s.cache.IncrWindow(ctx, key+":err", time.Hour)
	}
}

// SLOStatus measures one SLO against the counters of the last windowMinutes.
func (s *service) SLOStatus(ctx context.Context, slo *SLO, now time.Time) (map[string]any, error) {
	if s.cache == nil {
		return nil, kernel.InvalidState("no cache configured")
	}
	var total, errs int64
	buckets := make([]int64, len(latencyBuckets)+1)
	for m := 0; m < slo.WindowMinutes; m++ {
		key := fmt.Sprintf("wsn:slo:%s:%d", slo.Operation, (now.Unix()-int64(m)*60)/60)
		for i := range buckets {
			if v, found, err := s.cache.Get(ctx, fmt.Sprintf("%s:b%d", key, i)); err == nil && found {
				var n int64
				_, _ = fmt.Sscan(v, &n)
				buckets[i] += n
			}
		}
		if v, found, err := s.cache.Get(ctx, key+":total"); err == nil && found {
			_, _ = fmt.Sscan(v, &total)
		}
		if v, found, err := s.cache.Get(ctx, key+":err"); err == nil && found {
			_, _ = fmt.Sscan(v, &errs)
		}
	}
	success := 1.0
	if total > 0 {
		success = float64(total-errs) / float64(total)
	}
	p95 := p95FromBuckets(buckets, total)
	breached := total > 0 && (success < slo.TargetSuccess || p95 > int64(slo.TargetP95Ms))
	return map[string]any{
		"sloId": slo.ID, "operation": slo.Operation, "windowMinutes": slo.WindowMinutes,
		"calls": total, "errors": errs, "successRate": success, "targetSuccessRate": slo.TargetSuccess,
		"p95Ms": p95, "targetP95Ms": slo.TargetP95Ms, "breached": breached,
	}, nil
}

/* ---- status page ---- */

// Status aggregates component health into the public status-page payload.
func (s *service) Status(ctx context.Context) map[string]any {
	signals, err := s.Health(ctx)
	status := "healthy"
	if err != nil {
		status = "unknown"
	}
	for _, sig := range signals {
		if sig.Status == "down" {
			status = "down"
			break
		}
		if sig.Status == "degraded" && status != "down" {
			status = "degraded"
		}
	}
	return map[string]any{
		"status":        status,
		"service":       s.serviceName,
		"version":       configVersion(),
		"uptimeSeconds": int(time.Since(startedAt).Seconds()),
		"time":          time.Now().UTC(),
		"components":    signals,
	}
}

/* ---- backups (records of the -backup role) ---- */

// BackupRecord is one pg_dump uploaded to object storage by the -backup role.
type BackupRecord struct {
	ID         string     `json:"id"`
	StartedAt  time.Time  `json:"startedAt"`
	FinishedAt *time.Time `json:"finishedAt,omitempty"`
	SizeBytes  int64      `json:"sizeBytes"`
	S3Key      string     `json:"s3Key"`
	Status     string     `json:"status"` // running, done, failed
	Note       string     `json:"note,omitempty"`
}

var startedAt = time.Now()

func configVersion() string { return config.Version }

/* ---- alert rule CRUD ---- */

func (s *service) AlertRules(ctx context.Context) ([]AlertRule, error) { return s.alertRules.List(ctx) }

func (s *service) CreateAlertRule(ctx context.Context, ec kernel.ExecutionContext, r AlertRule) (*AlertRule, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "alert.create", "alert"); err != nil {
		return nil, err
	}
	if r.Name == "" || r.Action == "" || r.Threshold <= 0 || r.WindowMinutes <= 0 {
		return nil, kernel.Invalid("An alert needs a name, an action or event type, a threshold and a window in minutes")
	}
	if r.Source == "" {
		r.Source = "audit"
	}
	now := time.Now().UTC()
	r.ID, r.Active, r.CreatedAt, r.UpdatedAt = kernel.NewID("alr"), true, now, now
	if err := s.alertRules.Put(ctx, &r); err != nil {
		return nil, err
	}
	return &r, s.auditor.Record(ctx, ec, "alert.create", "alert/"+r.ID, kernel.OutcomeAllowed, r.Name)
}

func (s *service) UpdateAlertRule(ctx context.Context, ec kernel.ExecutionContext, id string, r AlertRule) (*AlertRule, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "alert.update", "alert/"+id); err != nil {
		return nil, err
	}
	cur, err := s.alertRules.Get(ctx, id)
	if err != nil {
		return nil, notFound(err, "Alert rule not found")
	}
	cur.Name, cur.Source, cur.Action, cur.Outcome, cur.Threshold, cur.WindowMinutes, cur.WebhookID, cur.Active, cur.UpdatedAt =
		r.Name, r.Source, r.Action, r.Outcome, r.Threshold, r.WindowMinutes, r.WebhookID, r.Active, time.Now().UTC()
	if err := s.alertRules.Put(ctx, cur); err != nil {
		return nil, err
	}
	return cur, s.auditor.Record(ctx, ec, "alert.update", "alert/"+id, kernel.OutcomeAllowed, cur.Name)
}

func (s *service) DeleteAlertRule(ctx context.Context, ec kernel.ExecutionContext, id string) error {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "alert.delete", "alert/"+id); err != nil {
		return err
	}
	if _, err := s.alertRules.Get(ctx, id); err != nil {
		return notFound(err, "Alert rule not found")
	}
	if err := s.alertRules.Delete(ctx, id); err != nil {
		return err
	}
	return s.auditor.Record(ctx, ec, "alert.delete", "alert/"+id, kernel.OutcomeAllowed, "")
}

func (s *service) AlertFires(ctx context.Context, ruleID string) ([]AlertFire, error) {
	return s.alertFires.Where(ctx, "doc->>'ruleId' = ?", ruleID)
}

func (s *service) AckFire(ctx context.Context, ec kernel.ExecutionContext, ruleID, fireID string) (*AlertFire, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "alert.ack", "alert/"+ruleID+"/"+fireID); err != nil {
		return nil, err
	}
	f, err := s.alertFires.Get(ctx, fireID)
	if err != nil || f.RuleID != ruleID {
		return nil, kernel.NotFound("Alert fire not found")
	}
	now := time.Now().UTC()
	f.Status, f.AckedBy, f.AckedAt = "acked", ec.Actor.Name, &now
	if err := s.alertFires.Put(ctx, f); err != nil {
		return nil, err
	}
	return f, s.auditor.Record(ctx, ec, "alert.ack", "alert/"+ruleID+"/"+fireID, kernel.OutcomeAllowed, "")
}

/* ---- SLO CRUD ---- */

func (s *service) SLOs(ctx context.Context) ([]SLO, error) { return s.slos.List(ctx) }

func (s *service) CreateSLO(ctx context.Context, ec kernel.ExecutionContext, in SLO) (*SLO, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "slo.create", "slo"); err != nil {
		return nil, err
	}
	if in.Operation == "" || in.TargetSuccess <= 0 || in.TargetP95Ms <= 0 || in.WindowMinutes <= 0 {
		return nil, kernel.Invalid("An SLO needs an operation, a success target, a p95 target (ms) and a window in minutes")
	}
	in.ID, in.CreatedAt = kernel.NewID("slo"), time.Now().UTC()
	if err := s.slos.Put(ctx, &in); err != nil {
		return nil, err
	}
	return &in, s.auditor.Record(ctx, ec, "slo.create", "slo/"+in.ID, kernel.OutcomeAllowed, in.Operation)
}

func (s *service) SLOStatusByID(ctx context.Context, id string) (map[string]any, error) {
	slo, err := s.slos.Get(ctx, id)
	if err != nil {
		return nil, notFound(err, "SLO not found")
	}
	return s.SLOStatus(ctx, slo, time.Now().UTC())
}

/* ---- backups ---- */

func (s *service) Backups(ctx context.Context) ([]BackupRecord, error) { return s.backups.List(ctx) }

func notFound(err error, msg string) error {
	if err == docstore.ErrNotFound {
		return kernel.NotFound("%s", msg)
	}
	return err
}
