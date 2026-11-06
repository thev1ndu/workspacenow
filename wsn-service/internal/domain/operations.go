// Package domain holds the hand-written business operations of the seeded applications.
package domain

import (
	"context"
	"fmt"
	"math"
	"slices"
	"strings"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/data"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

const LowStockEvent = "Stock.LowStockReached"

var openRequestStates = []string{"pending-approval", "approved"}

var storeCodes = map[string]string{"Colombo City": "CMB", "Kandy": "KDY", "Galle": "GLE"}

type ops struct {
	rt     data.Runtime
	events kernel.Publisher
}

// Operations returns the domain operations, ready to register on the kernel engine.
func Operations(rt data.Runtime, events kernel.Publisher) []kernel.Operation {
	o := &ops{rt: rt, events: events}
	return []kernel.Operation{
		{Name: "inventory.getLowStockItems", Summary: "List stock at or below its reorder level", Permission: "inventory.read", Kind: kernel.KindRead, Entity: "Stock", Handler: o.lowStock},
		{Name: "inventory.recordSale", Summary: "Reduce stock after a sale and raise a low-stock event when the reorder level is crossed", Permission: "inventory.write", Kind: kernel.KindWrite, Entity: "Stock", Handler: o.recordSale},
		{Name: "inventory.checkout", Summary: "Sell a cart at one store's till: reduce stock for every line, record the sale and return its receipt", Permission: "inventory.write", Kind: kernel.KindWrite, Entity: "Sale", Handler: o.checkout},
		{Name: "supplier.listSuppliers", Summary: "List active suppliers, optionally by category", Permission: "supplier.read", Kind: kernel.KindRead, Entity: "Supplier", Handler: o.listSuppliers},
		{Name: "procurement.listPurchaseRequests", Summary: "List purchase requests, optionally by status", Permission: "procurement.read", Kind: kernel.KindRead, Entity: "PurchaseRequest", Handler: o.listRequests},
		{Name: "procurement.createPurchaseRequest", Summary: "Submit a purchase request for approval", Permission: "procurement.request", Kind: kernel.KindWrite, Entity: "PurchaseRequest", Handler: o.createRequest},
		{Name: "procurement.approvePurchaseRequest", Summary: "Approve a pending purchase request", Permission: "procurement.approve", Kind: kernel.KindWrite, Entity: "PurchaseRequest", Handler: o.decide("approved", "PurchaseRequest.Approved")},
		{Name: "procurement.rejectPurchaseRequest", Summary: "Reject a pending purchase request", Permission: "procurement.approve", Kind: kernel.KindWrite, Entity: "PurchaseRequest", Handler: o.decide("rejected", "PurchaseRequest.Rejected")},
		{Name: "procurement.createPurchaseOrder", Summary: "Issue a purchase order for an approved purchase request", Permission: "procurement.order", Kind: kernel.KindWrite, Entity: "PurchaseOrder", Handler: o.createOrder},
	}
}

// LowStockItem is one stock row at or below its reorder level.
type LowStockItem struct {
	StockID             string  `json:"stockId"`
	ProductID           string  `json:"productId"`
	ProductName         string  `json:"productName"`
	SKU                 string  `json:"sku"`
	Store               string  `json:"store"`
	Quantity            float64 `json:"quantity"`
	ReorderLevel        float64 `json:"reorderLevel"`
	PreferredSupplierID *string `json:"preferredSupplierId"`
	OpenRequestID       *string `json:"openRequestId"`
}

func (o *ops) lowStock(ctx context.Context, _ kernel.ExecutionContext, _ map[string]any) (any, error) {
	stock, err := o.rt.Records(ctx, "Stock")
	if err != nil {
		return nil, err
	}
	products, err := o.byID(ctx, "Product")
	if err != nil {
		return nil, err
	}
	out := []LowStockItem{}
	for _, s := range stock {
		if s.Number("quantity") > s.Number("reorderLevel") {
			continue
		}
		productID, store := s.String("product"), s.String("store")
		item := LowStockItem{StockID: s.ID, ProductID: productID, ProductName: productID, Store: store, Quantity: s.Number("quantity"), ReorderLevel: s.Number("reorderLevel")}
		if p, ok := products[productID]; ok {
			item.ProductName, item.SKU = p.String("name"), p.String("sku")
			if sup := p.String("preferredSupplier"); sup != "" {
				item.PreferredSupplierID = &sup
			}
		}
		open, err := o.openRequest(ctx, productID, store)
		if err != nil {
			return nil, err
		}
		if open != nil {
			item.OpenRequestID = &open.ID
		}
		out = append(out, item)
	}
	return out, nil
}

func (o *ops) recordSale(ctx context.Context, ec kernel.ExecutionContext, in map[string]any) (any, error) {
	stockID, err := str(in, "stockId")
	if err != nil {
		return nil, err
	}
	sold, err := positiveInt(in, "quantity")
	if err != nil {
		return nil, err
	}
	stock, err := o.rt.Record(ctx, "Stock", stockID)
	if err != nil {
		return nil, err
	}
	if sold > stock.Number("quantity") {
		return nil, kernel.Conflict("Only %s units in stock", num(stock.Number("quantity")))
	}
	return o.sell(ctx, ec, stock, sold)
}

// sell takes units off a stock record and raises a low-stock event only when the sale crosses the reorder level.
func (o *ops) sell(ctx context.Context, ec kernel.ExecutionContext, stock *data.Record, sold float64) (*data.Record, error) {
	before, reorder := stock.Number("quantity"), stock.Number("reorderLevel")
	after := before - sold
	updated, err := o.rt.Update(ctx, ec, "Stock", stock.ID, map[string]any{"quantity": after})
	if err != nil {
		return nil, err
	}
	if before > reorder && after <= reorder {
		name := stock.String("product")
		if p, err := o.rt.Record(ctx, "Product", stock.String("product")); err == nil {
			name = p.String("name")
		}
		if _, err := o.events.Publish(ctx, ec, LowStockEvent, "application:inventory-management", map[string]any{
			"stockId": stock.ID, "productId": stock.String("product"), "productName": name, "store": stock.String("store"), "quantity": after, "reorderLevel": reorder,
		}); err != nil {
			return nil, err
		}
	}
	return updated, nil
}

// ReceiptLine is one line of a till receipt.
type ReceiptLine struct {
	ProductID string  `json:"productId"`
	SKU       string  `json:"sku"`
	Name      string  `json:"name"`
	Quantity  float64 `json:"quantity"`
	UnitPrice float64 `json:"unitPrice"`
	LineTotal float64 `json:"lineTotal"`
}

// CheckoutResult is the receipt of one till transaction.
type CheckoutResult struct {
	Sale     *data.Record  `json:"sale"`
	Lines    []ReceiptLine `json:"lines"`
	LowStock []string      `json:"lowStock"`
}

func (c *CheckoutResult) ResourceID() string { return c.Sale.ID }

// checkout sells a cart in full or not at all: every line is checked before anything changes.
func (o *ops) checkout(ctx context.Context, ec kernel.ExecutionContext, in map[string]any) (any, error) {
	store, err := str(in, "store")
	if err != nil {
		return nil, err
	}
	code, ok := storeCodes[store]
	if !ok {
		return nil, kernel.Invalid("Unknown store %s", store)
	}
	rawLines, _ := in["lines"].([]any)
	if len(rawLines) == 0 {
		return nil, kernel.Invalid("The cart is empty")
	}
	var order []string
	wanted := map[string]float64{}
	for _, raw := range rawLines {
		line, _ := raw.(map[string]any)
		productID, err := str(line, "productId")
		if err != nil {
			return nil, err
		}
		qty, err := positiveInt(line, "quantity")
		if err != nil {
			return nil, err
		}
		if _, seen := wanted[productID]; !seen {
			order = append(order, productID)
		}
		wanted[productID] += qty
	}
	type planned struct {
		stock *data.Record
		line  ReceiptLine
	}
	plan := make([]planned, 0, len(order))
	total := 0.0
	for _, productID := range order {
		qty := wanted[productID]
		product, err := o.rt.Record(ctx, "Product", productID)
		if err != nil {
			return nil, err
		}
		name := product.String("name")
		rows, err := o.rt.Match(ctx, "Stock", map[string]any{"product": productID, "store": store})
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			return nil, kernel.Conflict("%s is not stocked at %s", name, store)
		}
		stock := rows[0]
		if qty > stock.Number("quantity") {
			return nil, kernel.Conflict("Only %s × %s in stock at %s", num(stock.Number("quantity")), name, store)
		}
		price := product.Number("unitPrice")
		line := ReceiptLine{ProductID: productID, SKU: product.String("sku"), Name: name, Quantity: qty, UnitPrice: price, LineTotal: price * qty}
		plan = append(plan, planned{stock: &stock, line: line})
		total += line.LineTotal
	}
	method := "cash"
	if in["paymentMethod"] == "card" {
		method = "card"
	}
	tendered := total
	if method == "cash" {
		t, ok := toFloat(in["tendered"])
		if !ok || t < total {
			return nil, kernel.Invalid("Cash tendered does not cover the total")
		}
		tendered = t
	}
	lowStock := []string{}
	items := make([]string, 0, len(plan))
	count := 0.0
	for _, p := range plan {
		q, r := p.stock.Number("quantity"), p.stock.Number("reorderLevel")
		if q > r && q-p.line.Quantity <= r {
			lowStock = append(lowStock, p.line.Name)
		}
		if _, err := o.sell(ctx, ec, p.stock, p.line.Quantity); err != nil {
			return nil, err
		}
		items = append(items, fmt.Sprintf("%s × %s", num(p.line.Quantity), p.line.Name))
		count += p.line.Quantity
	}
	sales, err := o.rt.Match(ctx, "Sale", map[string]any{"store": store})
	if err != nil {
		return nil, err
	}
	sale, err := o.rt.Create(ctx, ec, "Sale", map[string]any{
		"receipt": fmt.Sprintf("%s-T%04d", code, len(sales)+1), "store": store, "items": strings.Join(items, ", "), "itemCount": count,
		"total": total, "paymentMethod": method, "tendered": tendered, "change": tendered - total,
	})
	if err != nil {
		return nil, err
	}
	lines := make([]ReceiptLine, 0, len(plan))
	for _, p := range plan {
		lines = append(lines, p.line)
	}
	return &CheckoutResult{Sale: sale, Lines: lines, LowStock: lowStock}, nil
}

func (o *ops) listSuppliers(ctx context.Context, _ kernel.ExecutionContext, in map[string]any) (any, error) {
	match := map[string]any{"status": "active"}
	if c, _ := in["category"].(string); c != "" {
		match["category"] = c
	}
	return o.rt.Match(ctx, "Supplier", match)
}

func (o *ops) listRequests(ctx context.Context, _ kernel.ExecutionContext, in map[string]any) (any, error) {
	if s, _ := in["status"].(string); s != "" {
		return o.rt.Match(ctx, "PurchaseRequest", map[string]any{"status": s})
	}
	return o.rt.Records(ctx, "PurchaseRequest")
}

func (o *ops) createRequest(ctx context.Context, ec kernel.ExecutionContext, in map[string]any) (any, error) {
	productID, err := str(in, "productId")
	if err != nil {
		return nil, err
	}
	store, err := str(in, "store")
	if err != nil {
		return nil, err
	}
	qty, err := positiveInt(in, "quantity")
	if err != nil {
		return nil, err
	}
	product, err := o.rt.Record(ctx, "Product", productID)
	if err != nil {
		return nil, err
	}
	open, err := o.openRequest(ctx, productID, store)
	if err != nil {
		return nil, err
	}
	if open != nil {
		return nil, kernel.Conflict("Purchase request %s is already open for this product and store", open.ID)
	}
	supplierID, err := str(in, "supplierId")
	if err != nil {
		return nil, err
	}
	justification, _ := in["justification"].(string)
	requestedBy := ec.Actor.Name
	if ec.Actor.OnBehalfOf != "" {
		requestedBy = fmt.Sprintf("%s (for %s)", ec.Actor.Name, ec.Actor.OnBehalfOf)
	}
	request, err := o.rt.Create(ctx, ec, "PurchaseRequest", map[string]any{
		"product": productID, "supplier": supplierID, "store": store, "quantity": qty,
		"estimatedCost": math.Round(product.Number("unitPrice")*qty*100) / 100, "status": "pending-approval",
		"justification": justification, "requestedBy": requestedBy,
	})
	if err != nil {
		return nil, err
	}
	_, err = o.events.Publish(ctx, ec, "PurchaseRequest.Submitted", "application:procurement-management", map[string]any{
		"purchaseRequestId": request.ID, "productName": product.String("name"), "quantity": qty,
	})
	return request, err
}

func (o *ops) decide(status, event string) kernel.Handler {
	return func(ctx context.Context, ec kernel.ExecutionContext, in map[string]any) (any, error) {
		id, err := str(in, "purchaseRequestId")
		if err != nil {
			return nil, err
		}
		request, err := o.rt.Record(ctx, "PurchaseRequest", id)
		if err != nil {
			return nil, err
		}
		if s := request.String("status"); s != "pending-approval" {
			return nil, kernel.InvalidState("Purchase request is %s", s)
		}
		updated, err := o.rt.Update(ctx, ec, "PurchaseRequest", id, map[string]any{"status": status})
		if err != nil {
			return nil, err
		}
		_, err = o.events.Publish(ctx, ec, event, "application:procurement-management", map[string]any{"purchaseRequestId": id})
		return updated, err
	}
}

func (o *ops) createOrder(ctx context.Context, ec kernel.ExecutionContext, in map[string]any) (any, error) {
	id, err := str(in, "purchaseRequestId")
	if err != nil {
		return nil, err
	}
	request, err := o.rt.Record(ctx, "PurchaseRequest", id)
	if err != nil {
		return nil, err
	}
	if s := request.String("status"); s != "approved" {
		return nil, kernel.InvalidState("Purchase request must be approved, it is %s", s)
	}
	supplier, err := o.rt.Record(ctx, "Supplier", request.String("supplier"))
	if err != nil {
		return nil, err
	}
	lead := supplier.Number("leadTimeDays")
	if lead == 0 {
		lead = 3
	}
	orders, err := o.rt.Records(ctx, "PurchaseOrder")
	if err != nil {
		return nil, err
	}
	order, err := o.rt.Create(ctx, ec, "PurchaseOrder", map[string]any{
		"orderNumber": fmt.Sprintf("PO-%d", 1000+len(orders)+1), "purchaseRequest": id, "supplier": request.Values["supplier"],
		"product": request.Values["product"], "quantity": request.Values["quantity"], "totalCost": request.Values["estimatedCost"],
		"status": "issued", "expectedDelivery": time.Now().UTC().AddDate(0, 0, int(lead)).Format("2006-01-02"),
	})
	if err != nil {
		return nil, err
	}
	if _, err := o.rt.Update(ctx, ec, "PurchaseRequest", id, map[string]any{"status": "ordered"}); err != nil {
		return nil, err
	}
	_, err = o.events.Publish(ctx, ec, "PurchaseOrder.Issued", "application:procurement-management", map[string]any{
		"purchaseOrderId": order.ID, "orderNumber": order.Values["orderNumber"], "supplier": supplier.String("name"),
	})
	return order, err
}

func (o *ops) openRequest(ctx context.Context, productID, store string) (*data.Record, error) {
	rows, err := o.rt.Match(ctx, "PurchaseRequest", map[string]any{"product": productID, "store": store})
	if err != nil {
		return nil, err
	}
	for i := range rows {
		if slices.Contains(openRequestStates, rows[i].String("status")) {
			return &rows[i], nil
		}
	}
	return nil, nil
}

func (o *ops) byID(ctx context.Context, entity string) (map[string]data.Record, error) {
	rows, err := o.rt.Records(ctx, entity)
	if err != nil {
		return nil, err
	}
	out := make(map[string]data.Record, len(rows))
	for _, r := range rows {
		out[r.ID] = r
	}
	return out, nil
}

func str(in map[string]any, key string) (string, error) {
	s, ok := in[key].(string)
	if !ok || strings.TrimSpace(s) == "" {
		return "", kernel.Invalid("%s is required", key)
	}
	return s, nil
}

func positiveInt(in map[string]any, key string) (float64, error) {
	n, ok := toFloat(in[key])
	if !ok || n <= 0 || n != math.Trunc(n) {
		return 0, kernel.Invalid("%s must be a positive whole number", key)
	}
	return n, nil
}

func toFloat(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, !math.IsNaN(n) && !math.IsInf(n, 0)
	case int:
		return float64(n), true
	case string:
		var f float64
		_, err := fmt.Sscanf(n, "%g", &f)
		return f, err == nil
	}
	return 0, false
}

// num formats a whole number without a decimal point, as the console shows quantities.
func num(f float64) string { return strings.TrimSuffix(fmt.Sprintf("%.2f", f), ".00") }
