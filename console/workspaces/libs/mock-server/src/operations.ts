import type { EntityRecord, FieldValue } from "@workspacenow/types";
import { fail, type ExecutionContext, type OperationDefinition, type Platform } from "./platform";

export const LOW_STOCK_EVENT = "Stock.LowStockReached";

export interface LowStockItem {
  stockId: string;
  productId: string;
  productName: string;
  sku: string;
  store: string;
  quantity: number;
  reorderLevel: number;
  preferredSupplierId: string | null;
  openRequestId: string | null;
}

const OPEN_REQUEST_STATES = ["pending-approval", "approved"];

function openRequestFor(p: Platform, productId: string, store: string): EntityRecord | undefined {
  return p
    .records("PurchaseRequest")
    .find(
      (r) =>
        r.values.product === productId &&
        r.values.store === store &&
        OPEN_REQUEST_STATES.includes(String(r.values.status)),
    );
}

function str(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.trim() === "") fail(422, "VALIDATION_FAILED", `${key} is required`);
  return value;
}

function positiveInt(input: Record<string, unknown>, key: string): number {
  const value = Number(input[key]);
  if (!Number.isInteger(value) || value <= 0) fail(422, "VALIDATION_FAILED", `${key} must be a positive whole number`);
  return value;
}

export function lowStockItems(p: Platform): LowStockItem[] {
  return p
    .records("Stock")
    .filter((s) => Number(s.values.quantity) <= Number(s.values.reorderLevel))
    .map((s) => {
      const product = p.records("Product").find((r) => r.id === s.values.product);
      const store = String(s.values.store);
      return {
        stockId: s.id,
        productId: String(s.values.product),
        productName: String(product?.values.name ?? s.values.product),
        sku: String(product?.values.sku ?? ""),
        store,
        quantity: Number(s.values.quantity),
        reorderLevel: Number(s.values.reorderLevel),
        preferredSupplierId: (product?.values.preferredSupplier as string | null) ?? null,
        openRequestId: openRequestFor(p, String(s.values.product), store)?.id ?? null,
      };
    });
}

function setStatus(p: Platform, ctx: ExecutionContext, entity: string, id: string, status: string): EntityRecord {
  return p.updateRecord(ctx, entity, id, { status } as Record<string, FieldValue>);
}

/** Takes sold units off a stock record, publishing a low-stock event when the sale crosses the reorder level. */
function sellStock(p: Platform, ctx: ExecutionContext, stock: EntityRecord, sold: number): EntityRecord {
  const before = Number(stock.values.quantity);
  const after = before - sold;
  const reorderLevel = Number(stock.values.reorderLevel);
  const updated = p.updateRecord(ctx, "Stock", stock.id, { quantity: after });
  if (before > reorderLevel && after <= reorderLevel) {
    const product = p.records("Product").find((r) => r.id === stock.values.product);
    p.publish(ctx, LOW_STOCK_EVENT, "application:inventory-management", {
      stockId: stock.id,
      productId: stock.values.product,
      productName: product?.values.name ?? stock.values.product,
      store: stock.values.store,
      quantity: after,
      reorderLevel,
    });
  }
  return updated;
}

const STORE_CODES: Record<string, string> = { "Colombo City": "CMB", Kandy: "KDY", Galle: "GLE" };

export interface ReceiptLine {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CheckoutResult {
  sale: EntityRecord;
  lines: ReceiptLine[];
  /** Products this sale took to or below their reorder level. */
  lowStock: string[];
}

/**
 * One till transaction. Every line is checked against the store's stock before anything changes, so
 * a cart either sells in full or not at all; each line then sells exactly like inventory.recordSale.
 */
function checkout(p: Platform, ctx: ExecutionContext, input: Record<string, unknown>): CheckoutResult {
  const store = str(input, "store");
  if (!STORE_CODES[store]) fail(422, "VALIDATION_FAILED", `Unknown store ${store}`, ctx.traceId);
  if (!Array.isArray(input.lines) || input.lines.length === 0) fail(422, "VALIDATION_FAILED", "The cart is empty", ctx.traceId);

  // The same product scanned twice is one line.
  const wanted = new Map<string, number>();
  for (const raw of input.lines as Array<Record<string, unknown>>) {
    const productId = str(raw, "productId");
    wanted.set(productId, (wanted.get(productId) ?? 0) + positiveInt(raw, "quantity"));
  }
  const planned = [...wanted].map(([productId, quantity]) => {
    const product = p.record("Product", productId);
    const stock = p.records("Stock").find((s) => s.values.product === productId && s.values.store === store);
    const name = String(product.values.name);
    if (!stock) fail(409, "CONFLICT", `${name} is not stocked at ${store}`, ctx.traceId);
    if (quantity > Number(stock.values.quantity)) fail(409, "CONFLICT", `Only ${String(stock.values.quantity)} × ${name} in stock at ${store}`, ctx.traceId);
    const unitPrice = Number(product.values.unitPrice);
    return { stock, line: { productId, sku: String(product.values.sku), name, quantity, unitPrice, lineTotal: unitPrice * quantity } };
  });
  const total = planned.reduce((sum, { line }) => sum + line.lineTotal, 0);

  const paymentMethod = input.paymentMethod === "card" ? "card" : "cash";
  const tendered = paymentMethod === "card" ? total : Number(input.tendered);
  if (!Number.isFinite(tendered) || tendered < total) fail(422, "VALIDATION_FAILED", "Cash tendered does not cover the total", ctx.traceId);

  const lowStock = planned
    .filter(({ stock, line }) => Number(stock.values.quantity) > Number(stock.values.reorderLevel) && Number(stock.values.quantity) - line.quantity <= Number(stock.values.reorderLevel))
    .map(({ line }) => line.name);
  for (const { stock, line } of planned) sellStock(p, ctx, stock, line.quantity);

  const number = p.records("Sale").filter((s) => s.values.store === store).length + 1;
  const sale = p.createRecord(ctx, "Sale", {
    receipt: `${STORE_CODES[store]}-T${String(number).padStart(4, "0")}`,
    store,
    items: planned.map(({ line }) => `${line.quantity} × ${line.name}`).join(", "),
    itemCount: planned.reduce((sum, { line }) => sum + line.quantity, 0),
    total,
    paymentMethod,
    tendered,
    change: tendered - total,
  });
  return { sale, lines: planned.map(({ line }) => line), lowStock };
}

export const domainOperations: OperationDefinition[] = [
  {
    name: "inventory.getLowStockItems",
    summary: "List stock at or below its reorder level",
    permission: "inventory.read",
    kind: "read",
    entity: "Stock",
    handler: (p) => lowStockItems(p),
  },
  {
    name: "inventory.recordSale",
    summary: "Reduce stock after a sale and raise a low-stock event when the reorder level is crossed",
    permission: "inventory.write",
    kind: "write",
    entity: "Stock",
    handler: (p, ctx, input) => {
      const stock = p.record("Stock", str(input, "stockId"));
      const sold = positiveInt(input, "quantity");
      const before = Number(stock.values.quantity);
      if (sold > before) fail(409, "CONFLICT", `Only ${before} units in stock`, ctx.traceId);
      return sellStock(p, ctx, stock, sold);
    },
  },
  {
    name: "inventory.checkout",
    summary: "Sell a cart at one store's till: reduce stock for every line, record the sale and return its receipt",
    permission: "inventory.write",
    kind: "write",
    entity: "Sale",
    handler: (p, ctx, input) => checkout(p, ctx, input),
  },
  {
    name: "supplier.listSuppliers",
    summary: "List active suppliers, optionally by category",
    permission: "supplier.read",
    kind: "read",
    entity: "Supplier",
    handler: (p, _ctx, input) =>
      p
        .records("Supplier")
        .filter((s) => s.values.status === "active")
        .filter((s) => !input.category || s.values.category === input.category),
  },
  {
    name: "procurement.listPurchaseRequests",
    summary: "List purchase requests, optionally by status",
    permission: "procurement.read",
    kind: "read",
    entity: "PurchaseRequest",
    handler: (p, _ctx, input) =>
      p.records("PurchaseRequest").filter((r) => !input.status || r.values.status === input.status),
  },
  {
    name: "procurement.createPurchaseRequest",
    summary: "Submit a purchase request for approval",
    permission: "procurement.request",
    kind: "write",
    entity: "PurchaseRequest",
    handler: (p, ctx, input) => {
      const productId = str(input, "productId");
      const store = str(input, "store");
      const quantity = positiveInt(input, "quantity");
      const product = p.record("Product", productId);
      const open = openRequestFor(p, productId, store);
      if (open) fail(409, "CONFLICT", `Purchase request ${open.id} is already open for this product and store`, ctx.traceId);
      const request = p.createRecord(ctx, "PurchaseRequest", {
        product: productId,
        supplier: str(input, "supplierId"),
        store,
        quantity,
        estimatedCost: Math.round(Number(product.values.unitPrice ?? 0) * quantity * 100) / 100,
        status: "pending-approval",
        justification: typeof input.justification === "string" ? input.justification : "",
        requestedBy: ctx.actor.onBehalfOf ? `${ctx.actor.name} (for ${ctx.actor.onBehalfOf})` : ctx.actor.name,
      });
      p.publish(ctx, "PurchaseRequest.Submitted", "application:procurement-management", {
        purchaseRequestId: request.id,
        productName: product.values.name,
        quantity,
      });
      return request;
    },
  },
  {
    name: "procurement.approvePurchaseRequest",
    summary: "Approve a pending purchase request",
    permission: "procurement.approve",
    kind: "write",
    entity: "PurchaseRequest",
    handler: (p, ctx, input) => {
      const request = p.record("PurchaseRequest", str(input, "purchaseRequestId"));
      if (request.values.status !== "pending-approval") {
        fail(409, "INVALID_STATE", `Purchase request is ${request.values.status}`, ctx.traceId);
      }
      const approved = setStatus(p, ctx, "PurchaseRequest", request.id, "approved");
      p.publish(ctx, "PurchaseRequest.Approved", "application:procurement-management", { purchaseRequestId: request.id });
      return approved;
    },
  },
  {
    name: "procurement.rejectPurchaseRequest",
    summary: "Reject a pending purchase request",
    permission: "procurement.approve",
    kind: "write",
    entity: "PurchaseRequest",
    handler: (p, ctx, input) => {
      const request = p.record("PurchaseRequest", str(input, "purchaseRequestId"));
      if (request.values.status !== "pending-approval") {
        fail(409, "INVALID_STATE", `Purchase request is ${request.values.status}`, ctx.traceId);
      }
      const rejected = setStatus(p, ctx, "PurchaseRequest", request.id, "rejected");
      p.publish(ctx, "PurchaseRequest.Rejected", "application:procurement-management", { purchaseRequestId: request.id });
      return rejected;
    },
  },
  {
    name: "procurement.createPurchaseOrder",
    summary: "Issue a purchase order for an approved purchase request",
    permission: "procurement.order",
    kind: "write",
    entity: "PurchaseOrder",
    handler: (p, ctx, input) => {
      const request = p.record("PurchaseRequest", str(input, "purchaseRequestId"));
      if (request.values.status !== "approved") {
        fail(409, "INVALID_STATE", `Purchase request must be approved, it is ${request.values.status}`, ctx.traceId);
      }
      const supplier = p.record("Supplier", String(request.values.supplier));
      const expected = new Date(p.now());
      expected.setDate(expected.getDate() + Number(supplier.values.leadTimeDays ?? 3));
      const order = p.createRecord(ctx, "PurchaseOrder", {
        orderNumber: `PO-${1000 + p.records("PurchaseOrder").length + 1}`,
        purchaseRequest: request.id,
        supplier: request.values.supplier,
        product: request.values.product,
        quantity: request.values.quantity,
        totalCost: request.values.estimatedCost,
        status: "issued",
        expectedDelivery: expected.toISOString().slice(0, 10),
      });
      setStatus(p, ctx, "PurchaseRequest", request.id, "ordered");
      p.publish(ctx, "PurchaseOrder.Issued", "application:procurement-management", {
        purchaseOrderId: order.id,
        orderNumber: order.values.orderNumber,
        supplier: supplier.values.name,
      });
      return order;
    },
  },
];
