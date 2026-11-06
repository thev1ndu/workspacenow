// Package models declares every database table as a gorm model; migrations and queries use these.
package models

import (
	"database/sql/driver"
	"fmt"
	"time"
)

// JSON is a JSONB column value.
type JSON []byte

func (JSON) GormDataType() string { return "jsonb" }

func (j JSON) Value() (driver.Value, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return []byte(j), nil
}

func (j *JSON) Scan(v any) error {
	switch b := v.(type) {
	case []byte:
		*j = append((*j)[:0], b...)
	case string:
		*j = JSON(b)
	case nil:
		*j = nil
	default:
		return fmt.Errorf("models: cannot scan %T into JSON", v)
	}
	return nil
}

// Document is one row of a metadata collection; each collection has its own table of this shape.
type Document struct {
	Seq       int64     `gorm:"autoIncrement;not null;index"`
	ID        string    `gorm:"primaryKey"`
	Doc       JSON      `gorm:"not null;index:,type:gin"`
	UpdatedAt time.Time `gorm:"not null"`
}

// Record is one instance of an entity; values are validated against the entity before writing.
type Record struct {
	Seq       int64     `gorm:"autoIncrement;not null;index:records_entity_seq,priority:2"`
	Entity    string    `gorm:"primaryKey;index:records_entity_seq,priority:1"`
	ID        string    `gorm:"primaryKey"`
	Values    JSON      `gorm:"not null;index:records_values,type:gin"`
	CreatedAt time.Time `gorm:"not null"`
	UpdatedAt time.Time `gorm:"not null"`
	CreatedBy string    `gorm:"not null"`
}

// AuditRecord is one attempted action; rows are never updated.
type AuditRecord struct {
	Seq        int64     `gorm:"autoIncrement;not null;index;index:audit_records_trace,priority:2"`
	ID         string    `gorm:"primaryKey"`
	TraceID    string    `gorm:"not null;index:audit_records_trace,priority:1"`
	Time       time.Time `gorm:"not null;index"`
	Actor      JSON      `gorm:"not null"`
	ActorKind  string    `gorm:"not null"`
	EntryPoint string    `gorm:"not null"`
	Action     string    `gorm:"not null"`
	Resource   string    `gorm:"not null"`
	Outcome    string    `gorm:"not null"`
	Detail     string    `gorm:"not null;default:''"`
}

// Event is a fact published after a business operation commits.
type Event struct {
	Seq     int64     `gorm:"autoIncrement;not null;index;index:events_trace,priority:2"`
	ID      string    `gorm:"primaryKey"`
	Type    string    `gorm:"not null"`
	Source  string    `gorm:"not null"`
	TraceID string    `gorm:"not null;index:events_trace,priority:1"`
	Payload JSON      `gorm:"not null"`
	Time    time.Time `gorm:"not null"`
}

// OutboxMessage waits, written with its operation, until the relay publishes it to NATS.
type OutboxMessage struct {
	Seq         int64      `gorm:"primaryKey;autoIncrement"`
	EventID     string     `gorm:"not null;uniqueIndex"`
	Subject     string     `gorm:"not null"`
	Payload     JSON       `gorm:"not null"`
	CreatedAt   time.Time  `gorm:"not null"`
	PublishedAt *time.Time `gorm:"index:outbox_pending,where:published_at IS NULL"`
}

func (OutboxMessage) TableName() string { return "outbox" }
