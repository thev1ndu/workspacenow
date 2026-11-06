package data

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
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
}

type service struct {
	db          *gorm.DB
	rt          Runtime
	auditor     kernel.Auditor
	connections *docstore.Collection[Connection]
	apps        *docstore.Collection[map[string]any]
}

func NewService(db *gorm.DB, rt Runtime, auditor kernel.Auditor) Service {
	return &service{
		db: db, rt: rt, auditor: auditor,
		connections: docstore.NewCollection(db, "connections", func(c *Connection) string { return c.ID }),
		apps:        docstore.NewCollection(db, "applications", func(a *map[string]any) string { return fmt.Sprint((*a)["id"]) }),
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
