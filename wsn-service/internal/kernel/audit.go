package kernel

//go:generate moq -rm -fmt goimports -skip-ensure -pkg kernelmocks -out kernelmocks/auditor_mock.go . Auditor:AuditorMock

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
)

type Outcome string

const (
	OutcomeAllowed Outcome = "allowed"
	OutcomeDenied  Outcome = "denied"
	OutcomeFailed  Outcome = "failed"
)

// AuditRecord is the record of one attempted action.
type AuditRecord struct {
	ID         string     `json:"id"`
	TraceID    string     `json:"traceId"`
	Time       time.Time  `json:"time"`
	Actor      Actor      `json:"actor"`
	EntryPoint EntryPoint `json:"entryPoint"`
	Action     string     `json:"action"`
	Resource   string     `json:"resource"`
	Outcome    Outcome    `json:"outcome"`
	Detail     string     `json:"detail,omitempty"`
}

// Auditor writes audit records.
type Auditor interface {
	// Record writes inside the transaction in ctx, so it commits with the action it describes.
	Record(ctx context.Context, ec ExecutionContext, action, resource string, outcome Outcome, detail string) error
	// RecordDetached writes outside any transaction, so it survives the rollback of the action.
	RecordDetached(ctx context.Context, ec ExecutionContext, action, resource string, outcome Outcome, detail string) error
}

type auditor struct{ db *gorm.DB }

func NewAuditor(db *gorm.DB) Auditor { return &auditor{db: db} }

func (a *auditor) Record(ctx context.Context, ec ExecutionContext, action, resource string, outcome Outcome, detail string) error {
	return a.write(postgres.DB(ctx, a.db), ec, action, resource, outcome, detail)
}

func (a *auditor) RecordDetached(ctx context.Context, ec ExecutionContext, action, resource string, outcome Outcome, detail string) error {
	return a.write(postgres.Detached(ctx, a.db), ec, action, resource, outcome, detail)
}

func (a *auditor) write(db *gorm.DB, ec ExecutionContext, action, resource string, outcome Outcome, detail string) error {
	actor, err := json.Marshal(ec.Actor)
	if err != nil {
		return fmt.Errorf("encode actor: %w", err)
	}
	r := models.AuditRecord{
		ID: NewID("aud"), TraceID: ec.TraceID, Time: time.Now().UTC(), Actor: models.JSON(actor), ActorKind: string(ec.Actor.Kind),
		EntryPoint: string(ec.EntryPoint), Action: action, Resource: resource, Outcome: string(outcome), Detail: detail,
	}
	if err := db.Create(&r).Error; err != nil {
		return fmt.Errorf("write audit record: %w", err)
	}
	return nil
}

// RequirePermission guards an admin action, auditing a denial detached and returning a traced 403.
func RequirePermission(ctx context.Context, a Auditor, ec ExecutionContext, permission, action, resource string) error {
	if ec.Permissions.Has(permission) {
		return nil
	}
	if err := a.RecordDetached(ctx, ec, action, resource, OutcomeDenied, "Missing permission "+permission); err != nil {
		return err
	}
	return Forbidden("%s lacks permission %s", ec.Actor.Name, permission).WithTrace(ec.TraceID)
}
