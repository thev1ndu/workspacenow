// Package docstore stores platform metadata as JSONB documents in API shape, one table per collection.
package docstore

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
)

// ErrNotFound is returned when no document has the requested id.
var ErrNotFound = errors.New("document not found")

// Collections lists every document table; migrations create them and the demo reset clears them.
var Collections = []string{
	"organization", "departments", "teams", "users", "roles", "group_mappings", "environments",
	"applications", "releases", "deployments", "pins",
	"entities", "connections",
	"apis", "api_operations", "mcp_servers", "integrations",
	"model_providers", "agents", "agent_runs",
	"workflows", "executions", "approvals",
}

// Doc is a JSONB column value.
type Doc = models.JSON

type row = models.Document

// Collection stores documents of type T in one table. Key returns a document's id.
type Collection[T any] struct {
	db    *gorm.DB
	table string
	key   func(*T) string
}

func NewCollection[T any](db *gorm.DB, table string, key func(*T) string) *Collection[T] {
	return &Collection[T]{db: db, table: table, key: key}
}

func (c *Collection[T]) q(ctx context.Context) *gorm.DB {
	return postgres.DB(ctx, c.db).Table(c.table)
}

// Get returns one document, or ErrNotFound.
func (c *Collection[T]) Get(ctx context.Context, id string) (*T, error) {
	var r row
	err := c.q(ctx).Where("id = ?", id).Take(&r).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get %s/%s: %w", c.table, id, err)
	}
	return decode[T](r.Doc)
}

// GetForUpdate returns one document locked for the rest of the transaction in ctx.
func (c *Collection[T]) GetForUpdate(ctx context.Context, id string) (*T, error) {
	var r row
	err := c.q(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", id).Take(&r).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("lock %s/%s: %w", c.table, id, err)
	}
	return decode[T](r.Doc)
}

// List returns every document in the order first stored.
func (c *Collection[T]) List(ctx context.Context) ([]T, error) {
	return c.Where(ctx, "")
}

// Where returns documents matching a SQL condition on doc, e.g. "doc->>'applicationId' = ?".
func (c *Collection[T]) Where(ctx context.Context, cond string, args ...any) ([]T, error) {
	q := c.q(ctx).Order("seq")
	if cond != "" {
		q = q.Where(cond, args...)
	}
	var rows []row
	if err := q.Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("list %s: %w", c.table, err)
	}
	out := make([]T, 0, len(rows))
	for _, r := range rows {
		v, err := decode[T](r.Doc)
		if err != nil {
			return nil, err
		}
		out = append(out, *v)
	}
	return out, nil
}

// Page returns one page of matching documents, newest first (seq desc), plus the total match count.
func (c *Collection[T]) Page(ctx context.Context, cond string, limit, offset int, args ...any) ([]T, int64, error) {
	countQ := c.q(ctx)
	if cond != "" {
		countQ = countQ.Where(cond, args...)
	}
	var total int64
	if err := countQ.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count %s: %w", c.table, err)
	}
	q := c.q(ctx).Order("seq desc").Limit(limit).Offset(offset)
	if cond != "" {
		q = q.Where(cond, args...)
	}
	var rows []row
	if err := q.Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("page %s: %w", c.table, err)
	}
	out := make([]T, 0, len(rows))
	for _, r := range rows {
		v, err := decode[T](r.Doc)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *v)
	}
	return out, total, nil
}

// Count returns how many documents match a condition ("" counts all).
func (c *Collection[T]) Count(ctx context.Context, cond string, args ...any) (int64, error) {
	q := c.q(ctx)
	if cond != "" {
		q = q.Where(cond, args...)
	}
	var n int64
	err := q.Count(&n).Error
	return n, err
}

// Put inserts or replaces a document, keeping its original position in the listing order.
func (c *Collection[T]) Put(ctx context.Context, v *T) error {
	b, err := json.Marshal(v)
	if err != nil {
		return fmt.Errorf("encode %s: %w", c.table, err)
	}
	return PutRaw(ctx, postgres.DB(ctx, c.db), c.table, c.key(v), b)
}

// PutID stores a document under an explicit id, for documents that do not carry their own.
func (c *Collection[T]) PutID(ctx context.Context, id string, v *T) error {
	b, err := json.Marshal(v)
	if err != nil {
		return fmt.Errorf("encode %s: %w", c.table, err)
	}
	return PutRaw(ctx, postgres.DB(ctx, c.db), c.table, id, b)
}

// Delete removes a document; deleting a missing one is not an error.
func (c *Collection[T]) Delete(ctx context.Context, id string) error {
	return c.q(ctx).Where("id = ?", id).Delete(&row{}).Error
}

// DeleteAll removes every document, for collections the API replaces wholesale.
func (c *Collection[T]) DeleteAll(ctx context.Context) error {
	return c.q(ctx).Where("true").Delete(&row{}).Error
}

// PutRaw upserts an already encoded document into a table.
func PutRaw(ctx context.Context, db *gorm.DB, table, id string, doc []byte) error {
	r := models.Document{ID: id, Doc: models.JSON(doc), UpdatedAt: time.Now().UTC()}
	err := db.WithContext(ctx).Table(table).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"doc", "updated_at"}),
	}).Create(&r).Error
	if err != nil {
		return fmt.Errorf("put %s/%s: %w", table, id, err)
	}
	return nil
}

func decode[T any](d Doc) (*T, error) {
	var v T
	if err := json.Unmarshal(d, &v); err != nil {
		return nil, fmt.Errorf("decode document: %w", err)
	}
	return &v, nil
}
