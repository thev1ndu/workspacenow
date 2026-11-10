import { ApiError, type Agent, type AgentRun, type AgentRunStep, type Permission, type ToolCall } from "@workspacenow/types";
import { applicationToolNames, callExternalTool, listMcpTools } from "./mcp";
import type { LowStockItem } from "./operations";
import { fail, PermissionSet, type ExecutionContext, type Platform } from "./platform";

/** An agent run with the id of the user who started it, as wsn-service stores it. */
export type OwnedAgentRun = AgentRun & { userId?: string };

export interface AgentRunOptions {
  trigger: AgentRun["trigger"];
  onBehalfOf: string;
  traceId?: string;
  /** Structured input from a workflow, e.g. the low-stock event payload. */
  context?: Record<string, unknown>;
  /** The caller's permissions when the agent acts as them; it then holds only what both hold. */
  delegatedFrom?: Iterable<Permission>;
  /** Confines the run to one application: only the tools its own APIs expose may be called. */
  applicationId?: string;
  /** The signed-in user who started the run; callers without ai.manage or audit.read see only their own. */
  userId?: string;
}

/**
 * Context for an Agent's own service identity; it never inherits the caller's permissions.
 * A delegated run narrows it further to the permissions the caller also holds.
 */
function agentContext(platform: Platform, agent: Agent, options: AgentRunOptions): ExecutionContext {
  const caller = options.delegatedFrom ? new PermissionSet(options.delegatedFrom) : undefined;
  return {
    actor: { kind: "agent", id: agent.id, name: agent.name, onBehalfOf: options.onBehalfOf },
    permissions: new PermissionSet(agent.permissions.filter((p) => !caller || caller.has(p))),
    traceId: options.traceId ?? platform.newTraceId(),
    entryPoint: "mcp",
  };
}

/** Tool-level authorization, then the same Business Operation path every other entry point uses. */
function callTool(platform: Platform, ctx: ExecutionContext, agent: Agent, tool: string, input: Record<string, unknown>): ToolCall {
  if (!agent.tools.includes(tool)) {
    const reason = `Tool ${tool} is not assigned to ${agent.name}`;
    platform.audit(ctx, `mcp.${tool}`, `mcp-tool/${tool}`, "denied", reason);
    return { tool, input, outcome: "denied", reason };
  }
  const definition = listMcpTools(platform).find((t) => t.name === tool);
  if (!definition) {
    platform.audit(ctx, `mcp.${tool}`, `mcp-tool/${tool}`, "failed", "Tool is no longer exposed");
    return { tool, input, outcome: "error", reason: "Tool is no longer exposed" };
  }
  if (definition.source === "external") {
    platform.audit(ctx, `mcp.${tool}`, `mcp-server/${definition.serverId}`, "allowed");
    return { tool, input, outcome: "allowed", output: callExternalTool(tool, input) };
  }
  try {
    const output = platform.invoke(ctx, definition.businessOperation!, input);
    return { tool, input, outcome: "allowed", output };
  } catch (error) {
    if (error instanceof ApiError) {
      return { tool, input, outcome: error.status === 403 ? "denied" : "error", reason: error.message };
    }
    throw error;
  }
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/**
 * A deterministic planner standing in for the model. It reasons over the prompt and
 * picks MCP tools; the platform, not the agent, decides whether each call is allowed.
 */
export function runAgent(platform: Platform, agentId: string, prompt: string, options: AgentRunOptions): AgentRun {
  const agent = platform.state.agents.find((a) => a.id === agentId);
  if (!agent) fail(404, "NOT_FOUND", `Agent ${agentId} not found`);
  if (agent.status !== "active") fail(409, "INVALID_STATE", `${agent.name} is ${agent.status}`);
  if (agent.actsAsCaller && !options.delegatedFrom) fail(409, "INVALID_STATE", `${agent.name} runs only on behalf of a signed-in user`);
  const ctx = agentContext(platform, agent, options);
  const app = options.applicationId ? platform.state.applications.find((a) => a.id === options.applicationId) : undefined;
  if (options.applicationId && !app) fail(404, "NOT_FOUND", `Application ${options.applicationId} not found`);
  const scope = app ? applicationToolNames(platform, app.id) : undefined;
  const tools = agent.tools.filter((t) => !scope || scope.has(t));
  let outsideApp = false;
  const started = platform.now();
  const steps: AgentRunStep[] = [];
  const think = (text: string) => steps.push({ kind: "thought", text });
  const call = (tool: string, input: Record<string, unknown>) => {
    if (app && !scope!.has(tool)) {
      const reason = `${tool} is outside ${app.name}`;
      const outside: ToolCall = { tool, input, outcome: "denied", reason };
      platform.audit(ctx, `mcp.${tool}`, `application/${app.id}`, "denied", reason);
      steps.push({ kind: "tool", call: outside });
      outsideApp = true;
      return outside;
    }
    if (steps.filter((s) => s.kind === "tool").length >= agent.maxToolCallsPerRun) {
      const reason = `Execution limit of ${agent.maxToolCallsPerRun} tool calls reached`;
      const limited: ToolCall = { tool, input, outcome: "denied", reason };
      platform.audit(ctx, `mcp.${tool}`, `agent/${agent.id}`, "denied", reason);
      steps.push({ kind: "tool", call: limited });
      return limited;
    }
    const result = callTool(platform, ctx, agent, tool, input);
    steps.push({ kind: "tool", call: result });
    return result;
  };

  platform.audit(ctx, "agent.run", `agent/${agent.id}`, "allowed", prompt);
  const text = prompt.toLowerCase();
  let answer: string;

  if (includesAny(text, ["approve"])) {
    think("The request asks me to approve a purchase request. I will try the approval tool.");
    const pending = platform.records("PurchaseRequest").find((r) => r.values.status === "pending-approval");
    const result = call("approve_purchase_request", { purchaseRequestId: pending?.id ?? "unknown" });
    answer =
      result.outcome === "allowed"
        ? `Approved ${pending?.id}.`
        : `I am not permitted to approve purchase requests (${result.reason}). A Procurement Manager has to approve them in Flow → Approvals.`;
  } else if (includesAny(text, ["low stock", "low-stock", "replenish", "reorder", "purchase request", "prepare"])) {
    answer = replenish(tools, options, think, call);
  } else if (includesAny(text, ["policy", "policies", "limit"])) {
    think("This is a policy question, so I will search the company knowledge base.");
    const result = call("search_policies", { query: prompt });
    const matches = (result.output as { matches?: Array<{ title: string; excerpt: string }> } | undefined)?.matches;
    answer = matches?.length ? `${matches[0].title}: ${matches[0].excerpt}` : `I could not search policies (${result.reason}).`;
  } else if (includesAny(text, ["shipment", "delivery", "track"])) {
    think("The user wants shipment tracking. I will try the logistics tracker.");
    const result = call("track_shipment", { query: prompt });
    answer = result.outcome === "allowed" ? JSON.stringify(result.output) : `I cannot track shipments: ${result.reason}.`;
  } else if (includesAny(text, ["supplier", "vendor"])) {
    think("I will list the active suppliers.");
    const result = call("list_suppliers", {});
    const suppliers = (result.output as Array<{ values: Record<string, unknown> }> | undefined) ?? [];
    answer =
      result.outcome === "allowed"
        ? `Active suppliers: ${suppliers.map((s) => `${s.values.name} (rating ${s.values.rating})`).join(", ")}.`
        : `I could not read suppliers: ${result.reason}.`;
  } else if (includesAny(text, ["stock", "inventory"])) {
    think("I will check which items are at or below their reorder level.");
    const result = call("get_low_stock_items", {});
    const items = (result.output as LowStockItem[] | undefined) ?? [];
    answer =
      result.outcome !== "allowed"
        ? `I could not read inventory: ${result.reason}.`
        : items.length === 0
          ? "No items are at or below their reorder level."
          : `Low stock: ${items.map((i) => `${i.productName} at ${i.store} (${i.quantity}/${i.reorderLevel})`).join("; ")}.`;
  } else {
    answer = app
      ? tools.length
        ? `I am ${agent.name}, helping with ${app.name} only. I can use: ${tools.join(", ")}.`
        : `I am ${agent.name}, helping with ${app.name} only, but ${app.name} exposes no tools I can use yet.`
      : `I am ${agent.name}. ${agent.description} I can use: ${agent.tools.join(", ")}.`;
  }

  // A refusal for scope is about where the user asked, not who they are, so say that instead.
  if (app && outsideApp) answer = `That is outside ${app.name}, so I can't do it here. Ask Sidekick in the WorkspaceNow console, or open the app that owns it.`;

  const durationMs = 600 + steps.length * 450;
  const run: OwnedAgentRun = {
    id: platform.nextId("run"),
    userId: options.userId,
    agentId: agent.id,
    traceId: ctx.traceId,
    prompt,
    trigger: options.trigger,
    applicationId: app?.id,
    status: steps.some((s) => s.kind === "tool" && s.call.outcome === "error") ? "failed" : "completed",
    steps,
    answer,
    startedAt: started,
    durationMs,
    tokens: 350 + Math.round((prompt.length + answer.length) * 1.3) + steps.length * 180,
  };
  platform.state.agentRuns.push(run);
  const provider = platform.state.modelProviders.find((m) => m.models.includes(agent.model));
  if (provider) {
    provider.tokensThisMonth += run.tokens;
    provider.costThisMonthUsd = Math.round((provider.costThisMonthUsd + run.tokens * 0.000003) * 100) / 100;
  }
  return run;
}

function replenish(
  tools: string[],
  options: AgentRunOptions,
  think: (text: string) => void,
  call: (tool: string, input: Record<string, unknown>) => ToolCall,
): string {
  think("I need the current low-stock items before preparing any purchase request.");
  const stockResult = call("get_low_stock_items", {});
  if (stockResult.outcome !== "allowed") return `I could not read inventory: ${stockResult.reason}.`;
  const targetStockId = options.context?.stockId;
  const candidates = (stockResult.output as LowStockItem[]).filter(
    (item) => !item.openRequestId && (!targetStockId || item.stockId === targetStockId),
  );
  if (candidates.length === 0) {
    return "Every low-stock item already has an open purchase request, so there is nothing new to prepare.";
  }
  think("Checking procurement policy for the order quantity rule.");
  if (tools.includes("search_policies")) call("search_policies", { query: "replenishment quantity" });
  think(`Looking up suppliers for ${candidates.length} item(s).`);
  const supplierResult = call("list_suppliers", {});
  if (supplierResult.outcome !== "allowed") return `I could not read suppliers: ${supplierResult.reason}.`;
  const suppliers = supplierResult.output as Array<{ id: string; values: Record<string, unknown> }>;

  const created: string[] = [];
  for (const item of candidates.slice(0, 3)) {
    const supplier =
      suppliers.find((s) => s.id === item.preferredSupplierId) ??
      [...suppliers].sort((a, b) => Number(b.values.rating) - Number(a.values.rating))[0];
    if (!supplier) continue;
    const quantity = Math.max(item.reorderLevel * 2 - item.quantity, 1);
    think(`${item.productName} at ${item.store} has ${item.quantity} units (reorder level ${item.reorderLevel}). Ordering ${quantity} from ${supplier.values.name}.`);
    const result = call("create_purchase_request", {
      productId: item.productId,
      supplierId: supplier.id,
      store: item.store,
      quantity,
      justification: `Stock at ${item.quantity} is at or below reorder level ${item.reorderLevel}; restoring to twice the reorder level per policy 4.2.`,
    });
    if (result.outcome === "allowed") {
      const request = result.output as { id: string };
      created.push(`${request.id} for ${quantity} × ${item.productName} (${item.store}) from ${supplier.values.name}`);
    } else {
      created.push(`could not request ${item.productName}: ${result.reason}`);
    }
  }
  return `Prepared purchase requests: ${created.join("; ")}. Each needs Procurement Manager approval before an order is issued.`;
}
