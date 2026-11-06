package connect

import (
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
)

func obj(properties map[string]any, required ...string) Schema {
	s := Schema{"type": "object", "properties": properties}
	if len(required) > 0 {
		s["required"] = required
	}
	return s
}

func prop(typ, description string) map[string]any {
	p := map[string]any{"type": typ}
	if description != "" {
		p["description"] = description
	}
	return p
}

// domainInputs are the hand-written input schemas of the domain operations.
var domainInputs = map[string]Schema{
	"inventory.getLowStockItems": obj(map[string]any{}),
	"inventory.recordSale":       obj(map[string]any{"stockId": prop("string", "Stock record id"), "quantity": prop("integer", "Units sold")}, "stockId", "quantity"),
	"inventory.checkout": obj(map[string]any{
		"store":         prop("string", "Colombo City, Kandy or Galle"),
		"lines":         map[string]any{"type": "array", "items": obj(map[string]any{"productId": prop("string", ""), "quantity": prop("integer", "")}, "productId", "quantity")},
		"paymentMethod": map[string]any{"type": "string", "enum": []string{"cash", "card"}},
		"tendered":      prop("number", "Cash handed over; omit for card"),
	}, "store", "lines", "paymentMethod"),
	"supplier.listSuppliers":           obj(map[string]any{"category": prop("string", "Optional product category")}),
	"procurement.listPurchaseRequests": obj(map[string]any{"status": map[string]any{"type": "string", "enum": []string{"pending-approval", "approved", "rejected", "ordered"}}}),
	"procurement.createPurchaseRequest": obj(map[string]any{
		"productId": prop("string", ""), "supplierId": prop("string", ""), "store": prop("string", ""), "quantity": prop("integer", ""), "justification": prop("string", ""),
	}, "productId", "supplierId", "store", "quantity"),
	"procurement.approvePurchaseRequest": obj(map[string]any{"purchaseRequestId": prop("string", "")}, "purchaseRequestId"),
	"procurement.rejectPurchaseRequest":  obj(map[string]any{"purchaseRequestId": prop("string", "")}, "purchaseRequestId"),
	"procurement.createPurchaseOrder":    obj(map[string]any{"purchaseRequestId": prop("string", "")}, "purchaseRequestId"),
}

// inputSchema describes an operation's input; entity operations get one property per field.
func inputSchema(businessOperation string, entities map[string]data.Entity) Schema {
	if s, ok := domainInputs[businessOperation]; ok {
		return s
	}
	entityName, verb, _ := strings.Cut(businessOperation, ".")
	e, ok := entities[entityName]
	if !ok {
		return Schema{"type": "object"}
	}
	id := prop("string", e.Label+" record id")
	switch verb {
	case "get", "delete":
		return obj(map[string]any{"id": id}, "id")
	case "create", "update":
		properties := map[string]any{}
		var required []string
		for _, f := range e.Fields {
			properties[f.Name] = fieldSchema(f)
			if f.Required && verb == "create" {
				required = append(required, f.Name)
			}
		}
		values := obj(properties, required...)
		if verb == "update" {
			return obj(map[string]any{"id": id, "values": values}, "id", "values")
		}
		return obj(map[string]any{"values": values}, "values")
	}
	return obj(map[string]any{})
}

func fieldSchema(f data.Field) map[string]any {
	switch f.Type {
	case data.FieldNumber:
		return prop("number", f.Label)
	case data.FieldInteger:
		return prop("integer", f.Label)
	case data.FieldBoolean:
		return prop("boolean", f.Label)
	case data.FieldEnum:
		return map[string]any{"type": "string", "enum": f.EnumValues, "description": f.Label}
	case data.FieldReference:
		return prop("string", f.Label+" ("+f.Reference+" id)")
	case data.FieldDate:
		return map[string]any{"type": "string", "format": "date", "description": f.Label}
	}
	return prop("string", f.Label)
}
