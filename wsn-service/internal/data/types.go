// Package data is the entity runtime: entities, their records, validation and generated CRUD operations.
package data

import "time"

const (
	FieldString    = "string"
	FieldText      = "text"
	FieldNumber    = "number"
	FieldInteger   = "integer"
	FieldBoolean   = "boolean"
	FieldDate      = "date"
	FieldEnum      = "enum"
	FieldReference = "reference"

	ScopeApplication  = "application"
	ScopeOrganization = "organization"
	ScopeExternal     = "external"
)

type Field struct {
	Name         string   `json:"name"`
	Label        string   `json:"label"`
	Type         string   `json:"type"`
	Required     bool     `json:"required,omitempty"`
	Unique       bool     `json:"unique,omitempty"`
	EnumValues   []string `json:"enumValues,omitempty"`
	Reference    string   `json:"reference,omitempty"`
	DefaultValue any      `json:"defaultValue,omitempty"`
}

type Relationship struct {
	Name   string `json:"name"`
	Kind   string `json:"kind"`
	Target string `json:"target"`
	Via    string `json:"via,omitempty"`
}

// Entity is a business-level contract for a concept such as Product, not a table.
type Entity struct {
	ID                 string         `json:"id"`
	Name               string         `json:"name"`
	Label              string         `json:"label"`
	Description        string         `json:"description"`
	Scope              string         `json:"scope"`
	OwnerApplicationID string         `json:"ownerApplicationId,omitempty"`
	Fields             []Field        `json:"fields"`
	Relationships      []Relationship `json:"relationships"`
	Events             []string       `json:"events"`
	ReadPermission     string         `json:"readPermission"`
	WritePermission    string         `json:"writePermission"`
	Version            int            `json:"version"`
	Lifecycle          string         `json:"lifecycle"`
	UpdatedAt          time.Time      `json:"updatedAt"`
	// RowFilter is optional row-level security: records are only visible when this
	// condition holds for the caller. Value may reference the actor, e.g. "$actor.id".
	RowFilter *RowFilter `json:"rowFilter,omitempty"`
}

// RowFilter is a row-level security rule on an entity, e.g. {field: "ownerId", op: "eq", value: "$actor.id"}.
type RowFilter struct {
	Field string `json:"field"`
	Op    string `json:"op"`    // eq, neq, in
	Value any    `json:"value"` // scalar, []any for "in", or "$actor.id"/"$actor.departmentId"/"$actor.name"
}

// Record is one instance of an entity. Soft-deleted records keep their row until purged.
type Record struct {
	ID        string         `json:"id"`
	Entity    string         `json:"entity"`
	Values    map[string]any `json:"values"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	CreatedBy string         `json:"createdBy"`
	DeletedAt *time.Time     `json:"deletedAt,omitempty"`
	DeletedBy string         `json:"deletedBy,omitempty"`
}

func (r *Record) ResourceID() string { return r.ID }

// String returns a value as text, or "" when it is missing.
func (r *Record) String(field string) string {
	if v, ok := r.Values[field].(string); ok {
		return v
	}
	return ""
}

// Number returns a numeric value, or 0 when it is missing.
func (r *Record) Number(field string) float64 {
	if v, ok := r.Values[field].(float64); ok {
		return v
	}
	return 0
}

type Connection struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Engine      string `json:"engine"`
	Host        string `json:"host"`
	Managed     bool   `json:"managed"`
	Status      string `json:"status"`
	Environment string `json:"environment"`
}

// Deleted is the response of a record delete.
type Deleted struct {
	ID      string `json:"id"`
	Deleted bool   `json:"deleted"`
}

func (d *Deleted) ResourceID() string { return d.ID }

// RecordHistoryEntry is one change to one record (who, when, field-level diff, snapshot).
type RecordHistoryEntry struct {
	Seq       int64          `json:"seq"`
	Entity    string         `json:"entity"`
	RecordID  string         `json:"recordId"`
	Actor     string         `json:"actor"`
	Action    string         `json:"action"` // created, updated, deleted, restored
	ChangedAt time.Time      `json:"changedAt"`
	Changes   map[string]any `json:"changes"`
	Snapshot  map[string]any `json:"snapshot"`
}

// FilterOp is one condition of a saved view.
type FilterOp struct {
	Field string `json:"field"`
	Op    string `json:"op"` // eq, neq, gt, gte, lt, lte, contains, in
	Value any    `json:"value"`
}

// SavedView is a named, reusable query over one entity's records.
type SavedView struct {
	ID        string     `json:"id"`
	Entity    string     `json:"entity"`
	Name      string     `json:"name"`
	Filters   []FilterOp `json:"filters"`
	SortField string     `json:"sortField,omitempty"`
	SortDesc  bool       `json:"sortDesc,omitempty"`
	Limit     int        `json:"limit,omitempty"`
	OwnerID   string     `json:"ownerId"`
	Shared    bool       `json:"shared,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// SchemaMigration changes an entity's fields and backfills existing records.
// drop/retype are refused while the entity holds records; add is always safe.
type SchemaMigration struct {
	Add      []Field        `json:"add,omitempty"`
	Drop     []string       `json:"drop,omitempty"`
	Retype   []Field        `json:"retype,omitempty"`   // same name, new type — refused with records present
	Backfill map[string]any `json:"backfill,omitempty"` // field -> value for existing records
	Note     string         `json:"note,omitempty"`
}
