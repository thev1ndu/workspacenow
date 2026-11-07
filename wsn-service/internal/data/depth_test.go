package data

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

func TestDiffValues(t *testing.T) {
	before := map[string]any{"a": 1.0, "b": "x", "c": true}
	after := map[string]any{"a": 2.0, "b": "x", "d": "new"}
	assert.Equal(t, map[string]any{"a": 2.0, "c": nil, "d": "new"}, diffValues(before, after))
	assert.Empty(t, diffValues(before, map[string]any{"a": 1.0, "b": "x", "c": true}))
}

func TestRowFilterCondResolvesActor(t *testing.T) {
	e := &Entity{Name: "Sale", RowFilter: &RowFilter{Field: "storeId", Op: "eq", Value: "$actor.id"}}
	cond, args := rowFilterCond(e, kernel.Actor{ID: "u-nimal"})
	assert.Equal(t, "values -> ? = ?::jsonb", cond)
	assert.Equal(t, []any{"storeId", `"u-nimal"`}, args)
}

func TestRowFilterCondInAndNoFilter(t *testing.T) {
	cond, args := rowFilterCond(&Entity{Name: "E"}, kernel.Actor{})
	assert.Empty(t, cond)
	assert.Empty(t, args)
	e := &Entity{Name: "E", RowFilter: &RowFilter{Field: "status", Op: "in", Value: []any{"open", "done"}}}
	cond, args = rowFilterCond(e, kernel.Actor{})
	assert.Equal(t, "values -> ? IN (?::jsonb,?::jsonb)", cond)
	assert.Equal(t, []any{"status", `"open"`, `"done"`}, args)
}

func TestViewCond(t *testing.T) {
	cond, args, err := viewCond([]FilterOp{
		{Field: "status", Op: "eq", Value: "open"},
		{Field: "total", Op: "gte", Value: 100},
		{Field: "note", Op: "contains", Value: "rush"},
	})
	require.NoError(t, err)
	assert.Contains(t, cond, "values -> ? = ?::jsonb")
	assert.Contains(t, cond, "::numeric >=")
	assert.Contains(t, cond, "ILIKE")
	assert.Len(t, args, 6)

	_, _, err = viewCond([]FilterOp{{Field: "x", Op: "between", Value: 1}})
	assert.ErrorContains(t, err, "unknown op")
	_, _, err = viewCond([]FilterOp{{Field: "x", Op: "in", Value: "not-a-list"}})
	assert.ErrorContains(t, err, "'in' needs")
}

func TestPlanMigration(t *testing.T) {
	e := &Entity{Name: "Product", Fields: []Field{{Name: "sku", Label: "SKU", Type: FieldString}}}

	// add + backfill always fine
	fields, backfill, problems := planMigration(e, 5, SchemaMigration{
		Add:      []Field{{Name: "price", Label: "Price", Type: FieldNumber}},
		Backfill: map[string]any{"price": 0.0},
	})
	assert.Empty(t, problems)
	assert.Len(t, fields, 2)
	assert.Equal(t, map[string]any{"price": 0.0}, backfill)

	// drop refused with records
	_, _, problems = planMigration(e, 3, SchemaMigration{Drop: []string{"sku"}})
	assert.Len(t, problems, 1)
	assert.Contains(t, problems[0], "cannot drop")

	// drop fine when empty
	fields, _, problems = planMigration(e, 0, SchemaMigration{Drop: []string{"sku"}})
	assert.Empty(t, problems)
	assert.Empty(t, fields)

	// retype refused with records, allowed when empty
	_, _, problems = planMigration(e, 1, SchemaMigration{Retype: []Field{{Name: "sku", Type: FieldText}}})
	assert.Len(t, problems, 1)
	fields, _, problems = planMigration(e, 0, SchemaMigration{Retype: []Field{{Name: "sku", Type: FieldText}}})
	assert.Empty(t, problems)
	assert.Equal(t, FieldText, fields[0].Type)

	// duplicate add / unknown backfill
	_, _, problems = planMigration(e, 0, SchemaMigration{Add: []Field{{Name: "sku", Type: FieldString}}, Backfill: map[string]any{"ghost": 1}})
	assert.Len(t, problems, 2)
}

func TestRecordsCSVRoundTrip(t *testing.T) {
	e := &Entity{Name: "Product", Fields: []Field{
		{Name: "sku", Type: FieldString},
		{Name: "price", Type: FieldNumber},
		{Name: "inStock", Type: FieldBoolean},
	}}
	records := []Record{{
		ID: "prod-1", Entity: "Product",
		Values: map[string]any{"sku": "oil, 1L", "price": 450.5, "inStock": true},
	}}
	csvText, err := recordsToCSV(e, records)
	require.NoError(t, err)
	assert.Contains(t, csvText, "id,sku,price,inStock")
	assert.Contains(t, csvText, `"oil, 1L"`) // comma-containing cell quoted

	rows, err := csvToValues(e, csvText)
	require.NoError(t, err)
	require.Len(t, rows, 1)
	assert.Equal(t, "oil, 1L", rows[0]["sku"])
	assert.Equal(t, 450.5, rows[0]["price"])
	assert.Equal(t, true, rows[0]["inStock"])
}
