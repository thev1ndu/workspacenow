package data

import "testing"

func TestInferEntityFromJSON(t *testing.T) {
	in := InferInput{
		Name:   "product",
		Format: "json",
		Data: `[
			{"name":"Widget","sku":"SKU-1","price":9.99,"stock":5,"active":true,"category":"tools"},
			{"name":"Gadget","sku":"SKU-2","price":19.5,"stock":0,"active":false,"category":"tools"},
			{"name":"Kit","sku":"SKU-3","price":3,"stock":12,"active":true,"category":"kits"}
		]`,
	}
	out, err := InferEntity(in)
	if err != nil {
		t.Fatal(err)
	}
	if out.Name != "Product" || out.Rows != 3 {
		t.Fatalf("name/rows: %+v", out)
	}
	byName := map[string]InferredField{}
	for _, f := range out.Fields {
		byName[f.Name] = f
	}
	if f := byName["name"]; f.Type != FieldString || !f.Required || f.Unique {
		t.Fatalf("name field: %+v", f)
	}
	if f := byName["sku"]; !f.Unique || !f.Required {
		t.Fatalf("sku must be required+unique: %+v", f)
	}
	if f := byName["price"]; f.Type != FieldNumber {
		t.Fatalf("price type: %+v", f)
	}
	if f := byName["stock"]; f.Type != FieldInteger {
		t.Fatalf("stock type: %+v", f)
	}
	if f := byName["active"]; f.Type != FieldBoolean {
		t.Fatalf("active type: %+v", f)
	}
	if f := byName["category"]; f.Type != FieldEnum || len(f.EnumValues) != 2 {
		t.Fatalf("category enum: %+v", f)
	}
	if len(out.ImportMapping) != len(out.Fields) {
		t.Fatalf("mapping: %+v", out.ImportMapping)
	}
}

func TestInferEntityFromCSV(t *testing.T) {
	in := InferInput{
		Format: "csv",
		Data:   "email,joined,logins\na@x.com,2026-01-01,3\nb@x.com,2026-02-02,0\n",
	}
	out, err := InferEntity(in)
	if err != nil {
		t.Fatal(err)
	}
	byName := map[string]InferredField{}
	for _, f := range out.Fields {
		byName[f.Name] = f
	}
	if f := byName["email"]; f.Type != FieldString || !f.Unique {
		t.Fatalf("email: %+v", f)
	}
	if f := byName["joined"]; f.Type != FieldDate || !f.Required {
		t.Fatalf("joined: %+v", f)
	}
	if f := byName["logins"]; f.Type != FieldInteger {
		t.Fatalf("logins: %+v", f)
	}
}

func TestInferEntityErrors(t *testing.T) {
	for _, in := range []InferInput{
		{Format: "xml", Data: "<x/>"},
		{Format: "json", Data: `{"not":"an array"}`},
		{Format: "csv", Data: "a,b\n"},
		{Format: "json", Data: `[]`},
	} {
		if _, err := InferEntity(in); err == nil {
			t.Fatalf("expected error for %+v", in)
		}
	}
}
