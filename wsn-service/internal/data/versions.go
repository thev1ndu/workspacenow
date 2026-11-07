package data

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// EntityVersion is one immutable schema snapshot of an entity (written by Migrate).
type EntityVersion struct {
	Entity     string         `json:"entity"`
	Version    int            `json:"version"`
	Actor      string         `json:"actor"`
	Note       string         `json:"note,omitempty"`
	MigratedAt time.Time      `json:"migratedAt"`
	Doc        map[string]any `json:"doc"`
}

// FieldDiff is one field whose definition changed between two versions.
type FieldDiff struct {
	Field string `json:"field"`
	From  any    `json:"from"`
	To    any    `json:"to"`
}

// EntityVersionDiff is the field-level diff between two schema versions.
type EntityVersionDiff struct {
	From    int         `json:"from"`
	To      int         `json:"to"`
	Added   []string    `json:"added"`
	Removed []string    `json:"removed"`
	Changed []FieldDiff `json:"changed"`
}

// EntityVersions lists the entity's schema snapshots, newest first.
func (s *service) EntityVersions(ctx context.Context, name string) ([]EntityVersion, error) {
	var rows []models.EntityVersion
	if err := s.db.WithContext(ctx).Where("entity = ?", name).Order("version DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]EntityVersion, 0, len(rows))
	for _, r := range rows {
		var doc map[string]any
		_ = json.Unmarshal(r.Doc, &doc)
		out = append(out, EntityVersion{Entity: r.Entity, Version: r.Version, Actor: r.Actor, Note: r.Note, MigratedAt: r.MigratedAt, Doc: doc})
	}
	return out, nil
}

// DiffEntityVersions diffs the field definitions of two snapshots.
func (s *service) DiffEntityVersions(ctx context.Context, name string, from, to int) (*EntityVersionDiff, error) {
	var rows []models.EntityVersion
	if err := s.db.WithContext(ctx).Where("entity = ? AND version IN ?", name, []int{from, to}).Find(&rows).Error; err != nil {
		return nil, err
	}
	docs := map[int]map[string]any{}
	for _, r := range rows {
		var doc map[string]any
		_ = json.Unmarshal(r.Doc, &doc)
		docs[r.Version] = doc
	}
	fromDoc, okFrom := docs[from]
	toDoc, okTo := docs[to]
	if !okFrom || !okTo {
		return nil, kernel.NotFound("Entity %s has no versions %d/%d", name, from, to)
	}
	d := diffEntityDocs(from, to, fromDoc, toDoc)
	return &d, nil
}

// diffEntityDocs compares the "fields" arrays of two entity docs by field name.
func diffEntityDocs(from, to int, fromDoc, toDoc map[string]any) EntityVersionDiff {
	fieldsOf := func(doc map[string]any) map[string]map[string]any {
		out := map[string]map[string]any{}
		raw, _ := doc["fields"].([]any)
		for _, f := range raw {
			if m, ok := f.(map[string]any); ok {
				if name, ok := m["name"].(string); ok {
					out[name] = m
				}
			}
		}
		return out
	}
	a, b := fieldsOf(fromDoc), fieldsOf(toDoc)
	d := EntityVersionDiff{From: from, To: to, Added: []string{}, Removed: []string{}, Changed: []FieldDiff{}}
	for name := range b {
		if _, ok := a[name]; !ok {
			d.Added = append(d.Added, name)
		}
	}
	for name := range a {
		if _, ok := b[name]; !ok {
			d.Removed = append(d.Removed, name)
			continue
		}
		if !fieldEqual(a[name], b[name]) {
			d.Changed = append(d.Changed, FieldDiff{Field: name, From: a[name], To: b[name]})
		}
	}
	slices.Sort(d.Added)
	slices.Sort(d.Removed)
	slices.SortFunc(d.Changed, func(x, y FieldDiff) int { return strings.Compare(x.Field, y.Field) })
	return d
}

// fieldEqual compares the definition-relevant keys of a field, ignoring nothing else.
func fieldEqual(a, b map[string]any) bool {
	for _, k := range []string{"label", "type", "required", "unique", "enumValues", "reference", "defaultValue"} {
		av, _ := json.Marshal(a[k])
		bv, _ := json.Marshal(b[k])
		if string(av) != string(bv) {
			return false
		}
	}
	return true
}

// Purge hard-deletes soft-deleted records older than olderThanDays and returns the count.
func (s *service) Purge(ctx context.Context, ec kernel.ExecutionContext, name string, olderThanDays int) (int64, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "data.manage", "entity.purge", "entity/"+name); err != nil {
		return 0, err
	}
	if olderThanDays < 1 {
		olderThanDays = 30
	}
	cutoff := time.Now().UTC().Add(-time.Duration(olderThanDays) * 24 * time.Hour)
	res := s.db.WithContext(ctx).Where("entity = ? AND deleted_at IS NOT NULL AND deleted_at < ?", name, cutoff).Delete(&models.Record{})
	if res.Error != nil {
		return 0, res.Error
	}
	if err := s.auditor.Record(ctx, ec, "entity.purge", "entity/"+name, kernel.OutcomeAllowed, fmt.Sprintf("purged %d records older than %d days", res.RowsAffected, olderThanDays)); err != nil {
		return 0, err
	}
	return res.RowsAffected, nil
}
