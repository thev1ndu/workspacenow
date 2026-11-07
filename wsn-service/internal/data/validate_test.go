package data

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

type fakeChecks struct {
	records map[string]bool // "Entity/id"
	taken   map[string]any  // "Entity.field" -> value already used
}

func (f fakeChecks) recordExists(_ context.Context, entity, id string) (bool, error) {
	return f.records[entity+"/"+id], nil
}

func (f fakeChecks) valueTaken(_ context.Context, entity, field string, value any, _ string) (bool, error) {
	v, ok := f.taken[entity+"."+field]
	return ok && v == value, nil
}

var product = &Entity{
	Name: "Product",
	Fields: []Field{
		{Name: "sku", Label: "SKU", Type: FieldString, Required: true, Unique: true},
		{Name: "name", Label: "Name", Type: FieldString, Required: true},
		{Name: "unitPrice", Label: "Unit price", Type: FieldNumber},
		{Name: "stock", Label: "Stock", Type: FieldInteger},
		{Name: "active", Label: "Active", Type: FieldBoolean},
		{Name: "category", Label: "Category", Type: FieldEnum, EnumValues: []string{"Grocery", "Dairy"}, DefaultValue: "Grocery"},
		{Name: "supplier", Label: "Supplier", Type: FieldReference, Reference: "Supplier"},
	},
}

func TestValidateNormalizesValues(t *testing.T) {
	c := fakeChecks{records: map[string]bool{"Supplier/sup-1": true}}
	got, err := validate(context.Background(), c, product, withDefaults(product, map[string]any{
		"sku": "GR-1", "name": "Rice", "unitPrice": "12.5", "stock": 4.0, "active": "true", "supplier": "sup-1", "unknown": "dropped",
	}), "")
	require.NoError(t, err)
	assert.Equal(t, map[string]any{
		"sku": "GR-1", "name": "Rice", "unitPrice": 12.5, "stock": 4.0, "active": true, "category": "Grocery", "supplier": "sup-1",
	}, got)
}

func TestValidateReportsEveryProblem(t *testing.T) {
	c := fakeChecks{taken: map[string]any{"Product.sku": "GR-1"}}
	_, err := validate(context.Background(), c, product, map[string]any{
		"sku": "GR-1", "unitPrice": "cheap", "stock": 1.5, "category": "Toys", "supplier": "sup-missing",
	}, "")
	apiErr, ok := kernel.AsError(err)
	require.True(t, ok)
	assert.Equal(t, kernel.CodeValidationFailed, apiErr.Code)
	assert.Equal(t, "SKU must be unique; Name is required; Unit price must be a number; Stock must be a whole number; "+
		"Category must be one of Grocery, Dairy; Supplier references a missing Supplier", apiErr.Message)
}

func TestValidateFileField(t *testing.T) {
	e := &Entity{Name: "Evidence", Fields: []Field{
		{Name: "title", Label: "Title", Type: FieldString, Required: true},
		{Name: "attachment", Label: "Attachment", Type: FieldFile},
	}}
	c := fakeChecks{}
	// a proper FileRef passes and is kept verbatim
	ref := `{"key":"uploads/Evidence/r-1/attachment/f-1-report.pdf","name":"report.pdf","sizeBytes":1024,"contentType":"application/pdf"}`
	got, err := validate(context.Background(), c, e, map[string]any{"title": "Claim", "attachment": ref}, "")
	require.NoError(t, err)
	assert.Equal(t, ref, got["attachment"])
	// anything that is not a FileRef is rejected
	_, err = validate(context.Background(), c, e, map[string]any{"title": "Claim", "attachment": "not-json"}, "")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "must be a file reference")
	// optional and empty -> null
	got, err = validate(context.Background(), c, e, map[string]any{"title": "Claim"}, "")
	require.NoError(t, err)
	assert.Nil(t, got["attachment"])
}

func TestValidateEmptyOptionalIsNull(t *testing.T) {
	got, err := validate(context.Background(), fakeChecks{}, product, map[string]any{"sku": "A", "name": "B", "unitPrice": ""}, "")
	require.NoError(t, err)
	assert.Nil(t, got["unitPrice"])
	assert.Contains(t, got, "supplier")
}

func TestRecordIDPrefix(t *testing.T) {
	assert.Equal(t, "po", recordIDPrefix("PurchaseOrder"))
	assert.Equal(t, "stoc", recordIDPrefix("Stock"))
	assert.Equal(t, "sale", recordIDPrefix("Sale"))
}
