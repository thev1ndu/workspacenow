// Package seed loads the demo organization exported from the console mock (scripts/export-seed.mjs).
package seed

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/httpx"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

//go:embed seed.json
var seedJSON []byte

// tables maps each seed.json collection to its document table and id field.
var tables = []struct {
	key, table string
	id         func(doc map[string]any) string
}{
	{"departments", "departments", byField("id")},
	{"teams", "teams", byField("id")},
	{"users", "users", byField("id")},
	{"roles", "roles", byField("id")},
	{"groupMappings", "group_mappings", func(d map[string]any) string { return fmt.Sprint(d["group"], "|", d["roleId"]) }},
	{"environments", "environments", byField("key")},
	{"applications", "applications", byField("id")},
	{"releases", "releases", byField("id")},
	{"deployments", "deployments", byField("id")},
	{"entities", "entities", byField("name")},
	{"connections", "connections", byField("id")},
	{"apis", "apis", byField("id")},
	{"operations", "api_operations", byField("id")},
	{"mcpServers", "mcp_servers", byField("id")},
	{"integrations", "integrations", byField("id")},
	{"modelProviders", "model_providers", byField("id")},
	{"agents", "agents", byField("id")},
	{"workflows", "workflows", byField("id")},
}

func byField(f string) func(map[string]any) string {
	return func(d map[string]any) string { return fmt.Sprint(d[f]) }
}

// OrganizationID is the document id of the single organization an installation serves.
const OrganizationID = "org"

// IsEmpty reports whether the platform holds no organization yet.
func IsEmpty(ctx context.Context, db *gorm.DB) (bool, error) {
	var n int64
	if err := db.WithContext(ctx).Table("organization").Count(&n).Error; err != nil {
		return false, err
	}
	return n == 0, nil
}

// Apply replaces all platform data with the demo seed in one transaction, shifting timestamps to now.
func Apply(ctx context.Context, db *gorm.DB) error {
	var data map[string]any
	if err := json.Unmarshal(seedJSON, &data); err != nil {
		return fmt.Errorf("decode seed: %w", err)
	}
	epoch, err := time.Parse(time.RFC3339Nano, fmt.Sprint(data["epoch"]))
	if err != nil {
		return fmt.Errorf("seed epoch: %w", err)
	}
	shiftTimes(data, time.Now().UTC().Sub(epoch))

	return postgres.InTx(ctx, db, func(ctx context.Context) error {
		tx := postgres.DB(ctx, db)
		clear := tx.Session(&gorm.Session{AllowGlobalUpdate: true})
		for _, table := range docstore.Collections {
			if err := clear.Table(table).Delete(&models.Document{}).Error; err != nil {
				return fmt.Errorf("clear %s: %w", table, err)
			}
		}
		for _, m := range []any{&models.Record{}, &models.AuditRecord{}, &models.Event{}, &models.OutboxMessage{}} {
			if err := clear.Delete(m).Error; err != nil {
				return fmt.Errorf("clear platform: %w", err)
			}
		}
		if err := put(ctx, tx, "organization", OrganizationID, data["organization"]); err != nil {
			return err
		}
		for _, t := range tables {
			items, _ := data[t.key].([]any)
			for _, item := range items {
				doc, _ := item.(map[string]any)
				if err := put(ctx, tx, t.table, t.id(doc), doc); err != nil {
					return err
				}
			}
		}
		pins, _ := data["pins"].(map[string]any)
		for userID, appIDs := range pins {
			if err := put(ctx, tx, "pins", userID, appIDs); err != nil {
				return err
			}
		}
		records, _ := data["records"].([]any)
		for _, item := range records {
			if err := insertRecord(tx, item.(map[string]any)); err != nil {
				return err
			}
		}
		return nil
	})
}

func put(ctx context.Context, tx *gorm.DB, table, id string, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return fmt.Errorf("encode %s/%s: %w", table, id, err)
	}
	return docstore.PutRaw(ctx, tx, table, id, b)
}

func insertRecord(tx *gorm.DB, r map[string]any) error {
	values, err := json.Marshal(r["values"])
	if err != nil {
		return err
	}
	created, _ := time.Parse(time.RFC3339Nano, fmt.Sprint(r["createdAt"]))
	updated, _ := time.Parse(time.RFC3339Nano, fmt.Sprint(r["updatedAt"]))
	return tx.Create(&models.Record{
		Entity: fmt.Sprint(r["entity"]), ID: fmt.Sprint(r["id"]), Values: models.JSON(values),
		CreatedAt: created, UpdatedAt: updated, CreatedBy: fmt.Sprint(r["createdBy"]),
	}).Error
}

// shiftTimes moves every RFC 3339 timestamp in v forward by d, in place.
func shiftTimes(v any, d time.Duration) {
	switch x := v.(type) {
	case map[string]any:
		for k, item := range x {
			if s, ok := item.(string); ok {
				x[k] = shifted(s, d)
			} else {
				shiftTimes(item, d)
			}
		}
	case []any:
		for i, item := range x {
			if s, ok := item.(string); ok {
				x[i] = shifted(s, d)
			} else {
				shiftTimes(item, d)
			}
		}
	}
}

func shifted(s string, d time.Duration) string {
	if len(s) < 20 || s[4] != '-' || s[10] != 'T' {
		return s
	}
	t, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		return s
	}
	return t.Add(d).UTC().Format("2006-01-02T15:04:05.000Z")
}

// Handler serves POST /demo/reset. It exists only in demo mode.
type Handler struct {
	db      *gorm.DB
	enabled bool
	// afterReset clears caches derived from the data, such as resolved permissions.
	afterReset func(ctx context.Context)
}

func NewHandler(db *gorm.DB, demoMode bool, afterReset func(ctx context.Context)) *Handler {
	return &Handler{db: db, enabled: demoMode, afterReset: afterReset}
}

func (h *Handler) ResetDemo(w http.ResponseWriter, r *http.Request) {
	if !h.enabled {
		httpx.Error(w, r, kernel.NotFound("No route for POST /demo/reset"))
		return
	}
	if err := Apply(r.Context(), h.db); err != nil {
		httpx.Error(w, r, err)
		return
	}
	h.afterReset(r.Context())
	httpx.OK(w, map[string]bool{"reset": true})
}
