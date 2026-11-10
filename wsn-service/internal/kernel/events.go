package kernel

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
)

// Event is a fact published after a business operation commits.
type Event struct {
	ID      string         `json:"id"`
	Type    string         `json:"type"`
	Source  string         `json:"source"`
	TraceID string         `json:"traceId"`
	Payload map[string]any `json:"payload"`
	Time    time.Time      `json:"time"`
	// Actor is who caused the event; it travels on the bus so triggered workflows know their requester.
	Actor *Actor `json:"actor,omitempty"`
}

// SubjectPrefix prefixes every event's NATS subject: events.<Type>.
const SubjectPrefix = "events."

// Publisher records events; they reach subscribers only if the surrounding transaction commits.
type Publisher interface {
	Publish(ctx context.Context, ec ExecutionContext, eventType, source string, payload map[string]any) (*Event, error)
}

type eventLog struct{ db *gorm.DB }

func NewPublisher(db *gorm.DB) Publisher { return &eventLog{db: db} }

func (l *eventLog) Publish(ctx context.Context, ec ExecutionContext, eventType, source string, payload map[string]any) (*Event, error) {
	if payload == nil {
		payload = map[string]any{}
	}
	actor := ec.Actor
	e := &Event{ID: NewID("evt"), Type: eventType, Source: source, TraceID: ec.TraceID, Payload: payload, Time: time.Now().UTC(), Actor: &actor}
	body, err := json.Marshal(e)
	if err != nil {
		return nil, fmt.Errorf("encode event: %w", err)
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("encode event payload: %w", err)
	}
	db := postgres.DB(ctx, l.db)
	row := models.Event{ID: e.ID, Type: e.Type, Source: e.Source, TraceID: e.TraceID, Payload: models.JSON(payloadJSON), Time: e.Time}
	if err := db.Create(&row).Error; err != nil {
		return nil, fmt.Errorf("write event: %w", err)
	}
	msg := models.OutboxMessage{EventID: e.ID, Subject: SubjectPrefix + e.Type, Payload: models.JSON(body), CreatedAt: e.Time}
	if err := db.Create(&msg).Error; err != nil {
		return nil, fmt.Errorf("write outbox: %w", err)
	}
	return e, nil
}
