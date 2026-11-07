package connect

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// Webhook is an outbound subscription: matching events are POSTed to URL, signed.
type Webhook struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Events    []string  `json:"events"` // event type prefixes; empty = all
	Secret    string    `json:"secret,omitempty"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Delivery is one webhook call attempt record; retries and replay update it in place.
type Delivery struct {
	ID          string     `json:"id"`
	WebhookID   string     `json:"webhookId"`
	EventID     string     `json:"eventId"`
	EventType   string     `json:"eventType"`
	Status      string     `json:"status"` // pending, delivered, failed
	Attempts    int        `json:"attempts"`
	LastStatus  int        `json:"lastStatus,omitempty"`
	LastError   string     `json:"lastError,omitempty"`
	DeliveredAt *time.Time `json:"deliveredAt,omitempty"`
	NextRetryAt *time.Time `json:"nextRetryAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

// signPayload builds the X-WSN-Signature header value: t=<unix>,v1=<hex hmac>.
func signPayload(secret string, ts int64, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = fmt.Fprintf(mac, "%d.", ts)
	_, _ = mac.Write(body)
	return fmt.Sprintf("t=%d,v1=%s", ts, hex.EncodeToString(mac.Sum(nil)))
}

// verifyPayload checks a signature header against the secret and body, with a tolerance window.
func verifyPayload(secret, header string, body []byte, now int64, tolerance time.Duration) bool {
	var ts int64
	var sig string
	for _, part := range strings.Split(header, ",") {
		if v, ok := strings.CutPrefix(part, "t="); ok {
			_, _ = fmt.Sscan(v, &ts)
		}
		if v, ok := strings.CutPrefix(part, "v1="); ok {
			sig = v
		}
	}
	if sig == "" || ts == 0 {
		return false
	}
	if tolerance > 0 && now-ts > int64(tolerance.Seconds()) {
		return false
	}
	return hmac.Equal([]byte(signPayload(secret, ts, body)), []byte(fmt.Sprintf("t=%d,v1=%s", ts, sig)))
}

// matchesEvent reports whether the webhook subscribes to the event type ("Sale.Created" matches "Sale" and "Sale.Created").
func matchesEvent(hook *Webhook, eventType string) bool {
	if len(hook.Events) == 0 {
		return true
	}
	for _, e := range hook.Events {
		if e == eventType || strings.HasPrefix(eventType, e+".") || eventType == e {
			return true
		}
	}
	return false
}

// backoff returns the delay before attempt n (1-based), capped.
func backoff(attempt int) time.Duration {
	d := time.Duration(1<<min(attempt-1, 9)) * time.Second
	if d > 5*time.Minute {
		d = 5 * time.Minute
	}
	return d
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Dispatcher polls the event log and delivers matching events to webhooks.
type Dispatcher struct {
	db       *gorm.DB
	hooks    *docstore.Collection[Webhook]
	delivery *docstore.Collection[Delivery]
	http     *http.Client
	lastSeq  int64
}

func NewDispatcher(db *gorm.DB, httpClient *http.Client) *Dispatcher {
	return &Dispatcher{
		db:       db,
		hooks:    docstore.NewCollection(db, "webhooks", func(w *Webhook) string { return w.ID }),
		delivery: docstore.NewCollection(db, "webhook_deliveries", func(d *Delivery) string { return d.ID }),
		http:     httpClient,
	}
}

// Run polls until ctx ends; call once in a goroutine from the server role.
func (d *Dispatcher) Run(ctx context.Context, interval time.Duration) error {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		if err := d.poll(ctx); err != nil && ctx.Err() == nil {
			slog.Debug("webhook poll failed; retrying next tick", "error", err)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:
		}
	}
}

// poll delivers new events and retries due deliveries once.
func (d *Dispatcher) poll(ctx context.Context) error {
	var events []models.Event
	if err := d.db.WithContext(ctx).Where("seq > ?", d.lastSeq).Order("seq").Limit(200).Find(&events).Error; err != nil {
		return err
	}
	hooks, err := d.hooks.List(ctx)
	if err != nil {
		return err
	}
	active := make([]*Webhook, 0, len(hooks))
	for i := range hooks {
		if hooks[i].Active {
			active = append(active, &hooks[i])
		}
	}
	for _, ev := range events {
		d.lastSeq = ev.Seq
		body, _ := json.Marshal(map[string]any{"id": ev.ID, "type": ev.Type, "source": ev.Source, "traceId": ev.TraceID, "time": ev.Time, "payload": json.RawMessage(ev.Payload)})
		for _, h := range active {
			if !matchesEvent(h, ev.Type) {
				continue
			}
			// dedupe: one delivery per webhook+event
			n, err := d.delivery.Count(ctx, "doc->>'webhookId' = ? AND doc->>'eventId' = ?", h.ID, ev.ID)
			if err != nil {
				return err
			}
			if n > 0 {
				continue
			}
			now := time.Now().UTC()
			dl := &Delivery{ID: kernel.NewID("dlv"), WebhookID: h.ID, EventID: ev.ID, EventType: ev.Type, Status: "pending", CreatedAt: now}
			if err := d.delivery.Put(ctx, dl); err != nil {
				return err
			}
			if err := d.send(ctx, h, dl, body); err != nil {
				return err
			}
		}
	}
	// retry due pending/failed deliveries
	return d.retryDue(ctx)
}

func (d *Dispatcher) retryDue(ctx context.Context) error {
	all, err := d.delivery.List(ctx)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	for i := range all {
		dl := &all[i]
		if dl.Status == "delivered" || dl.NextRetryAt == nil || dl.NextRetryAt.After(now) {
			continue
		}
		h, err := d.hooks.Get(ctx, dl.WebhookID)
		if err != nil {
			continue
		}
		var ev models.Event
		if err := d.db.WithContext(ctx).Where("id = ?", dl.EventID).Take(&ev).Error; err != nil {
			continue
		}
		body, _ := json.Marshal(map[string]any{"id": ev.ID, "type": ev.Type, "source": ev.Source, "traceId": ev.TraceID, "time": ev.Time, "payload": json.RawMessage(ev.Payload)})
		_ = d.send(ctx, h, dl, body)
	}
	return nil
}

// send performs one delivery attempt and records the outcome.
func (d *Dispatcher) send(ctx context.Context, h *Webhook, dl *Delivery, body []byte) error {
	dl.Attempts++
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.URL, strings.NewReader(string(body)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-WSN-Event", dl.EventType)
	req.Header.Set("X-WSN-Delivery", dl.ID)
	if h.Secret != "" {
		req.Header.Set("X-WSN-Signature", signPayload(h.Secret, time.Now().Unix(), body))
	}
	resp, err := d.http.Do(req)
	now := time.Now().UTC()
	if err != nil {
		dl.Status = "failed"
		dl.LastError = err.Error()
		next := now.Add(backoff(dl.Attempts))
		dl.NextRetryAt = &next
	} else {
		dl.LastStatus = resp.StatusCode
		_ = resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			dl.Status = "delivered"
			dl.DeliveredAt = &now
			dl.NextRetryAt = nil
			dl.LastError = ""
		} else {
			dl.Status = "failed"
			dl.LastError = fmt.Sprintf("answered %d", resp.StatusCode)
			next := now.Add(backoff(dl.Attempts))
			dl.NextRetryAt = &next
		}
	}
	return d.delivery.Put(ctx, dl)
}

// Replay resets a delivery to pending so the dispatcher sends it again.
func (d *Dispatcher) Replay(ctx context.Context, webhookID, deliveryID string) (*Delivery, error) {
	dl, err := d.delivery.Get(ctx, deliveryID)
	if err != nil {
		return nil, err
	}
	if dl.WebhookID != webhookID {
		return nil, kernel.NotFound("Delivery not found")
	}
	dl.Status = "pending"
	dl.NextRetryAt = nil
	dl.LastError = ""
	if err := d.delivery.Put(ctx, dl); err != nil {
		return nil, err
	}
	return dl, nil
}

// Test sends a synthetic event to the webhook and returns the delivery.
func (d *Dispatcher) Test(ctx context.Context, h *Webhook) (*Delivery, error) {
	now := time.Now().UTC()
	body, _ := json.Marshal(map[string]any{"id": kernel.NewID("evt"), "type": "Webhook.Test", "source": "webhook:" + h.ID, "time": now, "payload": map[string]any{"message": "WorkspaceNow webhook test"}})
	dl := &Delivery{ID: kernel.NewID("dlv"), WebhookID: h.ID, EventID: "test", EventType: "Webhook.Test", Status: "pending", CreatedAt: now}
	if err := d.delivery.Put(ctx, dl); err != nil {
		return nil, err
	}
	if err := d.send(ctx, h, dl, body); err != nil {
		return nil, err
	}
	return d.delivery.Get(ctx, dl.ID)
}

// DeliverOnce POSTs one signed payload to the webhook immediately (used by alerts) and returns
// the HTTP status. It does not write a delivery record.
func DeliverOnce(ctx context.Context, hc *http.Client, h *Webhook, eventType string, payload []byte) (int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.URL, strings.NewReader(string(payload)))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-WSN-Event", eventType)
	if h.Secret != "" {
		req.Header.Set("X-WSN-Signature", signPayload(h.Secret, time.Now().Unix(), payload))
	}
	resp, err := hc.Do(req)
	if err != nil {
		return 0, err
	}
	defer func() { _ = resp.Body.Close() }()
	return resp.StatusCode, nil
}
