import type { ApiOperation } from "@workspacenow/types";

const EXAMPLES: Record<string, Record<string, unknown>> = {
  "inventory.recordSale": { stockId: "stk-milk-cmb", quantity: 1 },
  "inventory.getLowStockItems": {},
  "supplier.listSuppliers": {},
  "procurement.listPurchaseRequests": { status: "pending-approval" },
  "procurement.createPurchaseRequest": {
    productId: "prod-tea",
    supplierId: "sup-ceylon",
    store: "Colombo City",
    quantity: 20,
    justification: "Manual top-up before the festive weekend",
  },
  "procurement.approvePurchaseRequest": { purchaseRequestId: "" },
  "procurement.createPurchaseOrder": { purchaseRequestId: "" },
  "Supplier.create": { values: { name: "New Supplier Ltd", category: "Grocery", status: "active" } },
};

/** A sensible starting payload for the "Try it" console. */
export function exampleInput(operation: ApiOperation): string {
  const known = EXAMPLES[operation.businessOperation];
  if (known) return JSON.stringify(known, null, 2);
  const verb = operation.businessOperation.split(".")[1];
  const generic: Record<string, unknown> =
    verb === "get" ? { id: "" } : verb === "create" ? { values: {} } : verb === "update" ? { id: "", values: {} } : {};
  return JSON.stringify(generic, null, 2);
}
