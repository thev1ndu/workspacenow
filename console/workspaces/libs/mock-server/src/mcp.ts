import type { JsonSchema, McpTool } from "@workspacenow/types";
import type { Platform } from "./platform";

export const MANAGED_MCP_SERVER_ID = "mcp-workspacenow";

const OPERATION_INPUTS: Record<string, JsonSchema> = {
  "inventory.getLowStockItems": { type: "object", properties: {} },
  "inventory.recordSale": {
    type: "object",
    properties: {
      stockId: { type: "string", description: "Stock record id" },
      quantity: { type: "integer", description: "Units sold" },
    },
    required: ["stockId", "quantity"],
  },
  "supplier.listSuppliers": {
    type: "object",
    properties: { category: { type: "string", description: "Optional product category" } },
  },
  "procurement.listPurchaseRequests": {
    type: "object",
    properties: {
      status: { type: "string", enum: ["pending-approval", "approved", "rejected", "ordered"] },
    },
  },
  "procurement.createPurchaseRequest": {
    type: "object",
    properties: {
      productId: { type: "string" },
      supplierId: { type: "string" },
      store: { type: "string" },
      quantity: { type: "integer" },
      justification: { type: "string" },
    },
    required: ["productId", "supplierId", "store", "quantity"],
  },
  "procurement.approvePurchaseRequest": {
    type: "object",
    properties: { purchaseRequestId: { type: "string" } },
    required: ["purchaseRequestId"],
  },
  "procurement.createPurchaseOrder": {
    type: "object",
    properties: { purchaseRequestId: { type: "string" } },
    required: ["purchaseRequestId"],
  },
};

export function operationInputSchema(platform: Platform, businessOperation: string): JsonSchema {
  const known = OPERATION_INPUTS[businessOperation];
  if (known) return known;
  const [entityName, verb] = businessOperation.split(".");
  const entity = platform.state.entities.find((e) => e.name === entityName);
  if (!entity) return { type: "object" };
  if (verb === "get") return { type: "object", properties: { id: { type: "string" } }, required: ["id"] };
  if (verb === "create" || verb === "update") {
    return {
      type: "object",
      properties: {
        ...(verb === "update" ? { id: { type: "string" } } : {}),
        values: { type: "object", description: entity.fields.map((f) => f.name).join(", ") },
      },
      required: verb === "update" ? ["id", "values"] : ["values"],
    };
  }
  return { type: "object", properties: {} };
}

/** Tools generated from API operations whose MCP exposure is enabled, plus external servers' tools. */
/** The MCP tools an application exposes through its own APIs. */
export function applicationToolNames(platform: Platform, applicationId: string): Set<string> {
  const apiIds = new Set(platform.state.apis.filter((a) => a.applicationId === applicationId).map((a) => a.id));
  return new Set(platform.state.operations.filter((op) => apiIds.has(op.apiId) && op.mcp?.enabled).map((op) => op.mcp!.toolName));
}

export function listMcpTools(platform: Platform): McpTool[] {
  const generated = platform.state.operations
    .filter((op) => op.mcp?.enabled)
    .map<McpTool>((op) => {
      const api = platform.state.apis.find((a) => a.id === op.apiId);
      const operation = platform.getOperation(op.businessOperation);
      return {
        name: op.mcp!.toolName,
        description: op.mcp!.description,
        source: "workspacenow",
        serverId: MANAGED_MCP_SERVER_ID,
        operationId: op.id,
        businessOperation: op.businessOperation,
        permission: op.permission,
        inputSchema: operationInputSchema(platform, op.businessOperation),
        outputSchema: operation?.kind === "read" ? { type: "array", items: { type: "object" } } : { type: "object" },
        version: api?.version ?? "1.0.0",
      };
    });
  const external = platform.state.mcpServers
    .filter((s) => s.kind === "external")
    .flatMap((server) =>
      server.tools.map<McpTool>((tool) => ({
        ...tool,
        source: "external",
        serverId: server.id,
        inputSchema: { type: "object", properties: { query: { type: "string" } } },
        outputSchema: { type: "object" },
        version: "external",
      })),
    );
  return [...generated, ...external];
}

/** Deterministic stand-ins for external MCP servers in the demo. */
export function callExternalTool(tool: string, input: Record<string, unknown>): unknown {
  switch (tool) {
    case "search_policies":
      return {
        matches: [
          {
            title: "Procurement policy 4.2 — Replenishment",
            excerpt:
              "Store replenishment requests up to LKR 500,000 require one Procurement Manager approval. Order quantity should restore stock to twice the reorder level.",
          },
        ],
        query: input.query ?? "",
      };
    case "track_shipment":
      return { shipmentId: input.query ?? "unknown", status: "in-transit", eta: "2 days" };
    case "estimate_delivery":
      return { days: 3 };
    default:
      return { ok: true, tool, input };
  }
}
