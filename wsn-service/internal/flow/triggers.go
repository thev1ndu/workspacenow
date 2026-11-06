package flow

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/nats-io/nats.go/jetstream"
	"go.temporal.io/api/serviceerror"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// TriggerConsumer is the durable NATS consumer that turns events into workflow executions.
const TriggerConsumer = "wsn-flow-triggers"

// ConsumeTriggers starts executions for entity-event triggers until ctx ends; every replica shares one consumer.
func ConsumeTriggers(ctx context.Context, js jetstream.JetStream, stream string, svc Service) error {
	consumer, err := js.CreateOrUpdateConsumer(ctx, stream, jetstream.ConsumerConfig{
		Durable:       TriggerConsumer,
		FilterSubject: kernel.SubjectPrefix + ">",
		AckPolicy:     jetstream.AckExplicitPolicy,
		DeliverPolicy: jetstream.DeliverNewPolicy,
		MaxDeliver:    10,
	})
	if err != nil {
		return fmt.Errorf("trigger consumer: %w", err)
	}
	cc, err := consumer.Consume(func(m jetstream.Msg) {
		var e kernel.Event
		if err := json.Unmarshal(m.Data(), &e); err != nil {
			slog.Warn("flow: undecodable event", "subject", m.Subject(), "error", err)
			_ = m.Term()
			return
		}
		if err := svc.StartForEvent(ctx, e); err != nil {
			slog.Error("flow: start workflows for event", "event", e.ID, "type", e.Type, "error", err)
			_ = m.Nak()
			return
		}
		_ = m.Ack()
	})
	if err != nil {
		return fmt.Errorf("consume triggers: %w", err)
	}
	<-ctx.Done()
	cc.Stop()
	return nil
}

func isAlreadyStarted(err error) bool {
	var started *serviceerror.WorkflowExecutionAlreadyStarted
	return errors.As(err, &started)
}
