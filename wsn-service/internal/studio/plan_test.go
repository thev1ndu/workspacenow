package studio

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
)

func validPlan() Plan {
	return Plan{
		Name: "Leave Tracker", OwnerDepartmentID: "dep-hr",
		Entities: []PlannedEntity{{
			Name: "LeaveRequest", Label: "Leave request",
			Fields: []data.Field{
				{Name: "employee", Label: "Employee", Type: data.FieldString, Required: true},
				{Name: "status", Label: "Status", Type: data.FieldEnum, EnumValues: []string{"pending", "approved"}},
			},
		}},
		Pages: []Page{{Title: "Leave requests", Kind: "list", Entity: "LeaveRequest"}},
	}
}

func TestValidatePlanAcceptsAValidPlan(t *testing.T) {
	assert.Empty(t, validatePlan(validPlan(), []string{"Product"}))
}

func TestValidatePlanReportsProblemsInReadingOrder(t *testing.T) {
	p := validPlan()
	p.Name = ""
	p.Entities[0].Name = "Product"
	p.Entities[0].Fields = append(p.Entities[0].Fields, data.Field{Name: "Owner", Label: "Owner", Type: data.FieldReference, Reference: "Ghost"})
	p.Pages = append(p.Pages, Page{Title: "Scan", Kind: "scan", Entity: "Product"})
	assert.Equal(t, []string{
		"The application needs a name",
		"Leave request: Product already exists; rename it or reference the existing one",
		"Leave request → Owner: name must start with a lowercase letter and use letters and digits only",
		"Leave request → Owner: pick the entity this field refers to",
		"Leave requests: choose one of this plan's entities",
		"Scan: choose what the QR code holds",
	}, validatePlan(p, []string{"Product"}))
}

func TestValidatePlanChangesKeepsRecordsValid(t *testing.T) {
	saved := []data.Entity{{
		Name: "LeaveRequest", Label: "Leave request",
		Fields: []data.Field{
			{Name: "employee", Label: "Employee", Type: data.FieldString},
			{Name: "status", Label: "Status", Type: data.FieldEnum, EnumValues: []string{"pending", "approved"}},
			{Name: "days", Label: "Days", Type: data.FieldInteger},
		},
	}}
	p := validPlan()
	p.Entities[0].Fields = []data.Field{
		{Name: "employee", Label: "Employee", Type: data.FieldString, Required: true},
		{Name: "status", Label: "Status", Type: data.FieldEnum, EnumValues: []string{"pending"}},
		{Name: "reason", Label: "Reason", Type: data.FieldText, Required: true},
	}
	assert.Equal(t, []string{
		"Leave request → Employee: an existing field cannot become required",
		"Leave request → Status: existing choices cannot be removed (approved)",
		"Leave request → Days: an existing field cannot be removed or renamed",
		"Leave request → Reason: a new field on an existing entity must be optional, since current records have no value for it",
	}, validatePlanChanges(saved, p))
}

func TestBumpAndSlug(t *testing.T) {
	assert.Equal(t, "1.3.0", bump("1.2.0"))
	assert.Equal(t, "leave-tracker", slugify("  Leave Tracker! "))
	assert.Equal(t, []string{"LeaveRequest.list", "LeaveRequest.get", "LeaveRequest.create", "LeaveRequest.update"}, planOperations(validPlan().Entities))
}

func TestPlanFromAppRebuildsTheEditableBlueprint(t *testing.T) {
	app := &Application{
		ID: "app-1", Name: "Inventory Management", Slug: "inventory-management",
		Description: "Stock and products", OwnerDepartmentID: "dep-store",
		EntityNames: []string{"Product"},
		Pages:       []Page{{ID: "page-1", Title: "Products", Kind: "list", Entity: "Product"}},
	}
	saved := []data.Entity{{
		Name: "Product", Label: "Product", Description: "A product",
		Fields: []data.Field{{Name: "sku", Label: "SKU", Type: data.FieldString, Required: true}},
	}}
	p := planFromApp(app, saved)
	assert.Equal(t, "Inventory Management", p.Name)
	assert.Equal(t, "dep-store", p.OwnerDepartmentID)
	assert.Equal(t, []Page{{ID: "page-1", Title: "Products", Kind: "list", Entity: "Product"}}, p.Pages)
	assert.Equal(t, []PlannedEntity{{
		Name: "Product", Label: "Product", Description: "A product",
		Fields: []data.Field{{Name: "sku", Label: "SKU", Type: data.FieldString, Required: true}},
	}}, p.Entities)
}
