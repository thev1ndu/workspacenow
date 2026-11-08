package studio

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/postgres"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// Theme is a logo + primary color for an application or the whole installation (white-label).
type Theme struct {
	PrimaryColor string `json:"primaryColor,omitempty"`
	LogoURL      string `json:"logoUrl,omitempty"`
}

var hexColorRe = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

// Template is one marketplace entry: a versioned, publisher-signed blueprint.
type Template struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Version     string `json:"version"`
	Signature   string `json:"signature"`
	Blueprint   Plan   `json:"blueprint"`
}

// InstallTemplateInput is the body of POST /templates/{id}/install.
type InstallTemplateInput struct {
	Name        string `json:"name,omitempty"`
	Environment string `json:"environment,omitempty"`
}

// BlueprintChange is one entry of a business-language blueprint diff.
type BlueprintChange struct {
	Kind   string `json:"kind"`   // entity, field, page, operation, application
	Change string `json:"change"` // added, removed, changed
	Name   string `json:"name"`
	Detail string `json:"detail"`
}

// BlueprintDiff is the result of GET /applications/{id}/diff.
type BlueprintDiff struct {
	From    string            `json:"from"`
	To      string            `json:"to"`
	Summary []string          `json:"summary"`
	Changes []BlueprintChange `json:"changes"`
}

// PreviewResult is the result of POST /applications/{id}/preview.
type PreviewResult struct {
	Deployment    *Deployment `json:"deployment"`
	RecordsSeeded int         `json:"recordsSeeded"`
	URL           string      `json:"url"`
}

func templateSigningKey() string {
	if k := os.Getenv("WSN_TEMPLATE_SIGNING_KEY"); k != "" {
		return k
	}
	return "workspacenow-dev-template-key"
}

// signTemplate computes the publisher signature: HMAC-SHA256 over the canonical blueprint JSON.
func signTemplate(bp Plan) string {
	canonical, _ := json.Marshal(bp)
	mac := hmac.New(sha256.New, []byte(templateSigningKey()))
	mac.Write(canonical)
	return hex.EncodeToString(mac.Sum(nil))
}

func verifyTemplate(t Template) error {
	if !hmac.Equal([]byte(t.Signature), []byte(signTemplate(t.Blueprint))) {
		return fmt.Errorf("template signature does not match its blueprint")
	}
	return nil
}

// seedTemplates returns the built-in marketplace catalog (inventory, procurement, CRM, HR requests).
func seedTemplates() []Template {
	mk := func(id, name, desc, category string, bp Plan) Template {
		bp.Name = name
		return Template{ID: id, Name: name, Description: desc, Category: category, Version: "1.0.0", Blueprint: bp, Signature: signTemplate(bp)}
	}
	return []Template{
		mk("tpl-inventory", "Inventory Management", "Products, stock levels, low-stock events and reorder points.", "inventory", Plan{
			Description: "Track products and stock; low stock raises an event for replenishment workflows.",
			Entities: []PlannedEntity{{
				Name: "Product", Label: "Product", Description: "A sellable product.",
				Fields: []data.Field{
					{Name: "name", Label: "Name", Type: data.FieldString, Required: true, Unique: true},
					{Name: "sku", Label: "SKU", Type: data.FieldString, Required: true, Unique: true},
					{Name: "stock", Label: "Stock", Type: data.FieldInteger, Required: true},
					{Name: "reorderLevel", Label: "Reorder level", Type: data.FieldInteger, Required: true},
					{Name: "unitPrice", Label: "Unit price", Type: data.FieldNumber},
				},
			}},
			Pages:       []Page{{ID: "products", Title: "Products", Kind: "list", Entity: "Product"}},
			Operations:  []string{"record sale", "adjust stock"},
			Workflows:   []string{"low-stock replenishment"},
			Permissions: []string{"inventory.read", "inventory.write"},
		}),
		mk("tpl-procurement", "Procurement", "Purchase requests with approvals and purchase orders to suppliers.", "procurement", Plan{
			Description: "Purchase requests flow through approval to purchase orders.",
			Entities: []PlannedEntity{
				{Name: "PurchaseRequest", Label: "Purchase request", Fields: []data.Field{
					{Name: "title", Label: "Title", Type: data.FieldString, Required: true},
					{Name: "product", Label: "Product", Type: data.FieldString, Required: true},
					{Name: "quantity", Label: "Quantity", Type: data.FieldInteger, Required: true},
					{Name: "status", Label: "Status", Type: data.FieldEnum, EnumValues: []string{"draft", "pending", "approved", "rejected"}},
				}},
				{Name: "PurchaseOrder", Label: "Purchase order", Fields: []data.Field{
					{Name: "requestId", Label: "Request", Type: data.FieldString, Required: true},
					{Name: "supplier", Label: "Supplier", Type: data.FieldString, Required: true},
					{Name: "status", Label: "Status", Type: data.FieldEnum, EnumValues: []string{"open", "sent", "received"}},
				}},
			},
			Pages:       []Page{{ID: "requests", Title: "Purchase requests", Kind: "list", Entity: "PurchaseRequest"}},
			Operations:  []string{"create purchase request", "approve purchase request", "create purchase order"},
			Workflows:   []string{"purchase approval"},
			Permissions: []string{"procurement.read", "procurement.approve"},
		}),
		mk("tpl-crm", "CRM", "Contacts, companies and deals with a pipeline view.", "crm", Plan{
			Description: "Contacts and companies with deals tracked through a pipeline.",
			Entities: []PlannedEntity{
				{Name: "Company", Label: "Company", Fields: []data.Field{
					{Name: "name", Label: "Name", Type: data.FieldString, Required: true, Unique: true},
					{Name: "industry", Label: "Industry", Type: data.FieldString},
				}},
				{Name: "Contact", Label: "Contact", Fields: []data.Field{
					{Name: "name", Label: "Name", Type: data.FieldString, Required: true},
					{Name: "email", Label: "Email", Type: data.FieldString, Unique: true},
					{Name: "company", Label: "Company", Type: data.FieldString},
				}},
				{Name: "Deal", Label: "Deal", Fields: []data.Field{
					{Name: "title", Label: "Title", Type: data.FieldString, Required: true},
					{Name: "stage", Label: "Stage", Type: data.FieldEnum, EnumValues: []string{"lead", "qualified", "proposal", "won", "lost"}},
					{Name: "amount", Label: "Amount", Type: data.FieldNumber},
				}},
			},
			Pages:       []Page{{ID: "deals", Title: "Deals", Kind: "list", Entity: "Deal"}},
			Permissions: []string{"crm.read", "crm.write"},
		}),
		mk("tpl-hr", "HR Requests", "Employee requests (leave, equipment, expense) with approvals.", "hr", Plan{
			Description: "Employees file requests; managers approve or reject them.",
			Entities: []PlannedEntity{{
				Name: "Request", Label: "Request", Fields: []data.Field{
					{Name: "type", Label: "Type", Type: data.FieldEnum, EnumValues: []string{"leave", "equipment", "expense"}, Required: true},
					{Name: "reason", Label: "Reason", Type: data.FieldText},
					{Name: "status", Label: "Status", Type: data.FieldEnum, EnumValues: []string{"pending", "approved", "rejected"}},
				},
			}},
			Pages:       []Page{{ID: "requests", Title: "My requests", Kind: "list", Entity: "Request"}},
			Operations:  []string{"file request", "decide request"},
			Workflows:   []string{"request approval"},
			Permissions: []string{"hr.read", "hr.approve"},
		}),
	}
}

// ListTemplates answers GET /templates, lazily seeding the built-in catalog once.
func (s *service) ListTemplates(ctx context.Context) ([]Template, error) {
	if n, err := s.templates.Count(ctx, "1 = 1"); err != nil {
		return nil, err
	} else if n == 0 {
		for _, t := range seedTemplates() {
			t := t
			if err := s.templates.Put(ctx, &t); err != nil {
				return nil, err
			}
		}
	}
	return s.templates.List(ctx)
}

// GetTemplate answers GET /templates/{id}.
func (s *service) GetTemplate(ctx context.Context, id string) (*Template, error) {
	t, err := s.templates.Get(ctx, id)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("Template %s not found", id)
	}
	return t, err
}

// InstallTemplate verifies the template signature and applies its blueprint as a new application.
func (s *service) InstallTemplate(ctx context.Context, ec kernel.ExecutionContext, templateID string, in InstallTemplateInput) (*Application, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "studio.manage", "template.install", "template/"+templateID); err != nil {
		return nil, err
	}
	t, err := s.GetTemplate(ctx, templateID)
	if err != nil {
		return nil, err
	}
	if err := verifyTemplate(*t); err != nil {
		_ = s.auditor.Record(ctx, ec, "template.install", "template/"+templateID, kernel.OutcomeFailed, err.Error())
		return nil, kernel.Invalid("Template signature verification failed: %s", err.Error())
	}
	plan := t.Blueprint
	if in.Name != "" {
		plan.Name = in.Name
	}
	app, err := s.Apply(ctx, ec, plan)
	if err != nil {
		return nil, err
	}
	if err := s.auditor.Record(ctx, ec, "template.install", "application/"+app.ID, kernel.OutcomeAllowed, t.Name+" v"+t.Version); err != nil {
		return nil, err
	}
	return app, nil
}

// loadBlueprint reads a stored release blueprint, resolving from/to as release id or version.
func (s *service) loadBlueprint(ctx context.Context, appID, ref string) (*Blueprint, error) {
	version := ref
	rels, err := s.releases.Where(ctx, "doc->>'applicationId' = ?", appID)
	if err != nil {
		return nil, err
	}
	for _, r := range rels {
		if r.ID == ref || r.Version == ref {
			version = r.Version
			break
		}
	}
	body, err := s.artifacts.Get(ctx, fmt.Sprintf("releases/%s/%s/blueprint.json", appID, version))
	if err != nil {
		return nil, kernel.NotFound("No stored blueprint for version %s", version)
	}
	var bp Blueprint
	if err := json.Unmarshal(body, &bp); err != nil {
		return nil, err
	}
	return &bp, nil
}

// DiffVersions compares two stored blueprints of an application in business language.
func (s *service) DiffVersions(ctx context.Context, ec kernel.ExecutionContext, appID, from, to string) (*BlueprintDiff, error) {
	if _, err := s.Application(ctx, appID); err != nil {
		return nil, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "studio.read", "application.diff", "application/"+appID); err != nil {
		return nil, err
	}
	a, err := s.loadBlueprint(ctx, appID, from)
	if err != nil {
		return nil, err
	}
	b, err := s.loadBlueprint(ctx, appID, to)
	if err != nil {
		return nil, err
	}
	return diffBlueprints(a, b), nil
}

// diffBlueprints computes the business-language diff between two stored blueprints.
func diffBlueprints(a, b *Blueprint) *BlueprintDiff {
	diff := &BlueprintDiff{From: a.Release.Version, To: b.Release.Version}
	add := func(kind, change, name, detail string) {
		diff.Changes = append(diff.Changes, BlueprintChange{Kind: kind, Change: change, Name: name, Detail: detail})
		diff.Summary = append(diff.Summary, detail)
	}

	// entities and their fields
	entsA := map[string]data.Entity{}
	for _, e := range a.Entities {
		entsA[e.Name] = e
	}
	entsB := map[string]data.Entity{}
	for _, e := range b.Entities {
		entsB[e.Name] = e
	}
	for name, eb := range entsB {
		ea, ok := entsA[name]
		if !ok {
			add("entity", "added", name, fmt.Sprintf("Adds entity %s (%d fields)", name, len(eb.Fields)))
			continue
		}
		fieldsA := map[string]data.Field{}
		for _, f := range ea.Fields {
			fieldsA[f.Name] = f
		}
		for _, fb := range eb.Fields {
			fa, ok := fieldsA[fb.Name]
			if !ok {
				add("field", "added", name+"."+fb.Name, fmt.Sprintf("Adds field '%s' (%s) to %s", fb.Name, fb.Type, name))
				continue
			}
			if fa.Type != fb.Type {
				add("field", "changed", name+"."+fb.Name, fmt.Sprintf("Changes field '%s' of %s from %s to %s", fb.Name, name, fa.Type, fb.Type))
			}
		}
		for _, fa := range ea.Fields {
			if !slicesContainsField(entsB[name].Fields, fa.Name) {
				add("field", "removed", name+"."+fa.Name, fmt.Sprintf("Removes field '%s' from %s", fa.Name, name))
			}
		}
	}
	for name := range entsA {
		if _, ok := entsB[name]; !ok {
			add("entity", "removed", name, fmt.Sprintf("Removes entity %s", name))
		}
	}

	// pages
	pagesA := map[string]Page{}
	for _, p := range a.Application.Pages {
		pagesA[p.ID] = p
	}
	pagesB := map[string]Page{}
	for _, p := range b.Application.Pages {
		pagesB[p.ID] = p
	}
	for id, pb := range pagesB {
		pa, ok := pagesA[id]
		if !ok {
			add("page", "added", pb.Title, fmt.Sprintf("Adds page '%s'", pb.Title))
			continue
		}
		if pa.Title != pb.Title || pa.Kind != pb.Kind || pa.Entity != pb.Entity {
			add("page", "changed", pb.Title, fmt.Sprintf("Changes page '%s'", pb.Title))
		}
	}
	for id, pa := range pagesA {
		if _, ok := pagesB[id]; !ok {
			add("page", "removed", pa.Title, fmt.Sprintf("Removes page '%s'", pa.Title))
		}
	}

	// operations
	opsA := opNames(a.Operations)
	opsB := opNames(b.Operations)
	for _, o := range opsB {
		if !slicesContains(opsA, o) {
			add("operation", "added", o, fmt.Sprintf("Adds operation '%s'", o))
		}
	}
	for _, o := range opsA {
		if !slicesContains(opsB, o) {
			add("operation", "removed", o, fmt.Sprintf("Removes operation '%s'", o))
		}
	}

	// application-level
	if a.Application.Description != b.Application.Description {
		add("application", "changed", "description", "Changes the application description")
	}
	sort.Slice(diff.Changes, func(i, j int) bool {
		if diff.Changes[i].Kind != diff.Changes[j].Kind {
			return diff.Changes[i].Kind < diff.Changes[j].Kind
		}
		return diff.Changes[i].Name < diff.Changes[j].Name
	})
	sort.Strings(diff.Summary)
	if len(diff.Summary) == 0 {
		diff.Summary = []string{"No changes"}
	}
	return diff
}

func slicesContains(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}

func slicesContainsField(fields []data.Field, name string) bool {
	for _, f := range fields {
		if f.Name == name {
			return true
		}
	}
	return false
}

func opNames(ops []any) []string {
	var out []string
	for _, o := range ops {
		if m, ok := o.(map[string]any); ok {
			if n, ok := m["name"].(string); ok {
				out = append(out, n)
			}
		}
	}
	sort.Strings(out)
	return out
}

// Preview deploys the current draft as a sandbox preview and seeds deterministic sample records.
func (s *service) Preview(ctx context.Context, ec kernel.ExecutionContext, appID string) (*PreviewResult, error) {
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "studio.manage", "application.preview", "application/"+appID); err != nil {
		return nil, err
	}
	app, err := s.Application(ctx, appID)
	if err != nil {
		return nil, err
	}
	var deployment *Deployment
	seeded := 0
	err = postgres.InTx(ctx, s.db, func(ctx context.Context) error {
		// supersede previous previews of this app in development
		existing, err := s.deployments.Where(ctx, "doc->>'applicationId' = ?", app.ID)
		if err != nil {
			return err
		}
		for i := range existing {
			d := &existing[i]
			if d.Environment == "development" && d.Status == "active" {
				d.Status = "superseded"
				if err := s.deployments.Put(ctx, d); err != nil {
					return err
				}
			}
		}
		deployment = &Deployment{
			ID: kernel.NewID("dep"), ApplicationID: app.ID, Environment: "development",
			Version: app.Version, Status: "active", Preview: true,
			DeployedAt: time.Now().UTC(), DeployedBy: ec.Actor.Name,
		}
		if err := s.deployments.Put(ctx, deployment); err != nil {
			return err
		}
		// seed sample records for the app's entities that have none yet
		entities, err := s.rt.Entities(ctx)
		if err != nil {
			return err
		}
		for _, e := range entities {
			if e.OwnerApplicationID != app.ID {
				continue
			}
			records, err := s.rt.Records(ctx, e.Name)
			if err != nil {
				return err
			}
			if len(records) > 0 {
				continue
			}
			for i := 0; i < 5; i++ {
				if _, err := s.rt.Create(ctx, ec, e.Name, sampleValues(e, i)); err != nil {
					return err
				}
				seeded++
			}
		}
		return s.auditor.Record(ctx, ec, "application.preview", "application/"+app.ID, kernel.OutcomeAllowed,
			fmt.Sprintf("preview of v%s, %d sample records", app.Version, seeded))
	})
	if err != nil {
		return nil, err
	}
	return &PreviewResult{Deployment: deployment, RecordsSeeded: seeded, URL: "/apps/" + app.Slug + "?preview=1"}, nil
}

// sampleValues builds one deterministic sample record for an entity.
func sampleValues(e data.Entity, i int) map[string]any {
	out := map[string]any{}
	for _, f := range e.Fields {
		lower := strings.ToLower(f.Name)
		switch {
		case f.Type == data.FieldBoolean:
			out[f.Name] = i%2 == 0
		case f.Type == data.FieldInteger:
			out[f.Name] = sampleNumber(lower, i)
		case f.Type == data.FieldNumber:
			out[f.Name] = float64(sampleNumber(lower, i)) / 10
		case f.Type == data.FieldDate:
			out[f.Name] = time.Now().UTC().AddDate(0, 0, i-2).Format("2006-01-02")
		case f.Type == data.FieldEnum && len(f.EnumValues) > 0:
			out[f.Name] = f.EnumValues[i%len(f.EnumValues)]
		default:
			out[f.Name] = sampleString(lower, f.Label, i)
		}
	}
	return out
}

func sampleNumber(lower string, i int) int {
	switch {
	case strings.Contains(lower, "price") || strings.Contains(lower, "amount") || strings.Contains(lower, "cost"):
		return 10 + i*7
	case strings.Contains(lower, "stock") || strings.Contains(lower, "quantity") || strings.Contains(lower, "level"):
		return 5 + i*3
	default:
		return i + 1
	}
}

var sampleAdjectives = []string{"Atlas", "Boreal", "Cedar", "Delta", "Ember", "Fjord"}
var sampleNouns = []string{"Widget", "Gadget", "Module", "Kit", "Pack", "Set"}

func sampleString(lower, label string, i int) string {
	switch {
	case strings.Contains(lower, "email"):
		return fmt.Sprintf("user%d@example.com", i+1)
	case strings.Contains(lower, "sku") || strings.Contains(lower, "code"):
		return fmt.Sprintf("SKU-%03d", i+1)
	case strings.Contains(lower, "name") || strings.Contains(lower, "title"):
		return fmt.Sprintf("%s %s %d", sampleAdjectives[i%len(sampleAdjectives)], sampleNouns[i%len(sampleNouns)], i+1)
	default:
		return fmt.Sprintf("%s %d", label, i+1)
	}
}

// SetTheme sets an application's theme (logo + primary color). Validates the hex color.
func (s *service) SetTheme(ctx context.Context, ec kernel.ExecutionContext, appID string, t Theme) (*Application, error) {
	if t.PrimaryColor != "" && !hexColorRe.MatchString(t.PrimaryColor) {
		return nil, kernel.Invalid("primaryColor must be a hex color like #6d28d9")
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "studio.manage", "application.theme", "application/"+appID); err != nil {
		return nil, err
	}
	app, err := s.apps.Get(ctx, appID)
	if errors.Is(err, docstore.ErrNotFound) {
		return nil, kernel.NotFound("Application not found")
	}
	if err != nil {
		return nil, err
	}
	app.Theme = &t
	app.UpdatedAt = time.Now().UTC()
	if err := s.apps.Put(ctx, app); err != nil {
		return nil, err
	}
	if err := s.auditor.Record(ctx, ec, "application.theme", "application/"+appID, kernel.OutcomeAllowed, t.PrimaryColor); err != nil {
		return nil, err
	}
	return app, nil
}
