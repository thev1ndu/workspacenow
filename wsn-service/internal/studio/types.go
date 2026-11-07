// Package studio builds, releases and deploys applications from their blueprints.
package studio

import (
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
)

type ScanConfig struct {
	MatchField string `json:"matchField"`
	OnScan     *struct {
		Field string `json:"field"`
		Value string `json:"value"`
	} `json:"onScan,omitempty"`
}

type Page struct {
	ID     string      `json:"id"`
	Title  string      `json:"title"`
	Kind   string      `json:"kind"`
	Entity string      `json:"entity,omitempty"`
	Scan   *ScanConfig `json:"scan,omitempty"`
}

// AppSLO is an application's service-level objective switch and targets. When enabled, applying
// the plan tracks one SLO per generated CRUD operation of the application's entities.
type AppSLO struct {
	Enabled       bool    `json:"enabled"`
	TargetSuccess float64 `json:"targetSuccess"` // 0..1
	TargetP95Ms   int     `json:"targetP95Ms"`
	WindowMinutes int     `json:"windowMinutes"`
}

type Application struct {
	ID                string    `json:"id"`
	Name              string    `json:"name"`
	Slug              string    `json:"slug"`
	Description       string    `json:"description"`
	OwnerDepartmentID string    `json:"ownerDepartmentId"`
	Lifecycle         string    `json:"lifecycle"`
	Version           string    `json:"version"`
	EntityNames       []string  `json:"entityNames"`
	Pages             []Page    `json:"pages"`
	SLO               *AppSLO   `json:"slo,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// PlannedEntity is an entity as a plan describes it, before the platform owns it.
type PlannedEntity struct {
	Name          string              `json:"name"`
	Label         string              `json:"label"`
	Description   string              `json:"description"`
	Fields        []data.Field        `json:"fields"`
	Relationships []data.Relationship `json:"relationships"`
}

// Plan is an application blueprint under review: drafted by the architect agent or edited by hand.
type Plan struct {
	Prompt            string          `json:"prompt"`
	Name              string          `json:"name"`
	Description       string          `json:"description"`
	OwnerDepartmentID string          `json:"ownerDepartmentId"`
	Entities          []PlannedEntity `json:"entities"`
	Pages             []Page          `json:"pages"`
	Operations        []string        `json:"operations"`
	Workflows         []string        `json:"workflows"`
	Permissions       []string        `json:"permissions"`
	SLO               *AppSLO         `json:"slo,omitempty"`
}

type Release struct {
	ID            string    `json:"id"`
	ApplicationID string    `json:"applicationId"`
	Version       string    `json:"version"`
	Notes         string    `json:"notes"`
	CreatedAt     time.Time `json:"createdAt"`
	CreatedBy     string    `json:"createdBy"`
}

type Deployment struct {
	ID            string    `json:"id"`
	ApplicationID string    `json:"applicationId"`
	Environment   string    `json:"environment"`
	Version       string    `json:"version"`
	Status        string    `json:"status"`
	DeployedAt    time.Time `json:"deployedAt"`
	DeployedBy    string    `json:"deployedBy"`
}

type Environment struct {
	Key              string `json:"key"`
	Name             string `json:"name"`
	RequiresApproval bool   `json:"requiresApproval"`
}

// Blueprint is the immutable snapshot a release stores in object storage.
type Blueprint struct {
	Release     Release       `json:"release"`
	Application Application   `json:"application"`
	Entities    []data.Entity `json:"entities"`
	Operations  []any         `json:"operations"`
}
