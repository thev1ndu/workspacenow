package studio

import (
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
)

// These rules mirror the console editor (libs/types/src/plan.ts) so the platform enforces what the user saw.

var (
	entityNamePattern = regexp.MustCompile(`^[A-Z][A-Za-z0-9]*$`)
	fieldNamePattern  = regexp.MustCompile(`^[a-z][A-Za-z0-9]*$`)
	slugPattern       = regexp.MustCompile(`[^a-z0-9]+`)
)

func slugify(name string) string {
	return strings.Trim(slugPattern.ReplaceAllString(strings.ToLower(name), "-"), "-")
}

// planOperations lists the CRUD operations a plan's entities get.
func planOperations(entities []PlannedEntity) []string {
	var out []string
	for _, e := range entities {
		for _, verb := range []string{"list", "get", "create", "update"} {
			out = append(out, e.Name+"."+verb)
		}
	}
	return out
}

func or(s, fallback string) string {
	if strings.TrimSpace(s) != "" {
		return s
	}
	return fallback
}

func fieldProblems(e PlannedEntity, f data.Field, references map[string]bool) []string {
	where := fmt.Sprintf("%s → %s", or(e.Label, e.Name), or(f.Label, or(f.Name, "unnamed field")))
	var p []string
	if strings.TrimSpace(f.Label) == "" {
		p = append(p, where+": label is required")
	}
	if !fieldNamePattern.MatchString(f.Name) {
		p = append(p, where+": name must start with a lowercase letter and use letters and digits only")
	}
	if f.Type == data.FieldEnum && len(f.EnumValues) == 0 {
		p = append(p, where+": a choice field needs at least one option")
	}
	if f.Type == data.FieldReference && (f.Reference == "" || !references[f.Reference]) {
		p = append(p, where+": pick the entity this field refers to")
	}
	return p
}

func scanProblems(where string, scan *ScanConfig, e PlannedEntity) []string {
	if scan == nil || scan.MatchField == "" {
		return []string{where + ": choose what the QR code holds"}
	}
	var p []string
	if scan.MatchField != "id" && !slices.ContainsFunc(e.Fields, func(f data.Field) bool { return f.Name == scan.MatchField }) {
		p = append(p, fmt.Sprintf("%s: the QR field is not on %s", where, e.Label))
	}
	if scan.OnScan != nil {
		i := slices.IndexFunc(e.Fields, func(f data.Field) bool { return f.Name == scan.OnScan.Field })
		if i < 0 || e.Fields[i].Type != data.FieldEnum || !slices.Contains(e.Fields[i].EnumValues, scan.OnScan.Value) {
			p = append(p, fmt.Sprintf("%s: the value to set on scan is not a choice of %s", where, e.Label))
		}
	}
	return p
}

// validatePlan returns every problem with a plan, in reading order; empty means it can be applied.
func validatePlan(plan Plan, existing []string) []string {
	var p []string
	if strings.TrimSpace(plan.Name) == "" {
		p = append(p, "The application needs a name")
	}
	if plan.OwnerDepartmentID == "" {
		p = append(p, "Choose the owning department")
	}
	if len(plan.Entities) == 0 {
		p = append(p, "Add at least one entity")
	}
	planned := map[string]bool{}
	references := map[string]bool{}
	for _, name := range existing {
		references[name] = true
	}
	for _, e := range plan.Entities {
		planned[e.Name] = true
		references[e.Name] = true
	}
	seen := map[string]bool{}
	for _, e := range plan.Entities {
		where := or(e.Label, or(e.Name, "Unnamed entity"))
		if strings.TrimSpace(e.Label) == "" {
			p = append(p, where+": label is required")
		}
		switch {
		case !entityNamePattern.MatchString(e.Name):
			p = append(p, where+": name must start with a capital letter and use letters and digits only")
		case seen[e.Name]:
			p = append(p, fmt.Sprintf("%s: another entity in this plan is also named %s", where, e.Name))
		case slices.Contains(existing, e.Name):
			p = append(p, fmt.Sprintf("%s: %s already exists; rename it or reference the existing one", where, e.Name))
		}
		seen[e.Name] = true
		if len(e.Fields) == 0 {
			p = append(p, where+": add at least one field")
		}
		names := map[string]bool{}
		for _, f := range e.Fields {
			p = append(p, fieldProblems(e, f, references)...)
			if names[f.Name] {
				p = append(p, fmt.Sprintf("%s: two fields are named %s", where, f.Name))
			}
			names[f.Name] = true
		}
	}
	for i, page := range plan.Pages {
		where := or(page.Title, fmt.Sprintf("Page %d", i+1))
		if strings.TrimSpace(page.Title) == "" {
			p = append(p, where+": title is required")
		}
		if page.Entity == "" || !planned[page.Entity] {
			p = append(p, where+": choose one of this plan's entities")
		} else if page.Kind == "scan" {
			j := slices.IndexFunc(plan.Entities, func(e PlannedEntity) bool { return e.Name == page.Entity })
			p = append(p, scanProblems(where, page.Scan, plan.Entities[j])...)
		}
	}
	if plan.SLO != nil && plan.SLO.Enabled {
		switch {
		case plan.SLO.TargetSuccess <= 0 || plan.SLO.TargetSuccess > 1:
			p = append(p, "SLO: the success target must be between 0 and 1 (e.g. 0.999)")
		case plan.SLO.TargetP95Ms <= 0:
			p = append(p, "SLO: the p95 target must be a positive number of milliseconds")
		case plan.SLO.WindowMinutes <= 0:
			p = append(p, "SLO: the window must be a positive number of minutes")
		}
	}
	return p
}

// validatePlanChanges refuses edits that would invalidate records the saved entities already hold.
func validatePlanChanges(saved []data.Entity, plan Plan) []string {
	var p []string
	for _, before := range saved {
		i := slices.IndexFunc(plan.Entities, func(e PlannedEntity) bool { return e.Name == before.Name })
		if i < 0 {
			p = append(p, before.Label+": an existing entity cannot be removed or renamed")
			continue
		}
		after := plan.Entities[i]
		for _, field := range before.Fields {
			where := fmt.Sprintf("%s → %s", after.Label, field.Label)
			j := slices.IndexFunc(after.Fields, func(f data.Field) bool { return f.Name == field.Name })
			if j < 0 {
				p = append(p, where+": an existing field cannot be removed or renamed")
				continue
			}
			now := after.Fields[j]
			if now.Type != field.Type {
				p = append(p, where+": an existing field's type cannot change")
			}
			if now.Reference != field.Reference {
				p = append(p, where+": an existing reference cannot point to another entity")
			}
			var dropped []string
			for _, v := range field.EnumValues {
				if !slices.Contains(now.EnumValues, v) {
					dropped = append(dropped, v)
				}
			}
			if len(dropped) > 0 {
				p = append(p, fmt.Sprintf("%s: existing choices cannot be removed (%s)", where, strings.Join(dropped, ", ")))
			}
			if now.Required && !field.Required {
				p = append(p, where+": an existing field cannot become required")
			}
			if now.Unique && !field.Unique {
				p = append(p, where+": an existing field cannot become unique")
			}
		}
		for _, f := range after.Fields {
			if f.Required && !slices.ContainsFunc(before.Fields, func(b data.Field) bool { return b.Name == f.Name }) {
				p = append(p, fmt.Sprintf("%s → %s: a new field on an existing entity must be optional, since current records have no value for it", after.Label, f.Label))
			}
		}
	}
	return p
}

// ownedEntities are the entities an application may change: its own, never shared or external ones.
func ownedEntities(app *Application, entities []data.Entity) []data.Entity {
	var out []data.Entity
	for _, e := range entities {
		if slices.Contains(app.EntityNames, e.Name) && e.OwnerApplicationID == app.ID && e.Scope != data.ScopeExternal {
			out = append(out, e)
		}
	}
	return out
}

// bump raises the minor version: 1.2.0 becomes 1.3.0.
func bump(version string) string {
	var major, minor int
	_, _ = fmt.Sscanf(version, "%d.%d", &major, &minor)
	return fmt.Sprintf("%d.%d.0", major, minor+1)
}
