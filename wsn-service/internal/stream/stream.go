// Package stream serves platform events to browsers as server-sent events.
package stream

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

const (
	heartbeat  = 20 * time.Second
	clientBuf  = 256
	replayMax  = 500
	retryDelay = 3000
)

// Hub fans one NATS subscription out to every connected browser in this replica.
type Hub struct {
	db *gorm.DB
	rt data.Runtime

	mu      sync.RWMutex
	clients map[chan kernel.Event]struct{}
}

func NewHub(db *gorm.DB, rt data.Runtime) *Hub {
	return &Hub{db: db, rt: rt, clients: map[chan kernel.Event]struct{}{}}
}

// Run delivers every published event to connected clients until ctx ends.
func (h *Hub) Run(ctx context.Context, nc *nats.Conn) error {
	sub, err := nc.Subscribe(kernel.SubjectPrefix+">", func(m *nats.Msg) {
		var e kernel.Event
		if err := json.Unmarshal(m.Data, &e); err != nil {
			slog.Warn("stream: undecodable event", "subject", m.Subject, "error", err)
			return
		}
		h.broadcast(e)
	})
	if err != nil {
		return fmt.Errorf("subscribe events: %w", err)
	}
	<-ctx.Done()
	return sub.Unsubscribe()
}

func (h *Hub) broadcast(e kernel.Event) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		select {
		case c <- e:
		default:
			// A client too slow to keep up misses events; it resumes from Last-Event-ID on reconnect.
		}
	}
}

func (h *Hub) add() chan kernel.Event {
	c := make(chan kernel.Event, clientBuf)
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
	return c
}

func (h *Hub) remove(c chan kernel.Event) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
}

// StreamEvents is GET /events/stream.
func (h *Hub) StreamEvents(w http.ResponseWriter, r *http.Request, params oapi.StreamEventsParams) {
	caller := httpx.Caller(r)
	rc := http.NewResponseController(w)
	// Event streams outlive the server's write timeout.
	_ = rc.SetWriteDeadline(time.Time{})

	events := h.add()
	defer h.remove(events)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	_, _ = fmt.Fprintf(w, "retry: %d\n\n", retryDelay)

	visible := h.visibility(r.Context(), caller)
	if params.LastEventID != nil && *params.LastEventID != "" {
		for _, e := range h.since(r.Context(), *params.LastEventID) {
			if out, ok := visible(e); ok {
				write(w, out)
			}
		}
	}
	if err := rc.Flush(); err != nil {
		return
	}

	tick := time.NewTicker(heartbeat)
	defer tick.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-tick.C:
			_, _ = fmt.Fprint(w, ": keep-alive\n\n")
		case e := <-events:
			out, ok := visible(e)
			if !ok {
				continue
			}
			write(w, out)
		}
		if err := rc.Flush(); err != nil {
			return
		}
	}
}

func write(w http.ResponseWriter, e kernel.Event) {
	b, err := json.Marshal(e)
	if err != nil {
		return
	}
	_, _ = fmt.Fprintf(w, "id: %s\nevent: %s\ndata: %s\n\n", e.ID, e.Type, b)
}

// visibility decides what a caller sees of each event.
func (h *Hub) visibility(ctx context.Context, caller *kernel.Caller) func(kernel.Event) (kernel.Event, bool) {
	perms := map[string]string{}
	if entities, err := h.rt.Entities(ctx); err == nil {
		for _, e := range entities {
			perms[e.Name] = e.ReadPermission
		}
	}
	return eventFilter(perms, caller)
}

// eventFilter hides entity events from callers without the entity's read permission. Other events (agent
// runs, approvals, notifications) reach everyone so live views refresh, but their payload and actor are
// kept only for auditors and for whoever caused the event.
func eventFilter(readPermission map[string]string, caller *kernel.Caller) func(kernel.Event) (kernel.Event, bool) {
	return func(e kernel.Event) (kernel.Event, bool) {
		subject, _, _ := strings.Cut(e.Type, ".")
		if need, isEntity := readPermission[subject]; isEntity {
			return e, caller.Permissions.Has(need)
		}
		if caller.Permissions.Has("audit.read") || causedBy(e.Actor, caller) {
			return e, true
		}
		return kernel.Event{ID: e.ID, Type: e.Type, Source: e.Source, TraceID: e.TraceID, Time: e.Time}, true
	}
}

func causedBy(a *kernel.Actor, c *kernel.Caller) bool {
	return a != nil && ((a.Kind == kernel.ActorUser && a.ID == c.UserID) || (a.OnBehalfOf != "" && a.OnBehalfOf == c.Name))
}

// since returns the events after lastID, oldest first, for a client resuming its stream.
func (h *Hub) since(ctx context.Context, lastID string) []kernel.Event {
	var rows []models.Event
	db := h.db.WithContext(ctx)
	after := db.Model(&models.Event{}).Select("seq").Where("id = ?", lastID)
	err := db.Where("seq > (?)", after).Order("seq").Limit(replayMax).Find(&rows).Error
	if err != nil {
		slog.WarnContext(ctx, "stream: replay", "error", err)
		return nil
	}
	out := make([]kernel.Event, 0, len(rows))
	for _, r := range rows {
		e := kernel.Event{ID: r.ID, Type: r.Type, Source: r.Source, TraceID: r.TraceID, Time: r.Time}
		_ = json.Unmarshal(r.Payload, &e.Payload)
		out = append(out, e)
	}
	return out
}
