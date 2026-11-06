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
}

// Record is one instance of an entity.
type Record struct {
	ID        string         `json:"id"`
	Entity    string         `json:"entity"`
	Values    map[string]any `json:"values"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	CreatedBy string         `json:"createdBy"`
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
