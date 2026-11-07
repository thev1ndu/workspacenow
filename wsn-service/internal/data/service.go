package data

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"slices"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/db/models"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/objectstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// CreateEntityInput is the body of POST /entities.
type CreateEntityInput struct {
	Name               string  `json:"name"`
	Label              string  `json:"label"`
	Description        string  `json:"description"`
	Scope              string  `json:"scope"`
	OwnerApplicationID string  `json:"ownerApplicationId"`
	Fields             []Field `json:"fields"`
}

// UpdateEntityInput is the body of PATCH /entities/{name}; absent fields are left unchanged.
type UpdateEntityInput struct {
	Fields          *[]Field `json:"fields"`
	Description     *string  `json:"description"`
	ReadPermission  *string  `json:"readPermission"`
	WritePermission *string  `json:"writePermission"`
}

// Service manages entity definitions; records go through business operations instead.
type Service interface {
	Entities(ctx context.Context) ([]Entity, error)
	Entity(ctx context.Context, name string) (*Entity, error)
	Connections(ctx context.Context) ([]Connection, error)
	CreateEntity(ctx context.Context, ec kernel.ExecutionContext, in CreateEntityInput) (*Entity, error)
	UpdateEntity(ctx context.Context, ec kernel.ExecutionContext, name string, in UpdateEntityInput) (*Entity, error)
	// Migrate applies a schema migration (add/drop/retype + backfill) and snapshots the entity version.
	Migrate(ctx context.Context, ec kernel.ExecutionContext, name string, m SchemaMigration) (*Entity, []string, error)
	// Views are named saved queries over one entity.
	Views(ctx context.Context, ec kernel.ExecutionContext, entity string) ([]SavedView, error)
	CreateView(ctx context.Context, ec kernel.ExecutionContext, entity string, v SavedView) (*SavedView, error)
	UpdateView(ctx context.Context, ec kernel.ExecutionContext, entity, id string, v SavedView) (*SavedView, error)
	DeleteView(ctx context.Context, ec kernel.ExecutionContext, entity, id string) error
	RunView(ctx context.Context, ec kernel.ExecutionContext, entity, id string, includeDeleted bool) ([]Record, int, error)
	History(ctx context.Context, ec kernel.ExecutionContext, entity, id string) ([]RecordHistoryEntry, error)
	Restore(ctx context.Context, ec kernel.ExecutionContext, entity, id string) (*Record, error)
	// Export renders the entity's records as JSON or CSV; Import creates records from JSON or CSV text.
	Export(ctx context.Context, ec kernel.ExecutionContext, entity, format, viewID string) (string, string, error)
	Import(ctx context.Context, ec kernel.ExecutionContext, entity, format, data string) (int, error)
	// ListRecords is the read path behind GET records: permission + row-level security + optional
	// saved view, then text search and paging.
	ListRecords(ctx context.Context, ec kernel.ExecutionContext, entity, viewID string, includeDeleted bool, q string, limit, offset int) ([]Record, int, error)
	// Files: upload/download record file fields via object storage; records hold only the FileRef.
	UploadFile(ctx context.Context, ec kernel.ExecutionContext, entity, recordID, field, name string, r io.Reader) (*Record, error)
	DownloadFile(ctx context.Context, ec kernel.ExecutionContext, entity, recordID, field string) (*FileRef, []byte, error)
}

type service struct {
	db          *gorm.DB
	rt          Runtime
	auditor     kernel.Auditor
	connections *docstore.Collection[Connection]
	apps        *docstore.Collection[map[string]any]
	views       *docstore.Collection[SavedView]
	artifacts   objectstore.Store
}

func NewService(db *gorm.DB, rt Runtime, auditor kernel.Auditor, artifacts objectstore.Store) Service {
	return &service{
		db: db, rt: rt, auditor: auditor,
		connections: docstore.NewCollection(db, "connections", func(c *Connection) string { return c.ID }),
		apps:        docstore.NewCollection(db, "applications", func(a *map[string]any) string { return fmt.Sprint((*a)["id"]) }),
		views:       docstore.NewCollection(db, "entity_views", func(v *SavedView) string { return v.ID }),
		artifacts:   artifacts,
	}
}

var entityName = regexp.MustCompile(`^[A-Z][A-Za-z0-9]*$`)

func (s *service) Entities(ctx context.Context) ([]Entity, error) { return s.rt.Entities(ctx) }

func (s *service) Entity(ctx context.Context, name string) (*Entity, error) {
	return s.rt.Entity(ctx, name)
}

func (s *service) Connections(ctx context.Context) ([]Connection, error) {
	return s.connections.List(ctx)
}

func (s *service) CreateEntity(ctx context.Context, ec kernel.ExecutionContext, in CreateEntityInput) (*Entity, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "data.manage", "entity.create", "entity"); err != nil {
		return nil, err
	}
	name := strings.TrimSpace(in.Name)
	if !entityName.MatchString(name) {
		return nil, kernel.Invalid("Entity name must be PascalCase, e.g. PurchaseRequest")
	}
	if _, err := s.rt.Entity(ctx, name); err == nil {
		return nil, kernel.Conflict("Entity %s already exists", name)
	}
	if len(in.Fields) == 0 {
		return nil, kernel.Invalid("Add at least one field")
	}
	scope := in.Scope
	if scope == "" {
		scope = ScopeOrganization
	}
	label := in.Label
	if label == "" {
		label = name
	}
	e := &Entity{
		ID: kernel.NewID("ent"), Name: name, Label: label, Description: in.Description, Scope: scope,
		OwnerApplicationID: in.OwnerApplicationID, Fields: in.Fields, Relationships: relationshipsOf(in.Fields),
		Events: []string{name + ".Created", name + ".Updated"}, ReadPermission: "data.manage", WritePermission: "data.manage",
		Version: 1, Lifecycle: "draft", UpdatedAt: time.Now().UTC(),
	}
	err := postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		if err := s.rt.PutEntity(ctx, e); err != nil {
			return err
		}
		if e.OwnerApplicationID != "" {
			if err := s.addToApplication(ctx, e.OwnerApplicationID, e.Name); err != nil {
				return err
			}
		}
		return s.auditor.Record(ctx, ec, "entity.create", "entity/"+name, kernel.OutcomeAllowed, "")
	})
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (s *service) UpdateEntity(ctx context.Context, ec kernel.ExecutionContext, name string, in UpdateEntityInput) (*Entity, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "data.manage", "entity.update", "entity/"+name); err != nil {
		return nil, err
	}
	var updated *Entity
	err := postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		e, err := s.rt.Entity(ctx, name)
		if err != nil {
			return err
		}
		if e.Scope == ScopeExternal {
			return kernel.InvalidState("External entities are defined by their source system")
		}
		if in.Fields != nil {
			e.Fields = *in.Fields
		}
		if in.Description != nil {
			e.Description = *in.Description
		}
		if in.ReadPermission != nil && *in.ReadPermission != "" {
			e.ReadPermission = *in.ReadPermission
		}
		if in.WritePermission != nil && *in.WritePermission != "" {
			e.WritePermission = *in.WritePermission
		}
		e.Version++
		e.UpdatedAt = time.Now().UTC()
		if err := s.rt.PutEntity(ctx, e); err != nil {
			return err
		}
		updated = e
		return s.auditor.Record(ctx, ec, "entity.update", "entity/"+e.Name, kernel.OutcomeAllowed, fmt.Sprintf("Version %d", e.Version))
	})
	return updated, err
}

func (s *service) addToApplication(ctx context.Context, appID, entity string) error {
	app, err := s.apps.GetForUpdate(ctx, appID)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	names, _ := (*app)["entityNames"].([]any)
	if !slices.ContainsFunc(names, func(v any) bool { return v == entity }) {
		(*app)["entityNames"] = append(names, entity)
	}
	return s.apps.Put(ctx, app)
}

func relationshipsOf(fields []Field) []Relationship {
	out := []Relationship{}
	for _, f := range fields {
		if f.Type == FieldReference && f.Reference != "" {
			out = append(out, Relationship{Name: f.Name, Kind: "many-to-one", Target: f.Reference})
		}
	}
	return out
}

// Migrate applies a schema migration to an entity: add/drop/retype fields, backfill existing
// records, snapshot the entity into entity_versions and bump its version. All in one transaction.
func (s *service) Migrate(ctx context.Context, ec kernel.ExecutionContext, name string, m SchemaMigration) (*Entity, []string, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "data.manage", "entity.migrate", "entity/"+name); err != nil {
		return nil, nil, err
	}
	var out *Entity
	var problems []string
	err := postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		e, err := s.rt.Entity(ctx, name)
		if err != nil {
			return err
		}
		var count int64
		if err := s.db.WithContext(ctx).Model(&models.Record{}).Where("entity = ? AND deleted_at IS NULL", name).Count(&count).Error; err != nil {
			return err
		}
		fields, backfill, probs := planMigration(e, int(count), m)
		problems = probs
		if len(probs) > 0 {
			return kernel.Problems(probs)
		}
		// Backfill existing records with the new field values before the schema changes.
		if len(backfill) > 0 {
			var rows []models.Record
			if err := s.db.WithContext(ctx).Where("entity = ? AND deleted_at IS NULL", name).Find(&rows).Error; err != nil {
				return err
			}
			for i := range rows {
				var values map[string]any
				if err := json.Unmarshal(rows[i].Values, &values); err != nil {
					return err
				}
				changed := false
				for k, v := range backfill {
					if _, ok := values[k]; !ok {
						values[k] = v
						changed = true
					}
				}
				if !changed {
					continue
				}
				b, _ := json.Marshal(values)
				if err := s.db.WithContext(ctx).Model(&models.Record{}).Where("entity = ? AND id = ?", name, rows[i].ID).
					Updates(map[string]any{"values": models.JSON(b), "updated_at": time.Now().UTC()}).Error; err != nil {
					return err
				}
			}
		}
		e.Fields, e.Relationships, e.Version, e.UpdatedAt = fields, relationshipsOf(fields), e.Version+1, time.Now().UTC()
		doc, err := json.Marshal(e)
		if err != nil {
			return err
		}
		if err := s.db.WithContext(ctx).Create(&models.EntityVersion{Entity: name, Version: e.Version, Actor: ec.Actor.Name, Note: m.Note, MigratedAt: e.UpdatedAt, Doc: models.JSON(doc)}).Error; err != nil {
			return err
		}
		if err := s.rt.PutEntity(ctx, e); err != nil {
			return err
		}
		if err := s.auditor.Record(ctx, ec, "entity.migrate", "entity/"+name, kernel.OutcomeAllowed, fmt.Sprintf("version %d: %s", e.Version, m.Note)); err != nil {
			return err
		}
		out = e
		return nil
	})
	return out, problems, err
}

func (s *service) Views(ctx context.Context, ec kernel.ExecutionContext, entity string) ([]SavedView, error) {
	e, err := s.rt.Entity(ctx, entity)
	if err != nil {
		return nil, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, e.ReadPermission, entity+".views", "entity/"+entity); err != nil {
		return nil, err
	}
	all, err := s.views.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]SavedView, 0)
	for _, v := range all {
		if v.Entity == entity && (v.Shared || v.OwnerID == ec.Actor.ID) {
			out = append(out, v)
		}
	}
	return out, nil
}

func (s *service) CreateView(ctx context.Context, ec kernel.ExecutionContext, entity string, v SavedView) (*SavedView, error) {
	e, err := s.rt.Entity(ctx, entity)
	if err != nil {
		return nil, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, e.ReadPermission, entity+".view.create", "entity/"+entity); err != nil {
		return nil, err
	}
	if strings.TrimSpace(v.Name) == "" {
		return nil, kernel.Invalid("The view needs a name")
	}
	if _, _, err := viewCond(v.Filters); err != nil {
		return nil, kernel.Invalid("%s", err.Error())
	}
	now := time.Now().UTC()
	v.ID, v.Entity, v.OwnerID, v.CreatedAt, v.UpdatedAt = kernel.NewID("view"), entity, ec.Actor.ID, now, now
	if err := s.views.Put(ctx, &v); err != nil {
		return nil, err
	}
	return &v, s.auditor.Record(ctx, ec, entity+".view.create", "entity/"+entity+"/"+v.ID, kernel.OutcomeAllowed, v.Name)
}

func (s *service) UpdateView(ctx context.Context, ec kernel.ExecutionContext, entity, id string, v SavedView) (*SavedView, error) {
	if _, err := s.rt.Entity(ctx, entity); err != nil {
		return nil, err
	}
	cur, err := s.views.Get(ctx, id)
	if err != nil {
		if errors.Is(err, docstore.ErrNotFound) {
			return nil, kernel.NotFound("View not found")
		}
		return nil, err
	}
	if cur.Entity != entity {
		return nil, kernel.NotFound("View not found")
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "data.manage", entity+".view.update", "entity/"+entity+"/"+id); err != nil {
		return nil, err
	}
	if strings.TrimSpace(v.Name) == "" {
		return nil, kernel.Invalid("The view needs a name")
	}
	if _, _, err := viewCond(v.Filters); err != nil {
		return nil, kernel.Invalid("%s", err.Error())
	}
	cur.Name, cur.Filters, cur.SortField, cur.SortDesc, cur.Limit, cur.Shared, cur.UpdatedAt = v.Name, v.Filters, v.SortField, v.SortDesc, v.Limit, v.Shared, time.Now().UTC()
	if err := s.views.Put(ctx, cur); err != nil {
		return nil, err
	}
	return cur, s.auditor.Record(ctx, ec, entity+".view.update", "entity/"+entity+"/"+id, kernel.OutcomeAllowed, cur.Name)
}

func (s *service) DeleteView(ctx context.Context, ec kernel.ExecutionContext, entity, id string) error {
	if _, err := s.rt.Entity(ctx, entity); err != nil {
		return err
	}
	cur, err := s.views.Get(ctx, id)
	if err != nil {
		if errors.Is(err, docstore.ErrNotFound) {
			return kernel.NotFound("View not found")
		}
		return err
	}
	if cur.Entity != entity {
		return kernel.NotFound("View not found")
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "data.manage", entity+".view.delete", "entity/"+entity+"/"+id); err != nil {
		return err
	}
	if err := s.views.Delete(ctx, id); err != nil {
		return err
	}
	return s.auditor.Record(ctx, ec, entity+".view.delete", "entity/"+entity+"/"+id, kernel.OutcomeAllowed, cur.Name)
}

func (s *service) RunView(ctx context.Context, ec kernel.ExecutionContext, entity, id string, includeDeleted bool) ([]Record, int, error) {
	e, err := s.rt.Entity(ctx, entity)
	if err != nil {
		return nil, 0, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, e.ReadPermission, entity+".list", "entity/"+entity); err != nil {
		return nil, 0, err
	}
	v, err := s.views.Get(ctx, id)
	if err != nil {
		if errors.Is(err, docstore.ErrNotFound) {
			return nil, 0, kernel.NotFound("View not found")
		}
		return nil, 0, err
	}
	if v.Entity != entity || (!v.Shared && v.OwnerID != ec.Actor.ID) {
		return nil, 0, kernel.NotFound("View not found")
	}
	records, err := s.rt.RecordsView(ctx, ec, entity, *v, includeDeleted)
	if err != nil {
		return nil, 0, err
	}
	if v.Limit > 0 && len(records) > v.Limit {
		records = records[:v.Limit]
	}
	return records, len(records), nil
}

func (s *service) History(ctx context.Context, ec kernel.ExecutionContext, entity, id string) ([]RecordHistoryEntry, error) {
	e, err := s.rt.Entity(ctx, entity)
	if err != nil {
		return nil, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, e.ReadPermission, entity+".history", "entity/"+entity+"/"+id); err != nil {
		return nil, err
	}
	return s.rt.History(ctx, entity, id)
}

func (s *service) Restore(ctx context.Context, ec kernel.ExecutionContext, entity, id string) (*Record, error) {
	e, err := s.rt.Entity(ctx, entity)
	if err != nil {
		return nil, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, e.WritePermission, entity+".restore", "entity/"+entity+"/"+id); err != nil {
		return nil, err
	}
	r, err := s.rt.Restore(ctx, ec, entity, id)
	if err != nil {
		return nil, err
	}
	return r, s.auditor.Record(ctx, ec, entity+".restore", "entity/"+entity+"/"+id, kernel.OutcomeAllowed, "")
}

// Export renders the entity's records (optionally through a saved view) as JSON or CSV.
// Returns the body and the content type.
func (s *service) Export(ctx context.Context, ec kernel.ExecutionContext, entity, format, viewID string) (string, string, error) {
	e, err := s.rt.Entity(ctx, entity)
	if err != nil {
		return "", "", err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, e.ReadPermission, entity+".export", "entity/"+entity); err != nil {
		return "", "", err
	}
	var records []Record
	if viewID != "" {
		records, _, err = s.RunView(ctx, ec, entity, viewID, false)
	} else {
		records, err = s.rt.RecordsAs(ctx, ec, entity, false)
	}
	if err != nil {
		return "", "", err
	}
	if format == "csv" {
		body, err := recordsToCSV(e, records)
		return body, "text/csv", err
	}
	body, err := json.Marshal(records)
	return string(body), "application/json", err
}

// Import creates records from JSON (array of values objects) or CSV text.
func (s *service) Import(ctx context.Context, ec kernel.ExecutionContext, entity, format, data string) (int, error) {
	e, err := s.rt.Entity(ctx, entity)
	if err != nil {
		return 0, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, e.WritePermission, entity+".import", "entity/"+entity); err != nil {
		return 0, err
	}
	var rows []map[string]any
	if format == "csv" {
		rows, err = csvToValues(e, data)
	} else {
		if err := json.Unmarshal([]byte(data), &rows); err != nil {
			return 0, kernel.Invalid("import body must be a JSON array of value objects: %s", err.Error())
		}
	}
	if err != nil {
		return 0, kernel.Invalid("%s", err.Error())
	}
	created := 0
	for _, values := range rows {
		if _, err := s.rt.Create(ctx, ec, entity, values); err != nil {
			return created, err
		}
		created++
	}
	if err := s.auditor.Record(ctx, ec, entity+".import", "entity/"+entity, kernel.OutcomeAllowed, fmt.Sprintf("%d records", created)); err != nil {
		return created, err
	}
	return created, nil
}

func (s *service) ListRecords(ctx context.Context, ec kernel.ExecutionContext, entity, viewID string, includeDeleted bool, q string, limit, offset int) ([]Record, int, error) {
	e, err := s.rt.Entity(ctx, entity)
	if err != nil {
		return nil, 0, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, e.ReadPermission, entity+".list", "entity/"+entity); err != nil {
		return nil, 0, err
	}
	var records []Record
	if viewID != "" {
		records, _, err = s.RunView(ctx, ec, entity, viewID, includeDeleted)
	} else {
		records, err = s.rt.RecordsAs(ctx, ec, entity, includeDeleted)
	}
	if err != nil {
		return nil, 0, err
	}
	if q != "" {
		filtered := make([]Record, 0, len(records))
		needle := strings.ToLower(q)
		for _, rec := range records {
			raw, _ := json.Marshal(rec.Values)
			if strings.Contains(strings.ToLower(string(raw)), needle) {
				filtered = append(filtered, rec)
			}
		}
		records = filtered
	}
	total := len(records)
	if offset >= total {
		records = nil
	} else {
		records = records[offset:]
		if len(records) > limit {
			records = records[:limit]
		}
	}
	return records, total, nil
}
