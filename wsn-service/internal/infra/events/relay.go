// Package events moves committed events from the outbox to NATS JetStream and serves them to subscribers.
package events

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// Connect opens NATS and makes sure the event stream exists.
func Connect(ctx context.Context, url, stream string) (*nats.Conn, jetstream.JetStream, error) {
	nc, err := nats.Connect(url, nats.Name("wsn-service"), nats.MaxReconnects(-1))
	if err != nil {
		return nil, nil, fmt.Errorf("connect nats: %w", err)
	}
	js, err := jetstream.New(nc)
	if err != nil {
		nc.Close()
		return nil, nil, fmt.Errorf("jetstream: %w", err)
	}
	_, err = js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
		Name:       stream,
		Subjects:   []string{kernel.SubjectPrefix + ">"},
		Retention:  jetstream.LimitsPolicy,
		MaxAge:     7 * 24 * time.Hour,
		Duplicates: 10 * time.Minute,
		Storage:    jetstream.FileStorage,
	})
	if err != nil {
		nc.Close()
		return nil, nil, fmt.Errorf("ensure stream %s: %w", stream, err)
	}
	return nc, js, nil
}

// Relay publishes outbox rows in commit order; the event id makes redelivery after a crash harmless.
func Relay(ctx context.Context, db *gorm.DB, js jetstream.JetStream) error {
	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()
	for {
		n, err := relayBatch(ctx, db, js)
		if err != nil && !errors.Is(err, context.Canceled) {
			slog.ErrorContext(ctx, "relay events", "error", err)
		}
		if n > 0 {
			continue
		}
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
		}
	}
}

func relayBatch(ctx context.Context, db *gorm.DB, js jetstream.JetStream) (int, error) {
	published := 0
	err := postgres.InTx(ctx, db, func(ctx context.Context) error {
		tx := postgres.DB(ctx, db)
		var rows []models.OutboxMessage
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("published_at IS NULL").Order("seq").Limit(100).Find(&rows).Error; err != nil {
			return err
		}
		for _, row := range rows {
			if _, err := js.Publish(ctx, row.Subject, row.Payload, jetstream.WithMsgID(row.EventID)); err != nil {
				return fmt.Errorf("publish %s: %w", row.EventID, err)
			}
			if err := tx.Model(&models.OutboxMessage{}).Where("seq = ?", row.Seq).Update("published_at", time.Now().UTC()).Error; err != nil {
				return err
			}
			published++
		}
		return nil
	})
	return published, err
}
