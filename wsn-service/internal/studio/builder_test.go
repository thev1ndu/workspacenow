package studio

import (
	"testing"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
)

func bpWith(version string, entities []data.Entity, pages []Page, ops []any) *Blueprint {
	return &Blueprint{
		Release:     Release{Version: version},
		Application: Application{Name: "App", Pages: pages, Version: version},
		Entities:    entities,
		Operations:  ops,
	}
}

func TestDiffBlueprints(t *testing.T) {
	a := bpWith("1.0.0",
		[]data.Entity{{Name: "Product", Fields: []data.Field{{Name: "name", Type: data.FieldString}, {Name: "old", Type: data.FieldString}}}},
		[]Page{{ID: "p1", Title: "Products", Kind: "list", Entity: "Product"}},
		[]any{map[string]any{"name": "record sale"}},
	)
	b := bpWith("1.1.0",
		[]data.Entity{
			{Name: "Product", Fields: []data.Field{{Name: "name", Type: data.FieldText}, {Name: "price", Type: data.FieldNumber}}},
			{Name: "Order", Fields: []data.Field{{Name: "total", Type: data.FieldNumber}}},
		},
		[]Page{{ID: "p1", Title: "Products", Kind: "list", Entity: "Product"}, {ID: "p2", Title: "Orders", Kind: "list", Entity: "Order"}},
		[]any{map[string]any{"name": "record sale"}, map[string]any{"name": "refund"}},
	)
	d := diffBlueprints(a, b)
	if d.From != "1.0.0" || d.To != "1.1.0" {
		t.Fatalf("versions: %+v", d)
	}
	kinds := map[string]map[string]bool{}
	for _, c := range d.Changes {
		if kinds[c.Kind] == nil {
			kinds[c.Kind] = map[string]bool{}
		}
		kinds[c.Kind][c.Change] = true
	}
	if !kinds["entity"]["added"] || !kinds["field"]["added"] || !kinds["field"]["removed"] || !kinds["field"]["changed"] ||
		!kinds["page"]["added"] || !kinds["operation"]["added"] {
		t.Fatalf("changes: %+v", d.Changes)
	}
	if d := diffBlueprints(a, a); len(d.Changes) != 0 || d.Summary[0] != "No changes" {
		t.Fatalf("no-op diff: %+v", d)
	}
}

func TestTemplateSignatureRoundTripAndTamper(t *testing.T) {
	templates := seedTemplates()
	if len(templates) != 4 {
		t.Fatalf("seeded templates: %d", len(templates))
	}
	for _, tpl := range templates {
		if err := verifyTemplate(tpl); err != nil {
			t.Fatalf("seeded template %s must verify: %v", tpl.ID, err)
		}
	}
	tampered := templates[0]
	tampered.Blueprint.Name = "Evil"
	if err := verifyTemplate(tampered); err == nil {
		t.Fatal("tampered blueprint must fail verification")
	}
}

func TestSampleValues(t *testing.T) {
	e := data.Entity{Name: "Product", Fields: []data.Field{
		{Name: "name", Type: data.FieldString},
		{Name: "sku", Type: data.FieldString},
		{Name: "email", Type: data.FieldString},
		{Name: "stock", Type: data.FieldInteger},
		{Name: "price", Type: data.FieldNumber},
		{Name: "active", Type: data.FieldBoolean},
		{Name: "status", Type: data.FieldEnum, EnumValues: []string{"draft", "active"}},
	}}
	v := sampleValues(e, 1)
	if v["sku"] != "SKU-002" || v["email"] != "user2@example.com" {
		t.Fatalf("sku/email: %v", v)
	}
	if v["stock"].(int) != 8 || v["price"].(float64) != 1.7 || v["active"].(bool) != false || v["status"] != "active" {
		t.Fatalf("typed values: %v", v)
	}
}
