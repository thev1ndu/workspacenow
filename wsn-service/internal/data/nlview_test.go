package data

import "testing"

func productEntity() Entity {
	return Entity{
		Name: "Product",
		Fields: []Field{
			{Name: "name", Label: "Name", Type: FieldString},
			{Name: "stock", Label: "Stock", Type: FieldInteger},
			{Name: "reorderLevel", Label: "Reorder level", Type: FieldInteger},
			{Name: "supplier", Label: "Supplier", Type: FieldString},
		},
	}
}

func TestViewFromTextBelowOrderedLimit(t *testing.T) {
	v, expl, err := ViewFromText(productEntity(), "stock below 10 ordered by supplier desc, limit 5")
	if err != nil {
		t.Fatal(err)
	}
	if len(v.Filters) != 1 || v.Filters[0].Field != "stock" || v.Filters[0].Op != "lt" || v.Filters[0].Value != 10 {
		t.Fatalf("filters: %+v", v.Filters)
	}
	if v.SortField != "supplier" || !v.SortDesc || v.Limit != 5 {
		t.Fatalf("sort/limit: %+v", v)
	}
	if expl == "" {
		t.Fatal("explanation empty")
	}
}

func TestViewFromTextOpBeforeFieldAndContains(t *testing.T) {
	v, _, err := ViewFromText(productEntity(), "under stock 10")
	if err != nil {
		t.Fatal(err)
	}
	if len(v.Filters) != 1 || v.Filters[0].Op != "lt" || v.Filters[0].Field != "stock" || v.Filters[0].Value != 10 {
		t.Fatalf("filters: %+v", v.Filters)
	}
	v, _, err = ViewFromText(productEntity(), `name contains "wid"`)
	if err != nil {
		t.Fatal(err)
	}
	if v.Filters[0].Op != "contains" || v.Filters[0].Value != "wid" {
		t.Fatalf("contains: %+v", v.Filters)
	}
}

func TestViewFromTextNoFieldFails(t *testing.T) {
	if _, _, err := ViewFromText(productEntity(), "show me everything"); err == nil {
		t.Fatal("expected a parse error hint")
	}
}
