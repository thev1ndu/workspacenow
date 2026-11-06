package data

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// Runtime validates, persists and publishes events for records; every caller goes through it.
type Runtime interface {
	Entity(ctx context.Context, name string) (*Entity, error)
	Entities(ctx context.Context) ([]Entity, error)
	PutEntity(ctx context.Context, e *Entity) error
	Records(ctx context.Context, entity string) ([]Record, error)
	// Match returns the records whose values contain every key and value in match.
	Match(ctx context.Context, entity string, match map[string]any) ([]Record, error)
	Record(ctx context.Context, entity, id string) (*Record, error)
	Create(ctx context.Context, ec kernel.ExecutionContext, entity string, values map[string]any) (*Record, error)
	Update(ctx context.Context, ec kernel.ExecutionContext, entity, id string, changes map[string]any) (*Record, error)
	Delete(ctx context.Context, ec kernel.ExecutionContext, entity, id string) (*Deleted, error)
}

type runtime struct {
	db       *gorm.DB
	events   kernel.Publisher
	entities *docstore.Collection[Entity]
}

func NewRuntime(db *gorm.DB, events kernel.Publisher) Runtime {
	return &runtime{db: db, events: events, entities: docstore.NewCollection(db, "entities", func(e *Entity) string { return e.Name })}
}

func toRecord(r models.Record) (*Record, error) {
	rec := &Record{ID: r.ID, Entity: r.Entity, CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt, CreatedBy: r.CreatedBy}
	if err := json.Unmarshal(r.Values, &rec.Values); err != nil {
		return nil, fmt.Errorf("decode record %s: %w", r.ID, err)
	}
	return rec, nil
}

func (rt *runtime) q(ctx context.Context) *gorm.DB { return postgres.DB(ctx, rt.db) }

func (rt *runtime) Entity(ctx context.Context, name string) (*Entity, error) {
	e, err := rt.entities.Get(ctx, name)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("Entity %s not found", name)
	}
	return e, err
}

func (rt *runtime) Entities(ctx context.Context) ([]Entity, error) { return rt.entities.List(ctx) }

func (rt *runtime) PutEntity(ctx context.Context, e *Entity) error { return rt.entities.Put(ctx, e) }

func (rt *runtime) Records(ctx context.Context, entity string) ([]Record, error) {
	return rt.find(ctx, "entity = ?", entity)
}

func (rt *runtime) Match(ctx context.Context, entity string, match map[string]any) ([]Record, error) {
	b, err := json.Marshal(match)
	if err != nil {
		return nil, err
	}
	return rt.find(ctx, "entity = ? AND values @> ?::jsonb", entity, string(b))
}

func (rt *runtime) find(ctx context.Context, cond string, args ...any) ([]Record, error) {
	var rows []models.Record
	if err := rt.q(ctx).Model(&models.Record{}).Where(cond, args...).Order("seq").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("list records: %w", err)
	}
	out := make([]Record, 0, len(rows))
	for _, row := range rows {
		r, err := toRecord(row)
		if err != nil {
			return nil, err
		}
		out = append(out, *r)
	}
	return out, nil
}

func (rt *runtime) Record(ctx context.Context, entity, id string) (*Record, error) {
	return rt.get(ctx, entity, id, false)
}

func (rt *runtime) get(ctx context.Context, entity, id string, lock bool) (*Record, error) {
	q := rt.q(ctx).Model(&models.Record{}).Where("entity = ? AND id = ?", entity, id)
	if lock {
		q = q.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	var row models.Record
	err := q.Take(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, kernel.NotFound("%s %s not found", entity, id)
	}
	if err != nil {
		return nil, fmt.Errorf("get record: %w", err)
	}
	return toRecord(row)
}

func (rt *runtime) Create(ctx context.Context, ec kernel.ExecutionContext, entityName string, values map[string]any) (*Record, error) {
	e, err := rt.Entity(ctx, entityName)
	if err != nil {
		return nil, err
	}
	normalized, err := validate(ctx, rt, e, withDefaults(e, values), "")
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	r := &Record{ID: kernel.NewID(recordIDPrefix(e.Name)), Entity: e.Name, Values: normalized, CreatedAt: now, UpdatedAt: now, CreatedBy: ec.Actor.Name}
	b, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}
	row := models.Record{Entity: r.Entity, ID: r.ID, Values: models.JSON(b), CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt, CreatedBy: r.CreatedBy}
	if err := rt.q(ctx).Create(&row).Error; err != nil {
		return nil, fmt.Errorf("insert record: %w", err)
	}
	if _, err := rt.events.Publish(ctx, ec, e.Name+".Created", "entity:"+e.Name, map[string]any{"recordId": r.ID}); err != nil {
		return nil, err
	}
	return r, nil
}

func (rt *runtime) Update(ctx context.Context, ec kernel.ExecutionContext, entityName, id string, changes map[string]any) (*Record, error) {
	e, err := rt.Entity(ctx, entityName)
	if err != nil {
		return nil, err
	}
	current, err := rt.get(ctx, entityName, id, true)
	if err != nil {
		return nil, err
	}
	merged := make(map[string]any, len(current.Values)+len(changes))
	for k, v := range current.Values {
		merged[k] = v
	}
	fields := make([]string, 0, len(changes))
	for k, v := range changes {
		merged[k] = v
		fields = append(fields, k)
	}
	normalized, err := validate(ctx, rt, e, merged, id)
	if err != nil {
		return nil, err
	}
	b, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}
	current.Values, current.UpdatedAt = normalized, time.Now().UTC()
	if err := rt.q(ctx).Model(&models.Record{}).Where("entity = ? AND id = ?", entityName, id).
		Updates(map[string]any{"values": models.JSON(b), "updated_at": current.UpdatedAt}).Error; err != nil {
		return nil, fmt.Errorf("update record: %w", err)
	}
	if _, err := rt.events.Publish(ctx, ec, e.Name+".Updated", "entity:"+e.Name, map[string]any{"recordId": id, "fields": fields}); err != nil {
		return nil, err
	}
	return current, nil
}

func (rt *runtime) Delete(ctx context.Context, ec kernel.ExecutionContext, entityName, id string) (*Deleted, error) {
	e, err := rt.Entity(ctx, entityName)
	if err != nil {
		return nil, err
	}
	if _, err := rt.get(ctx, entityName, id, true); err != nil {
		return nil, err
	}
	entities, err := rt.Entities(ctx)
	if err != nil {
		return nil, err
	}
	var users []string
	count := 0
	for _, other := range entities {
		for _, f := range other.Fields {
			if f.Type != FieldReference || f.Reference != e.Name {
				continue
			}
			refs, err := rt.Match(ctx, other.Name, map[string]any{f.Name: id})
			if err != nil {
				return nil, err
			}
			if len(refs) > 0 {
				count += len(refs)
				users = appendUnique(users, other.Label)
			}
		}
	}
	if count > 0 {
		noun := "records"
		if count == 1 {
			noun = "record"
		}
		return nil, kernel.Conflict("%s is used by %d %s (%s)", id, count, noun, strings.Join(users, ", "))
	}
	var pending int64
	if err := rt.q(ctx).Table("approvals").Where("doc->>'status' = 'pending' AND doc->'subject'->>'entity' = ? AND doc->'subject'->>'recordId' = ?", e.Name, id).Count(&pending).Error; err != nil {
		return nil, err
	}
	if pending > 0 {
		return nil, kernel.Conflict("%s has a pending approval; decide it first", id)
	}
	if err := rt.q(ctx).Where("entity = ? AND id = ?", entityName, id).Delete(&models.Record{}).Error; err != nil {
		return nil, fmt.Errorf("delete record: %w", err)
	}
	if _, err := rt.events.Publish(ctx, ec, e.Name+".Deleted", "entity:"+e.Name, map[string]any{"recordId": id}); err != nil {
		return nil, err
	}
	return &Deleted{ID: id, Deleted: true}, nil
}

func (rt *runtime) recordExists(ctx context.Context, entity, id string) (bool, error) {
	var n int64
	err := rt.q(ctx).Model(&models.Record{}).Where("entity = ? AND id = ?", entity, id).Count(&n).Error
	return n > 0, err
}

// valueTaken serializes writers of the same unique field with a transaction-scoped advisory lock.
func (rt *runtime) valueTaken(ctx context.Context, entity, field string, value any, exceptID string) (bool, error) {
	if err := rt.q(ctx).Exec(`SELECT pg_advisory_xact_lock(hashtext(?))`, entity+"."+field).Error; err != nil {
		return false, err
	}
	b, err := json.Marshal(value)
	if err != nil {
		return false, err
	}
	var n int64
	err = rt.q(ctx).Model(&models.Record{}).Where("entity = ? AND id <> ? AND values -> ? = ?::jsonb", entity, exceptID, field, string(b)).Count(&n).Error
	return n > 0, err
}

var capitals = regexp.MustCompile(`[A-Z]`)

// recordIDPrefix turns "PurchaseOrder" into "po" and "Stock" into "stoc".
func recordIDPrefix(entity string) string {
	if c := capitals.FindAllString(entity, -1); len(c) > 1 {
		return strings.ToLower(strings.Join(c, ""))
	}
	p := strings.ToLower(entity)
	if len(p) > 4 {
		p = p[:4]
	}
	return p
}

func invalid(problems []string) error { return kernel.Invalid("%s", strings.Join(problems, "; ")) }

func appendUnique(list []string, s string) []string {
	for _, v := range list {
		if v == s {
			return list
		}
	}
	return append(list, s)
}
