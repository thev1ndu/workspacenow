package studio

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/connect"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/objectstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// Planner drafts an application plan from a description; wsn-ai-service implements it.
type Planner interface {
	Plan(ctx context.Context, req PlanRequest) (*Plan, error)
	Edit(ctx context.Context, req EditPlanRequest) (*Plan, error)
}

// EditPlanRequest carries the current blueprint and the change request, plus the problems of a
// previous draft to fix — same retry shape as PlanRequest.
type EditPlanRequest struct {
	Prompt           string   `json:"prompt"`
	Current          Plan     `json:"current"`
	Departments      []string `json:"departments"`
	ExistingEntities []string `json:"existingEntities"`
	Problems         []string `json:"problems,omitempty"`
}

// PlanRequest carries what the architect needs, plus the problems of a previous draft to fix.
type PlanRequest struct {
	Prompt           string   `json:"prompt"`
	Departments      []string `json:"departments"`
	ExistingEntities []string `json:"existingEntities"`
	Problems         []string `json:"problems,omitempty"`
}

type department struct {
	ID string `json:"id"`
}

var promotionOrder = []string{"development", "staging", "production"}

// Service builds, edits, releases and deploys applications.
type Service interface {
	Applications(ctx context.Context) ([]Application, error)
	Application(ctx context.Context, id string) (*Application, error)
	PlanApplication(ctx context.Context, ec kernel.ExecutionContext, prompt string) (*Plan, error)
	PlanEdit(ctx context.Context, ec kernel.ExecutionContext, appID, prompt string) (*Plan, error)
	Apply(ctx context.Context, ec kernel.ExecutionContext, plan Plan) (*Application, error)
	Update(ctx context.Context, ec kernel.ExecutionContext, id string, plan Plan) (*Application, error)
	Releases(ctx context.Context, appID string) ([]Release, error)
	CreateRelease(ctx context.Context, ec kernel.ExecutionContext, appID, notes string) (*Release, error)
	Deployments(ctx context.Context, appID string) ([]Deployment, error)
	Deploy(ctx context.Context, ec kernel.ExecutionContext, appID, environment, version string) (*Deployment, error)
	Pins(ctx context.Context, userID string) ([]string, error)
	Pin(ctx context.Context, userID, appID string) ([]string, error)
	Unpin(ctx context.Context, userID, appID string) ([]string, error)
}

type service struct {
	db          *gorm.DB
	auditor     kernel.Auditor
	events      kernel.Publisher
	rt          data.Runtime
	artifacts   objectstore.Store
	planner     Planner
	apps        *docstore.Collection[Application]
	releases    *docstore.Collection[Release]
	deployments *docstore.Collection[Deployment]
	envs        *docstore.Collection[Environment]
	depts       *docstore.Collection[department]
	pins        *docstore.Collection[[]string]
	apis        *docstore.Collection[connect.API]
	operations  *docstore.Collection[connect.Operation]
}

func NewService(db *gorm.DB, auditor kernel.Auditor, events kernel.Publisher, rt data.Runtime, artifacts objectstore.Store, planner Planner) Service {
	return &service{
		db: db, auditor: auditor, events: events, rt: rt, artifacts: artifacts, planner: planner,
		apps:        docstore.NewCollection(db, "applications", func(a *Application) string { return a.ID }),
		releases:    docstore.NewCollection(db, "releases", func(r *Release) string { return r.ID }),
		deployments: docstore.NewCollection(db, "deployments", func(d *Deployment) string { return d.ID }),
		envs:        docstore.NewCollection(db, "environments", func(e *Environment) string { return e.Key }),
		depts:       docstore.NewCollection(db, "departments", func(d *department) string { return d.ID }),
		pins:        docstore.NewCollection(db, "pins", func(*[]string) string { return "" }),
		apis:        docstore.NewCollection(db, "apis", func(a *connect.API) string { return a.ID }),
		operations:  docstore.NewCollection(db, "api_operations", func(o *connect.Operation) string { return o.ID }),
	}
}

func (s *service) Applications(ctx context.Context) ([]Application, error) { return s.apps.List(ctx) }

func (s *service) Application(ctx context.Context, id string) (*Application, error) {
	a, err := s.apps.Get(ctx, id)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("Application %s not found", id)
	}
	return a, err
}

func (s *service) entityNames(ctx context.Context) ([]string, error) {
	entities, err := s.rt.Entities(ctx)
	if err != nil {
		return nil, err
	}
	names := make([]string, 0, len(entities))
	for _, e := range entities {
		names = append(names, e.Name)
	}
	return names, nil
}

// PlanApplication asks the Application Architect agent for a plan and checks it before returning it.
func (s *service) PlanApplication(ctx context.Context, ec kernel.ExecutionContext, prompt string) (*Plan, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "studio.manage", "application.plan", "application"); err != nil {
		return nil, err
	}
	prompt = strings.TrimSpace(prompt)
	if len(prompt) < 8 {
		return nil, kernel.Invalid("Describe the application in a sentence or two")
	}
	existing, err := s.entityNames(ctx)
	if err != nil {
		return nil, err
	}
	depts, err := s.depts.List(ctx)
	if err != nil {
		return nil, err
	}
	req := PlanRequest{Prompt: prompt, ExistingEntities: existing}
	for _, d := range depts {
		req.Departments = append(req.Departments, d.ID)
	}
	architect := ec
	architect.Actor = kernel.Actor{Kind: kernel.ActorAgent, ID: "agent-application-architect", Name: "Application Architect", OnBehalfOf: ec.Actor.Name}
	if err := s.auditor.RecordDetached(ctx, architect, "application.plan", "application", kernel.OutcomeAllowed, prompt); err != nil {
		return nil, err
	}
	var plan *Plan
	for attempt := 0; attempt < 2; attempt++ {
		plan, err = s.planner.Plan(ctx, req)
		if err != nil {
			return nil, kernel.InvalidState("The Application Architect could not draft a plan: %s", err.Error())
		}
		plan.Prompt = prompt
		plan.Operations = planOperations(plan.Entities)
		if req.Problems = validatePlan(*plan, existing); len(req.Problems) == 0 {
			break
		}
	}
	// A plan with remaining problems is still returned: the editor shows them for the user to fix.
	return plan, nil
}

// PlanEdit asks the Application Architect to revise an existing application's blueprint. The
// updated plan is validated with the same change rules Apply/Update enforce and returned for
// review; nothing is applied until the caller PUTs the plan.
func (s *service) PlanEdit(ctx context.Context, ec kernel.ExecutionContext, appID, prompt string) (*Plan, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "studio.manage", "application.plan", "application/"+appID); err != nil {
		return nil, err
	}
	prompt = strings.TrimSpace(prompt)
	if len(prompt) < 8 {
		return nil, kernel.Invalid("Describe the change in a sentence or two")
	}
	app, err := s.apps.Get(ctx, appID)
	if err != nil {
		if errors.Is(err, docstore.ErrNotFound) {
			return nil, kernel.NotFound("Application not found")
		}
		return nil, err
	}
	entities, err := s.rt.Entities(ctx)
	if err != nil {
		return nil, err
	}
	saved := ownedEntities(app, entities)
	var others []string
	for _, e := range entities {
		if !slices.ContainsFunc(saved, func(o data.Entity) bool { return o.Name == e.Name }) {
			others = append(others, e.Name)
		}
	}
	current := planFromApp(app, saved)
	depts, err := s.depts.List(ctx)
	if err != nil {
		return nil, err
	}
	req := EditPlanRequest{Prompt: prompt, Current: current, ExistingEntities: others}
	for _, d := range depts {
		req.Departments = append(req.Departments, d.ID)
	}
	architect := ec
	architect.Actor = kernel.Actor{Kind: kernel.ActorAgent, ID: "agent-application-architect", Name: "Application Architect", OnBehalfOf: ec.Actor.Name}
	if err := s.auditor.RecordDetached(ctx, architect, "application.plan", "application/"+appID, kernel.OutcomeAllowed, prompt); err != nil {
		return nil, err
	}
	var plan *Plan
	for attempt := 0; attempt < 2; attempt++ {
		plan, err = s.planner.Edit(ctx, req)
		if err != nil {
			return nil, kernel.InvalidState("The Application Architect could not revise the plan: %s", err.Error())
		}
		plan.Prompt = prompt
		plan.Operations = planOperations(plan.Entities)
		if req.Problems = append(validatePlan(*plan, others), validatePlanChanges(saved, *plan)...); len(req.Problems) == 0 {
			break
		}
	}
	// A plan with remaining problems is still returned: the editor shows them for the user to fix.
	return plan, nil
}

// planFromApp rebuilds the editable plan of an application from its stored blueprint pieces.
func planFromApp(app *Application, saved []data.Entity) Plan {
	p := Plan{
		Name:              app.Name,
		Description:       app.Description,
		OwnerDepartmentID: app.OwnerDepartmentID,
		Pages:             app.Pages,
	}
	for _, e := range saved {
		p.Entities = append(p.Entities, PlannedEntity{
			Name: e.Name, Label: e.Label, Description: e.Description, Fields: e.Fields, Relationships: e.Relationships,
		})
	}
	return p
}

func (s *service) Apply(ctx context.Context, ec kernel.ExecutionContext, plan Plan) (*Application, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "studio.manage", "application.create", "application"); err != nil {
		return nil, err
	}
	slug := slugify(plan.Name)
	var app *Application
	err := postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		if n, err := s.apps.Count(ctx, "doc->>'slug' = ?", slug); err != nil {
			return err
		} else if n > 0 {
			return kernel.Conflict("An application named %s already exists", plan.Name)
		}
		existing, err := s.entityNames(ctx)
		if err != nil {
			return err
		}
		if problems := validatePlan(plan, existing); len(problems) > 0 {
			return kernel.Problems(problems)
		}
		now := time.Now().UTC()
		app = &Application{
			ID: kernel.NewID("app"), Name: plan.Name, Slug: slug, Description: plan.Description, OwnerDepartmentID: plan.OwnerDepartmentID,
			Lifecycle: "draft", Version: "0.1.0", CreatedAt: now, UpdatedAt: now,
		}
		for _, e := range plan.Entities {
			app.EntityNames = append(app.EntityNames, e.Name)
		}
		for _, p := range plan.Pages {
			p.ID = kernel.NewID("page")
			app.Pages = append(app.Pages, p)
		}
		if err := s.apps.Put(ctx, app); err != nil {
			return err
		}
		api, err := s.applicationAPI(ctx, app)
		if err != nil {
			return err
		}
		for _, e := range plan.Entities {
			if err := s.addEntity(ctx, app, api, e, now); err != nil {
				return err
			}
		}
		detail := "Built in the visual editor"
		if plan.Prompt != "" {
			detail = "From prompt: " + plan.Prompt
		}
		if err := s.auditor.Record(ctx, ec, "application.create", "application/"+app.ID, kernel.OutcomeAllowed, detail); err != nil {
			return err
		}
		_, err = s.events.Publish(ctx, ec, "Application.Created", "application:"+app.Slug, map[string]any{"applicationId": app.ID})
		return err
	})
	return app, err
}

func (s *service) Update(ctx context.Context, ec kernel.ExecutionContext, id string, plan Plan) (*Application, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "studio.manage", "application.update", "application/"+id); err != nil {
		return nil, err
	}
	var app *Application
	err := postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		var err error
		app, err = s.apps.GetForUpdate(ctx, id)
		if errors.Is(err, docstore.ErrNotFound) {
			return kernel.NotFound("Application not found")
		}
		if err != nil {
			return err
		}
		slug := slugify(plan.Name)
		if n, err := s.apps.Count(ctx, "id <> ? AND doc->>'slug' = ?", app.ID, slug); err != nil {
			return err
		} else if n > 0 {
			return kernel.Conflict("An application named %s already exists", plan.Name)
		}
		entities, err := s.rt.Entities(ctx)
		if err != nil {
			return err
		}
		saved := ownedEntities(app, entities)
		var others []string
		for _, e := range entities {
			if !slices.ContainsFunc(saved, func(o data.Entity) bool { return o.Name == e.Name }) {
				others = append(others, e.Name)
			}
		}
		if problems := append(validatePlan(plan, others), validatePlanChanges(saved, plan)...); len(problems) > 0 {
			return kernel.Problems(problems)
		}
		now := time.Now().UTC()
		api, err := s.applicationAPI(ctx, app)
		if err != nil {
			return err
		}
		for _, e := range plan.Entities {
			i := slices.IndexFunc(saved, func(o data.Entity) bool { return o.Name == e.Name })
			if i < 0 {
				if err := s.addEntity(ctx, app, api, e, now); err != nil {
					return err
				}
				continue
			}
			current := saved[i]
			if sameEntity(current, e) {
				continue
			}
			current.Label, current.Description, current.Fields, current.Relationships = e.Label, e.Description, e.Fields, e.Relationships
			current.Version++
			current.UpdatedAt = now
			if err := s.rt.PutEntity(ctx, &current); err != nil {
				return err
			}
		}
		app.Name, app.Slug, app.Description, app.OwnerDepartmentID = plan.Name, slug, plan.Description, plan.OwnerDepartmentID
		for _, e := range plan.Entities {
			if !slices.Contains(app.EntityNames, e.Name) {
				app.EntityNames = append(app.EntityNames, e.Name)
			}
		}
		pages := make([]Page, 0, len(plan.Pages))
		for _, p := range plan.Pages {
			if p.ID == "" || !slices.ContainsFunc(app.Pages, func(old Page) bool { return old.ID == p.ID }) {
				p.ID = kernel.NewID("page")
			}
			pages = append(pages, p)
		}
		app.Pages, app.UpdatedAt = pages, now
		if err := s.apps.Put(ctx, app); err != nil {
			return err
		}
		if err := s.auditor.Record(ctx, ec, "application.update", "application/"+app.ID, kernel.OutcomeAllowed, "Edited in the visual editor"); err != nil {
			return err
		}
		_, err = s.events.Publish(ctx, ec, "Application.Updated", "application:"+app.Slug, map[string]any{"applicationId": app.ID})
		return err
	})
	return app, err
}

func sameEntity(e data.Entity, p PlannedEntity) bool {
	a, _ := json.Marshal([]any{e.Label, e.Description, e.Fields, e.Relationships})
	b, _ := json.Marshal([]any{p.Label, p.Description, p.Fields, p.Relationships})
	return string(a) == string(b)
}

// addEntity creates a planned entity owned by the application, with its generated CRUD API operations.
func (s *service) addEntity(ctx context.Context, app *Application, api *connect.API, e PlannedEntity, now time.Time) error {
	relationships := e.Relationships
	if relationships == nil {
		relationships = []data.Relationship{}
	}
	entity := &data.Entity{
		ID: kernel.NewID("ent"), Name: e.Name, Label: e.Label, Description: e.Description, Scope: data.ScopeApplication, OwnerApplicationID: app.ID,
		Fields: e.Fields, Relationships: relationships, Events: []string{e.Name + ".Created", e.Name + ".Updated"},
		ReadPermission: "data.manage", WritePermission: "data.manage", Version: 1, Lifecycle: "draft", UpdatedAt: now,
	}
	if err := s.rt.PutEntity(ctx, entity); err != nil {
		return err
	}
	path := "/" + slugify(e.Label) + "s"
	lower := strings.ToLower(e.Label)
	for _, op := range []struct{ method, path, verb, summary string }{
		{"GET", path, "list", "List " + lower + "s"},
		{"GET", path + "/{id}", "get", "Get a " + lower},
		{"POST", path, "create", "Create a " + lower},
		{"PATCH", path + "/{id}", "update", "Update a " + lower},
	} {
		if err := s.operations.Put(ctx, &connect.Operation{
			ID: kernel.NewID("op"), APIID: api.ID, Method: op.method, Path: op.path, Summary: op.summary,
			BusinessOperation: e.Name + "." + op.verb, Permission: "data.manage", RateLimitPerMinute: 120,
		}); err != nil {
			return err
		}
	}
	return nil
}

// applicationAPI returns the application's generated CRUD API, creating it the first time.
func (s *service) applicationAPI(ctx context.Context, app *Application) (*connect.API, error) {
	existing, err := s.apis.Where(ctx, "doc->>'applicationId' = ?", app.ID)
	if err != nil {
		return nil, err
	}
	if len(existing) > 0 {
		return &existing[0], nil
	}
	api := &connect.API{
		ID: kernel.NewID("api"), Name: app.Name + " API", BasePath: "/" + app.Slug, ApplicationID: app.ID,
		Version: "0.1.0", Lifecycle: "draft", Description: "Generated CRUD operations for " + app.Name + ".",
	}
	return api, s.apis.Put(ctx, api)
}

func (s *service) Releases(ctx context.Context, appID string) ([]Release, error) {
	out, err := s.releases.Where(ctx, "doc->>'applicationId' = ?", appID)
	slices.SortFunc(out, func(a, b Release) int { return b.CreatedAt.Compare(a.CreatedAt) })
	return out, err
}

// CreateRelease freezes the current blueprint as an immutable artifact in object storage.
func (s *service) CreateRelease(ctx context.Context, ec kernel.ExecutionContext, appID, notes string) (*Release, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "studio.manage", "release.create", "application/"+appID); err != nil {
		return nil, err
	}
	var release *Release
	err := postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		app, err := s.apps.GetForUpdate(ctx, appID)
		if errors.Is(err, docstore.ErrNotFound) {
			return kernel.NotFound("Application not found")
		}
		if err != nil {
			return err
		}
		count, err := s.releases.Count(ctx, "doc->>'applicationId' = ?", app.ID)
		if err != nil {
			return err
		}
		version := app.Version
		switch {
		case count > 0:
			version = bump(app.Version)
		case app.Version == "0.1.0":
			version = "1.0.0"
		}
		now := time.Now().UTC()
		release = &Release{ID: kernel.NewID("rel"), ApplicationID: app.ID, Version: version, Notes: notes, CreatedAt: now, CreatedBy: ec.Actor.Name}
		app.Version, app.Lifecycle, app.UpdatedAt = version, "released", now
		entities, err := s.rt.Entities(ctx)
		if err != nil {
			return err
		}
		var owned []data.Entity
		for _, e := range entities {
			if e.OwnerApplicationID == app.ID {
				e.Lifecycle = "released"
				if err := s.rt.PutEntity(ctx, &e); err != nil {
					return err
				}
				owned = append(owned, e)
			}
		}
		if err := s.storeBlueprint(ctx, *release, *app, owned); err != nil {
			return err
		}
		if err := s.releases.Put(ctx, release); err != nil {
			return err
		}
		if err := s.apps.Put(ctx, app); err != nil {
			return err
		}
		if err := s.auditor.Record(ctx, ec, "release.create", "application/"+app.ID, kernel.OutcomeAllowed, "Release "+version); err != nil {
			return err
		}
		_, err = s.events.Publish(ctx, ec, "Release.Created", "application:"+app.Slug, map[string]any{"applicationId": app.ID, "version": version})
		return err
	})
	return release, err
}

func (s *service) storeBlueprint(ctx context.Context, release Release, app Application, entities []data.Entity) error {
	bp := Blueprint{Release: release, Application: app, Entities: entities}
	apis, err := s.apis.Where(ctx, "doc->>'applicationId' = ?", app.ID)
	if err != nil {
		return err
	}
	for _, api := range apis {
		ops, err := s.operations.Where(ctx, "doc->>'apiId' = ?", api.ID)
		if err != nil {
			return err
		}
		for _, op := range ops {
			bp.Operations = append(bp.Operations, op)
		}
	}
	body, err := json.MarshalIndent(bp, "", "  ")
	if err != nil {
		return err
	}
	return s.artifacts.Put(ctx, fmt.Sprintf("releases/%s/%s/blueprint.json", app.ID, release.Version), "application/json", body)
}

func (s *service) Deployments(ctx context.Context, appID string) ([]Deployment, error) {
	var out []Deployment
	var err error
	if appID == "" {
		out, err = s.deployments.List(ctx)
	} else {
		out, err = s.deployments.Where(ctx, "doc->>'applicationId' = ?", appID)
	}
	slices.SortFunc(out, func(a, b Deployment) int { return b.DeployedAt.Compare(a.DeployedAt) })
	return out, err
}

func (s *service) Deploy(ctx context.Context, ec kernel.ExecutionContext, appID, environment, version string) (*Deployment, error) {
	app, err := s.Application(ctx, appID)
	if err != nil {
		return nil, err
	}
	if n, err := s.releases.Count(ctx, "doc->>'applicationId' = ? AND doc->>'version' = ?", app.ID, version); err != nil {
		return nil, err
	} else if n == 0 {
		return nil, kernel.Invalid("Release %s does not exist", version)
	}
	env, err := s.envs.Get(ctx, environment)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("Environment %s not found", environment)
	}
	if err != nil {
		return nil, err
	}
	permission, action := "studio.manage", "deployment.create"
	if env.RequiresApproval {
		permission, action = "deployment.promote", "deployment.promote"
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, permission, action, "application/"+app.ID); err != nil {
		return nil, err
	}
	var deployment *Deployment
	err = postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		existing, err := s.deployments.Where(ctx, "doc->>'applicationId' = ?", app.ID)
		if err != nil {
			return err
		}
		if i := slices.Index(promotionOrder, environment); i > 0 {
			previous := promotionOrder[i-1]
			if !slices.ContainsFunc(existing, func(d Deployment) bool { return d.Environment == previous && d.Version == version }) {
				return kernel.InvalidState("Release %s must be deployed to %s first", version, previous)
			}
		}
		for i := range existing {
			if d := &existing[i]; d.Environment == environment && d.Status == "active" {
				d.Status = "superseded"
				if err := s.deployments.Put(ctx, d); err != nil {
					return err
				}
			}
		}
		deployment = &Deployment{ID: kernel.NewID("dep"), ApplicationID: app.ID, Environment: environment, Version: version, Status: "active", DeployedAt: time.Now().UTC(), DeployedBy: ec.Actor.Name}
		if err := s.deployments.Put(ctx, deployment); err != nil {
			return err
		}
		if err := s.auditor.Record(ctx, ec, "deployment.create", "application/"+app.ID, kernel.OutcomeAllowed, version+" to "+environment); err != nil {
			return err
		}
		_, err = s.events.Publish(ctx, ec, "Deployment.Completed", "application:"+app.Slug, map[string]any{"environment": environment, "version": version})
		return err
	})
	return deployment, err
}

func (s *service) Pins(ctx context.Context, userID string) ([]string, error) {
	pins, err := s.pins.Get(ctx, userID)
	if errors.Is(err, docstore.ErrNotFound) {
		return []string{}, nil
	}
	if err != nil {
		return nil, err
	}
	return *pins, nil
}

func (s *service) Pin(ctx context.Context, userID, appID string) ([]string, error) {
	if _, err := s.Application(ctx, appID); err != nil {
		return nil, err
	}
	pins, err := s.Pins(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !slices.Contains(pins, appID) {
		pins = append(pins, appID)
		if err := s.pins.PutID(ctx, userID, &pins); err != nil {
			return nil, err
		}
	}
	return pins, nil
}

func (s *service) Unpin(ctx context.Context, userID, appID string) ([]string, error) {
	pins, err := s.Pins(ctx, userID)
	if err != nil {
		return nil, err
	}
	pins = slices.DeleteFunc(pins, func(id string) bool { return id == appID })
	return pins, s.pins.PutID(ctx, userID, &pins)
}
