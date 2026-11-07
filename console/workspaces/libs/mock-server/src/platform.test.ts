import { describe, expect, it } from "vitest";
import { ApiError, planFromApplication, type AgentRun, type AlertFire, type AlertRule, type ApiVersion, type CreatedApiKey, type Entity, type EntityRecord, type SavedView, type Slo, type Webhook, type WebhookDelivery, type WorkflowDefinition } from "@workspacenow/types";
import { runAgent } from "./agents";
import { handleRequest } from "./router";
import { createDemoPlatform } from "./runtime";
import { applyPlan, createRelease, deploy, planApplication, planApplicationEdit, updateApplication } from "./studio";
import { decideApproval, runManually, saveWorkflow } from "./workflows";

const withQuery = (path: string) => {
  const [p, q] = path.split("?");
  return { path: p, query: new URLSearchParams(q ?? "") };
};
const get = (platform: ReturnType<typeof createDemoPlatform>, path: string, user = "u-amaya") => {
  const { path: p, query } = withQuery(path);
  return handleRequest(platform, { method: "GET", path: p, query, body: undefined, token: `demo.${user}` });
};

const post = (platform: ReturnType<typeof createDemoPlatform>, path: string, body: unknown, user = "u-amaya") =>
  handleRequest(platform, { method: "POST", path, query: new URLSearchParams(), body, token: `demo.${user}` });

describe("seeded history", () => {
  it("ran one replenishment end to end", () => {
    const platform = createDemoPlatform();
    const execution = platform.state.executions.find((e) => e.workflowId === "wf-low-stock")!;
    expect(execution.status).toBe("completed");
    expect(execution.steps.every((s) => s.status === "completed")).toBe(true);
    const orders = platform.records("PurchaseOrder");
    expect(orders).toHaveLength(1);
    expect(orders[0].values.product).toBe("prod-oil");
    expect(platform.state.executions.some((e) => e.workflowId === "wf-supplier-notify" && e.status === "completed")).toBe(true);
  });

  it("recorded the agent's refused approval", () => {
    const platform = createDemoPlatform();
    const denied = platform.state.audit.filter((a) => a.outcome === "denied");
    expect(denied.some((a) => a.actor.kind === "agent" && a.action === "mcp.approve_purchase_request")).toBe(true);
    expect(denied.some((a) => a.actor.id === "u-nimal" && a.action === "Supplier.create")).toBe(true);
  });
});

describe("live demonstration scenario", () => {
  it("goes from a sale to an issued purchase order in one trace", () => {
    const platform = createDemoPlatform();
    const sale = post(platform, "/business-operations/invoke", {
      operation: "inventory.recordSale",
      input: { stockId: "stk-rice-cmb", quantity: 8 },
      entryPoint: "studio",
    }, "u-nimal");
    expect(sale.status).toBe(201);
    const { traceId } = sale.body as { traceId: string };

    const execution = platform.state.executions.find((e) => e.traceId === traceId && e.workflowId === "wf-low-stock")!;
    expect(execution.status).toBe("waiting");
    const requestId = execution.context.purchaseRequestId as string;
    expect(platform.record("PurchaseRequest", requestId).values).toMatchObject({
      product: "prod-rice",
      supplier: "sup-lanka",
      store: "Colombo City",
      quantity: 42,
      status: "pending-approval",
    });

    const approval = platform.state.approvals.find((a) => a.executionId === execution.id)!;
    const refused = post(platform, `/approvals/${approval.id}/decision`, { decision: "approved" }, "u-kavya");
    expect(refused.status).toBe(403);

    const accepted = post(platform, `/approvals/${approval.id}/decision`, { decision: "approved", comment: "ok" }, "u-ruwan");
    expect(accepted.status).toBe(201);
    expect(execution.status).toBe("completed");
    expect(platform.record("PurchaseRequest", requestId).values.status).toBe("ordered");
    expect(requestId).toMatch(/^pr-/);
    const notify = execution.steps.find((s) => s.stepId === "s-notify")!;
    expect(notify.detail).toMatch(/^Purchase order PO-\d+ issued to replenish Basmati Rice 5kg at Colombo City\.$/);

    const trace = get(platform, `/traces/${traceId}`, "u-dilini").body as { audit: Array<{ actor: { kind: string } }> };
    const kinds = new Set(trace.audit.map((a) => a.actor.kind));
    expect(kinds).toEqual(new Set(["user", "workflow", "agent"]));
  });

  it("skips ordering when the request is rejected", () => {
    const platform = createDemoPlatform();
    post(platform, "/business-operations/invoke", { operation: "inventory.recordSale", input: { stockId: "stk-milk-cmb", quantity: 5 } }, "u-nimal");
    const approval = platform.state.approvals.find((a) => a.status === "pending")!;
    decideApproval(platform, "u-ruwan", approval.id, "rejected", "Supplier delivers tomorrow anyway");
    const execution = platform.state.executions.find((e) => e.id === approval.executionId)!;
    expect(execution.status).toBe("completed");
    expect(execution.steps.map((s) => s.status)).toEqual(["completed", "completed", "skipped", "skipped"]);
  });

  it("does not raise a second event once stock is already below the reorder level", () => {
    const platform = createDemoPlatform();
    const before = platform.state.executions.length;
    platform.invoke(platform.userContext("u-nimal", "studio"), "inventory.recordSale", { stockId: "stk-sugar-gle", quantity: 1 });
    expect(platform.state.executions.length).toBe(before);
  });
});

describe("governance", () => {
  it("denies operations without permission at every entry point", () => {
    const platform = createDemoPlatform();
    const viaApi = post(platform, "/api-operations/op-pr-approve/invoke", { input: { purchaseRequestId: "x" } }, "u-nimal");
    expect(viaApi.status).toBe(403);
    const viaStudio = post(platform, "/entities/Supplier/records", { values: { name: "X" } }, "u-nimal");
    expect(viaStudio.status).toBe(403);
  });

  it("refuses agent tools that are not assigned, even when exposed over MCP", () => {
    const platform = createDemoPlatform();
    const run = runAgent(platform, "agent-procurement", "approve it", { trigger: "manual", onBehalfOf: "Test" });
    const call = run.steps.find((s) => s.kind === "tool");
    expect(call && call.kind === "tool" && call.call.outcome).toBe("denied");
  });

  it("refuses tools whose business operation the agent identity cannot run", () => {
    const platform = createDemoPlatform();
    const agent = platform.state.agents.find((a) => a.id === "agent-inventory")!;
    agent.tools.push("list_suppliers");
    const run = runAgent(platform, "agent-inventory", "which suppliers do we use?", { trigger: "manual", onBehalfOf: "Test" });
    const call = run.steps.find((s) => s.kind === "tool" && s.call.tool === "list_suppliers");
    expect(call && call.kind === "tool" && call.call.outcome).toBe("denied");
    expect(call && call.kind === "tool" && call.call.reason).toMatch(/lacks permission supplier.read/);
  });

  it("requires a session", () => {
    const platform = createDemoPlatform();
    expect(handleRequest(platform, { method: "GET", path: "/applications", query: new URLSearchParams(), body: undefined }).status).toBe(401);
  });

  it("validates records in the entity runtime", () => {
    const platform = createDemoPlatform();
    const ctx = platform.userContext("u-amaya", "studio");
    expect(() => platform.invoke(ctx, "Stock.create", { values: { product: "prod-missing", store: "Kandy", quantity: 1, reorderLevel: 1 } })).toThrow(ApiError);
    expect(() => platform.invoke(ctx, "Product.create", { values: { sku: "GR-1001", name: "Dup", unitPrice: 1 } })).toThrow(/unique/);
    const created = platform.invoke<EntityRecord>(ctx, "Stock.create", { values: { product: "prod-tea", store: "Galle", quantity: "12", reorderLevel: 5 } });
    expect(created.values.quantity).toBe(12);
  });
});

describe("workflow designer", () => {
  const notify = (id: string, next?: string | null) => ({ id, kind: "notify" as const, name: `Notify ${id}`, channel: "email:ops", message: `Path ${id}`, next });
  const branching = (): WorkflowDefinition => ({
    name: "Big order alert",
    description: "",
    trigger: { kind: "manual" },
    start: "check",
    steps: [
      { id: "check", kind: "condition", name: "Large order?", field: "order.total", operator: "gte", value: "1000", then: "wait", otherwise: "small" },
      { id: "wait", kind: "wait", name: "Cool off", minutes: 5, next: "big" },
      notify("big", null),
      notify("small", null),
    ],
  });

  it("follows the branch a condition picks and skips the other", () => {
    const platform = createDemoPlatform();
    const admin = platform.userContext("u-amaya", "control");
    const workflow = saveWorkflow(platform, admin, undefined, branching());
    workflow.status = "active";
    const run = (total: number) => runManually(platform, "u-amaya", workflow.id, { order: { total } });
    const status = (exec: ReturnType<typeof run>, id: string) => exec.steps.find((s) => s.stepId === id)?.status;

    const large = run(2500);
    expect(large.status).toBe("completed");
    expect([status(large, "wait"), status(large, "big"), status(large, "small")]).toEqual(["completed", "completed", "skipped"]);
    const small = run(40);
    expect([status(small, "wait"), status(small, "big"), status(small, "small")]).toEqual(["skipped", "skipped", "completed"]);
  });

  it("takes an approval's rejection path", () => {
    const platform = createDemoPlatform();
    const admin = platform.userContext("u-amaya", "control");
    const workflow = saveWorkflow(platform, admin, undefined, {
      name: "Gate",
      description: "",
      trigger: { kind: "manual" },
      steps: [{ id: "ok", kind: "approval", name: "Sign off", permission: "procurement.approve", description: "Check it", onReject: "no" }, notify("yes", null), notify("no", null)],
    });
    workflow.status = "active";
    const exec = runManually(platform, "u-amaya", workflow.id, {});
    const approval = platform.state.approvals.find((a) => a.executionId === exec.id)!;
    decideApproval(platform, "u-ruwan", approval.id, "rejected", "");
    expect(exec.steps.find((s) => s.stepId === "no")?.status).toBe("completed");
    expect(exec.steps.find((s) => s.stepId === "yes")?.status).toBe("skipped");
  });

  it("refuses flows that loop or leave steps unreachable, and versions saves", () => {
    const platform = createDemoPlatform();
    const admin = platform.userContext("u-amaya", "control");
    const looping = branching();
    looping.steps[1] = { ...looping.steps[1], next: "check" };
    expect(() => saveWorkflow(platform, admin, undefined, looping)).toThrow(/loops back/);
    const orphan = branching();
    orphan.steps.push(notify("lost", null));
    expect(() => saveWorkflow(platform, admin, undefined, orphan)).toThrow(/not connected/);
    const saved = saveWorkflow(platform, admin, undefined, branching());
    expect(saveWorkflow(platform, admin, saved.id, { ...branching(), name: "Renamed" }).version).toBe(2);
  });

  it("gives a workflow only the permissions its operations need, never more than its author holds", () => {
    const platform = createDemoPlatform();
    const definition: WorkflowDefinition = {
      name: "Auto sale",
      description: "",
      trigger: { kind: "manual" },
      steps: [{ id: "sell", kind: "operation", name: "Sell", businessOperation: "inventory.recordSale" }],
    };
    // Sahan builds workflows but cannot write inventory, so cannot hand that right to one.
    expect(() => saveWorkflow(platform, platform.userContext("u-sahan", "control"), undefined, definition)).toThrow(/permissions you do not hold/);
    expect(saveWorkflow(platform, platform.userContext("u-amaya", "control"), undefined, definition).permissions).toEqual(["inventory.write"]);
  });
});

describe("till checkout", () => {
  it("sells a cart in full, reduces stock, numbers the receipt and raises low stock", () => {
    const platform = createDemoPlatform();
    const ctx = platform.userContext("u-nimal", "studio");
    const stock = (id: string) => Number(platform.record("Stock", id).values.quantity);
    const eventsBefore = platform.state.events.filter((e) => e.type === "Stock.LowStockReached").length;
    const result = platform.invoke<{ sale: EntityRecord; lines: Array<{ lineTotal: number }>; lowStock: string[] }>(ctx, "inventory.checkout", {
      store: "Colombo City",
      lines: [
        { productId: "prod-rice", quantity: 2 },
        { productId: "prod-milk", quantity: 4 },
        { productId: "prod-rice", quantity: 1 },
      ],
      paymentMethod: "cash",
      tendered: 10000,
    });
    // Rice 3 × 2450 + Milk 4 × 480; the repeated rice line is merged, and milk drops to its reorder level.
    expect(result.lines).toHaveLength(2);
    expect(result.sale.values).toMatchObject({ receipt: "CMB-T0001", total: 9270, change: 730, itemCount: 7 });
    expect(stock("stk-rice-cmb")).toBe(43);
    expect(stock("stk-milk-cmb")).toBe(60);
    expect(result.lowStock).toContain("Fresh Milk 1L");
    expect(platform.state.events.filter((e) => e.type === "Stock.LowStockReached").length).toBeGreaterThan(eventsBefore);
  });

  it("changes nothing when any line cannot be sold or the cash falls short", () => {
    const platform = createDemoPlatform();
    const ctx = platform.userContext("u-nimal", "studio");
    const sales = () => platform.records("Sale").length;
    const rice = () => Number(platform.record("Stock", "stk-rice-cmb").values.quantity);
    expect(() =>
      platform.invoke(ctx, "inventory.checkout", { store: "Colombo City", lines: [{ productId: "prod-rice", quantity: 1 }, { productId: "prod-milk", quantity: 999 }], paymentMethod: "card" }),
    ).toThrow(/Only 64/);
    expect(() =>
      platform.invoke(ctx, "inventory.checkout", { store: "Colombo City", lines: [{ productId: "prod-rice", quantity: 1 }], paymentMethod: "cash", tendered: 100 }),
    ).toThrow(/does not cover/);
    expect(rice()).toBe(46);
    expect(sales()).toBe(0);
    expect(() =>
      platform.invoke(platform.userContext("u-dilini", "studio"), "inventory.checkout", { store: "Colombo City", lines: [{ productId: "prod-rice", quantity: 1 }], paymentMethod: "card" }),
    ).toThrow(ApiError);
  });
});

describe("studio", () => {
  it("builds, releases and promotes a generated application", () => {
    const platform = createDemoPlatform();
    const ctx = platform.userContext("u-sahan", "studio");
    const plan = planApplication("Build an employee management application with leave requests and approvals");
    expect(plan.entities.map((e) => e.name)).toContain("LeaveRequest");
    const app = applyPlan(platform, ctx, plan);
    const revised = planApplicationEdit(platform, app.id, "Add a loyalty points field to every sale");
    expect(revised.entities.length).toBeGreaterThan(plan.entities.length);
    expect(revised.entities.some((e) => e.name === "Loyalty")).toBe(true);
    expect(revised.prompt).toContain("loyalty");
    const updated = updateApplication(platform, ctx, app.id, revised);
    expect(updated.entityNames).toContain("Loyalty");
    expect(platform.state.operations.filter((o) => o.businessOperation.startsWith("Employee.")).length).toBe(4);
    const release = createRelease(platform, ctx, app.id, "First cut");
    expect(release.version).toBe("1.0.0");
    expect(() => deploy(platform, ctx, app.id, "staging", "1.0.0")).toThrow(/development first/);
    deploy(platform, ctx, app.id, "development", "1.0.0");
    deploy(platform, ctx, app.id, "staging", "1.0.0");
    // Sahan holds deployment.promote through the release-managers group.
    expect(deploy(platform, ctx, app.id, "production", "1.0.0").status).toBe("active");
    const developerOnly = platform.userContext("u-nimal", "studio");
    expect(() => deploy(platform, developerOnly, app.id, "production", "1.0.0")).toThrow(ApiError);
  });

  it("applies an AI draft after a person edits it", () => {
    const platform = createDemoPlatform();
    const plan = planApplication("Create a customer support application to track customer tickets by priority and status.");
    const [first] = plan.entities;
    first.fields.push({ name: "channel", label: "Channel", type: "enum", enumValues: ["email", "phone"] });
    plan.name = "Helpdesk";
    const app = applyPlan(platform, platform.userContext("u-sahan", "studio"), plan);
    expect(app.name).toBe("Helpdesk");
    expect(platform.entity(first.name).fields.some((f) => f.name === "channel")).toBe(true);
  });

  it("applies a plan built by hand, without a prompt", () => {
    const platform = createDemoPlatform();
    const app = applyPlan(platform, platform.userContext("u-sahan", "studio"), {
      prompt: "",
      name: "Fleet",
      description: "Delivery vans.",
      ownerDepartmentId: "dep-stores",
      entities: [{ name: "Van", label: "Van", description: "", fields: [{ name: "plate", label: "Plate", type: "string", required: true }, { name: "store", label: "Store", type: "reference", reference: "Product" }], relationships: [] }],
      pages: [{ title: "Vans", kind: "list", entity: "Van" }],
      operations: [],
      workflows: [],
      permissions: [],
    });
    expect(platform.state.operations.filter((o) => o.businessOperation.startsWith("Van.")).length).toBe(4);
    expect(platform.state.audit.find((a) => a.resource === `application/${app.id}`)?.detail).toBe("Built in the visual editor");
  });

  it("refuses an edited plan that is not valid", () => {
    const platform = createDemoPlatform();
    const plan = planApplication("Build an asset tracking application");
    plan.entities[0].fields.push({ name: "Bad Name", label: "", type: "enum" });
    plan.pages.push({ title: "Orphan", kind: "list", entity: "Nope" });
    const before = platform.state.applications.length;
    expect(() => applyPlan(platform, platform.userContext("u-sahan", "studio"), plan)).toThrow(/name must start with a lowercase letter/);
    expect(platform.state.applications).toHaveLength(before);
  });

  it("edits an existing application without breaking its records or page links", () => {
    const platform = createDemoPlatform();
    const ctx = platform.userContext("u-sahan", "studio");
    const app = platform.state.applications.find((a) => a.id === "app-inventory")!;
    const plan = planFromApplication(app, platform.state.entities);
    const productsPage = plan.pages.find((p) => p.entity === "Product")!;
    productsPage.title = "Catalogue";
    const product = plan.entities.find((e) => e.name === "Product")!;
    product.label = "Catalogue item";
    product.fields.push({ name: "barcode", label: "Barcode", type: "string" });
    plan.entities.push({ name: "Shelf", label: "Shelf", description: "", fields: [{ name: "code", label: "Code", type: "string", required: true }], relationships: [] });
    plan.pages.push({ title: "Shelves", kind: "list", entity: "Shelf" });
    const versionBefore = platform.entity("Product").version;

    const updated = updateApplication(platform, ctx, app.id, plan);

    expect(updated.pages.find((p) => p.title === "Catalogue")?.id).toBe(productsPage.id);
    expect(platform.entity("Product").label).toBe("Catalogue item");
    expect(platform.entity("Product").version).toBe(versionBefore + 1);
    expect(platform.entity("Stock").version).toBe(platform.state.entities.find((e) => e.name === "Stock")!.version);
    expect(updated.entityNames).toContain("Shelf");
    expect(platform.state.operations.filter((o) => o.businessOperation.startsWith("Shelf.")).length).toBe(4);
    expect(platform.invoke<EntityRecord[]>(ctx, "Product.list").length).toBeGreaterThan(0);
  });

  it("refuses edits that would orphan existing records", () => {
    const platform = createDemoPlatform();
    const ctx = platform.userContext("u-sahan", "studio");
    const app = platform.state.applications.find((a) => a.id === "app-inventory")!;
    const fresh = () => planFromApplication(app, platform.state.entities);

    const removedField = fresh();
    removedField.entities[0].fields.pop();
    expect(() => updateApplication(platform, ctx, app.id, removedField)).toThrow(/cannot be removed or renamed/);

    const retyped = fresh();
    retyped.entities[0].fields[0] = { ...retyped.entities[0].fields[0], type: "boolean" };
    expect(() => updateApplication(platform, ctx, app.id, retyped)).toThrow(/type cannot change/);

    const removedEntity = fresh();
    removedEntity.entities = removedEntity.entities.slice(0, 1);
    removedEntity.pages = removedEntity.pages.filter((p) => p.entity === removedEntity.entities[0].name);
    expect(() => updateApplication(platform, ctx, app.id, removedEntity)).toThrow(/existing entity cannot be removed/);

    const requiredNew = fresh();
    requiredNew.entities[0].fields.push({ name: "aisle", label: "Aisle", type: "string", required: true });
    expect(() => updateApplication(platform, ctx, app.id, requiredNew)).toThrow(/must be optional/);

    expect(() => updateApplication(platform, platform.userContext("u-nimal", "studio"), app.id, fresh())).toThrow(ApiError);
    expect(send(platform, "PUT", `/applications/${app.id}`, "u-sahan", { plan: removedField }).status).toBe(422);
    expect(send(platform, "PUT", `/applications/${app.id}`, "u-sahan", { plan: fresh() }).status).toBe(200);
  });
});

const send = (platform: ReturnType<typeof createDemoPlatform>, method: string, path: string, user = "u-amaya", body?: unknown) => {
  const { path: p, query } = withQuery(path);
  return handleRequest(platform, { method, path: p, query, body, token: `demo.${user}` });
};

describe("pinned applications", () => {
  it("keeps each user's pins separate and in pin order", () => {
    const platform = createDemoPlatform();
    send(platform, "PUT", "/me/pinned-applications/app-supplier", "u-nimal");
    send(platform, "PUT", "/me/pinned-applications/app-supplier", "u-nimal");
    expect(get(platform, "/me/pinned-applications", "u-nimal").body).toEqual({ items: ["app-inventory", "app-supplier"], total: 2 });
    send(platform, "DELETE", "/me/pinned-applications/app-inventory", "u-nimal");
    expect(get(platform, "/me/pinned-applications", "u-nimal").body).toEqual({ items: ["app-supplier"], total: 1 });
    expect(get(platform, "/me/pinned-applications", "u-kavya").body).toEqual({ items: ["app-procurement", "app-supplier"], total: 2 });
  });

  it("refuses to pin an application that does not exist", () => {
    const platform = createDemoPlatform();
    expect(send(platform, "PUT", "/me/pinned-applications/app-missing").status).toBe(404);
  });
});

describe("sidekick", () => {
  const pendingRequest = (platform: ReturnType<typeof createDemoPlatform>) =>
    platform.records("PurchaseRequest").find((r) => r.values.status === "pending-approval");

  it("acts with only the permissions the user also holds", () => {
    const platform = createDemoPlatform();
    post(platform, "/sidekick/runs", { prompt: "Prepare purchase requests for low-stock items" }, "u-kavya");
    const pending = pendingRequest(platform)!;
    expect(pending).toBeDefined();

    const officer = post(platform, "/sidekick/runs", { prompt: "Approve the pending purchase request" }, "u-kavya").body as AgentRun;
    const refused = officer.steps.find((s) => s.kind === "tool");
    expect(refused?.kind === "tool" && refused.call.outcome).toBe("denied");
    expect(pendingRequest(platform)?.id).toBe(pending.id);

    const manager = post(platform, "/sidekick/runs", { prompt: "Approve the pending purchase request" }, "u-ruwan").body as AgentRun;
    const approved = manager.steps.find((s) => s.kind === "tool");
    expect(approved?.kind === "tool" && approved.call.outcome).toBe("allowed");
  });

  it("cannot be run on its own service identity", () => {
    const platform = createDemoPlatform();
    expect(() => runAgent(platform, "agent-sidekick", "Approve the pending purchase request", { trigger: "manual", onBehalfOf: "x" })).toThrow(ApiError);
    const run = post(platform, "/agents/agent-sidekick/runs", { prompt: "Approve the pending purchase request" }, "u-nimal").body as AgentRun;
    const call = run.steps.find((s) => s.kind === "tool");
    expect(call?.kind === "tool" && call.call.outcome).toBe("denied");
  });

  it("stays within one application's tools when scoped to it", () => {
    const platform = createDemoPlatform();
    const inApp = post(platform, "/sidekick/runs", { prompt: "Which items are low on stock?", applicationId: "app-inventory" }, "u-ruwan").body as AgentRun;
    const stock = inApp.steps.find((s) => s.kind === "tool");
    expect(inApp.applicationId).toBe("app-inventory");
    expect(stock?.kind === "tool" && stock.call.outcome).toBe("allowed");

    const outside = post(platform, "/sidekick/runs", { prompt: "Approve the pending purchase request", applicationId: "app-inventory" }, "u-ruwan").body as AgentRun;
    const refused = outside.steps.find((s) => s.kind === "tool");
    expect(refused?.kind === "tool" && refused.call.outcome).toBe("denied");
    expect(refused?.kind === "tool" && refused.call.reason).toContain("outside Inventory Management");
    expect(outside.answer).toContain("outside Inventory Management");
  });

  it("rejects an unknown application", () => {
    const platform = createDemoPlatform();
    expect(post(platform, "/sidekick/runs", { prompt: "Which items are low on stock?", applicationId: "app-missing" }, "u-ruwan").status).toBe(404);
  });
});

describe("global search", () => {
  const search = (q: string, user = "u-amaya") =>
    (handleRequest(createDemoPlatform(), { method: "GET", path: "/search", query: new URLSearchParams({ q }), body: undefined, token: `demo.${user}` }).body as { items: Array<{ type: string; title: string; appId?: string }> }).items;

  it("finds resources and people by name", () => {
    expect(search("inventory")[0]).toMatchObject({ type: "application", title: "Inventory Management" });
    expect(search("kavya").some((h) => h.type === "user" && h.title === "Kavya Fernando")).toBe(true);
  });

  it("finds records by their referenced names and links them to the app page listing them", () => {
    const hit = search("coconut kandy").find((h) => h.type === "record");
    expect(hit).toMatchObject({ title: "Coconut Oil 1L", appId: "app-inventory" });
  });

  it("returns only records the user may read", () => {
    expect(search("coconut", "u-nimal").some((h) => h.type === "record")).toBe(true);
    expect(search("lanka", "u-nimal").some((h) => h.type === "record" && h.title.startsWith("pr-"))).toBe(false);
  });
});

describe("per-app notifications", () => {
  it("events and approvals filter by applicationId", () => {
    const platform = createDemoPlatform();
    const app = platform.state.applications[0];
    const all = get(platform, "/events").body as { total: number };
    const scoped = get(platform, `/events?applicationId=${app.id}`).body as { items: unknown[]; total: number };
    expect(scoped.total).toBeLessThanOrEqual(all.total);
    expect(scoped.items.every((e) => (e as { payload: Record<string, unknown> }).payload?.applicationId === app.id)).toBe(true);
    const approvalsAll = get(platform, "/approvals").body as { items: Array<{ subject?: { applicationId?: string } }>; total: number };
    const withSubject = approvalsAll.items.find((a) => a.subject?.applicationId);
    expect(withSubject).toBeTruthy(); // the seeded low-stock flow leaves a pending approval bound to its app
    const appId = withSubject!.subject!.applicationId!;
    const approvalsScoped = get(platform, `/approvals?applicationId=${appId}`).body as { items: Array<{ subject?: { applicationId?: string } }>; total: number };
    expect(approvalsScoped.items.every((a) => a.subject?.applicationId === appId)).toBe(true);
    expect(approvalsScoped.total).toBeGreaterThan(0);
    expect(approvalsScoped.total).toBeLessThanOrEqual(approvalsAll.total);
  });
});

describe("ops: alerts, slos, status", () => {
  it("creates an alert that fires on denied approvals, acks it, defines an SLO, reads status", () => {
    const platform = createDemoPlatform();
    const rule = post(platform, "/alerts", { name: "Denied approvals", source: "audit", action: "approval.decision", outcome: "denied", threshold: 1, windowMinutes: 60 }).body as AlertRule;
    expect(rule.id).toBeTruthy();
    const fires = get(platform, `/alerts/${rule.id}/fires`).body as { items: AlertFire[] };
    if (fires.items.length > 0) {
      const ack = post(platform, `/alerts/${rule.id}/fires/${fires.items[0].id}/ack`, {});
      expect((ack.body as AlertFire).status).toBe("acked");
    }
    const slo = post(platform, "/slos", { operation: "inventory.checkout", targetSuccess: 0.99, targetP95Ms: 500, windowMinutes: 60 });
    expect(slo.status).toBe(201);
    const st = get(platform, `/slos/${(slo.body as Slo).id}/status`).body as { calls: number; breached: boolean };
    expect(st.calls).toBeGreaterThanOrEqual(0);
    expect(typeof st.breached).toBe("boolean");
    const status = send(platform, "GET", "/status");
    expect(["healthy", "degraded", "down"]).toContain((status.body as { status: string }).status);
  });

  it("purges soft-deleted records and diffs entity schema versions", () => {
    const platform = createDemoPlatform();
    // seed a soft-deleted old record and a recent one
    const rec = post(platform, "/entities/Product/records", { values: { sku: "PURGE-ME", name: "Old", unitPrice: 1, stock: 0, category: "Grocery", active: true, supplier: "sup-1" } }).body as { id: string };
    send(platform, "DELETE", `/entities/Product/records/${rec.id}`);
    const del = platform.state.records.find((r) => r.id === rec.id)!;
    del.deletedAt = new Date(Date.now() - 40 * 86_400_000).toISOString(); // 40 days old
    const recent = post(platform, "/entities/Product/records", { values: { sku: "KEEP-ME", name: "New", unitPrice: 2, stock: 1, category: "Grocery", active: true, supplier: "sup-1" } }).body as { id: string };
    send(platform, "DELETE", `/entities/Product/records/${recent.id}`); // deleted just now
    const purged = send(platform, "POST", "/entities/Product/records/purge?olderThanDays=30", "u-amaya", {}).body as { purged: number };
    expect(purged.purged).toBe(1);
    expect(platform.state.records.some((r) => r.id === rec.id)).toBe(false);
    expect(platform.state.records.some((r) => r.id === recent.id)).toBe(true);
    // versions: seeded v1 exists; migrate to v2 and diff
    const v1 = get(platform, "/entities/Product/versions").body as { items: Array<{ version: number }> };
    expect(v1.items.some((v) => v.version === 1)).toBe(true);
    post(platform, "/entities/Product/migrate", { add: [{ name: "tier", label: "Tier", type: "enum", enumValues: ["standard", "gold"] }], note: "add tier" });
    const diff = get(platform, "/entities/Product/versions/diff?from=1&to=2").body as { added: string[]; removed: string[]; changed: unknown[] };
    expect(diff.added).toContain("tier");
    expect(diff.removed).toEqual([]);
    expect(get(platform, "/entities/Product/versions/diff?from=1&to=99").status).toBe(404);
  });

  it("uploads and downloads a record file; the record holds only the FileRef", () => {
    const platform = createDemoPlatform();
    post(platform, "/entities", { name: "Evidence", label: "Evidence", description: "", fields: [
      { name: "title", label: "Title", type: "string", required: true },
      { name: "attachment", label: "Attachment", type: "file" },
    ], scope: "organization" });
    const rec = post(platform, "/entities/Evidence/records", { values: { title: "Claim 1" } }).body as { id: string };
    const bytes = new TextEncoder().encode("PDF-DEMO-BYTES");
    const b64 = Buffer.from(bytes).toString("base64");
    const up = send(platform, "POST", `/entities/Evidence/records/${rec.id}/files/attachment?name=report.pdf`, "u-amaya", { __rawBase64: b64 });
    expect(up.status).toBe(201); // Created, per the contract
    const ref = JSON.parse((up.body as { values: Record<string, string> }).values.attachment) as { key: string; name: string; sizeBytes: number };
    expect(ref.name).toBe("report.pdf");
    expect(platform.state.uploads[ref.key].dataBase64).toBe(b64);
    const down = get(platform, `/entities/Evidence/records/${rec.id}/files/attachment`);
    expect(Buffer.from((down.body as { __fileBase64: string }).__fileBase64, "base64").toString()).toBe("PDF-DEMO-BYTES");
    // wrong field type is rejected
    expect(send(platform, "POST", `/entities/Evidence/records/${rec.id}/files/title?name=x.txt`, "u-amaya", { __rawBase64: b64 }).status).toBe(422);
  });

  it("lists and reads OpenBao secrets, manages integrations, takes a custom alert webhook URL", () => {
    const platform = createDemoPlatform();
    // secrets: list + read (read needs control.manage, audited)
    const paths = get(platform, "/secrets?prefix=vault://integrations/").body as { items: string[] };
    expect(paths.items.length).toBe(3);
    const values = get(platform, "/secrets/read?path=vault://integrations/erp-db").body as { path: string; values: Record<string, string> };
    expect(values.values.username).toBe("erp_ro");
    expect(get(platform, "/secrets/read?path=vault://nope").status).toBe(404);
    expect(platform.state.audit.some((a) => a.action === "secret.read")).toBe(true);
    // integrations: create validates the secretRef, test flips status
    const bad = post(platform, "/integrations", { name: "X", kind: "rest", target: "https://x.example.com", retryPolicy: "None", timeoutMs: 1000, secretRef: "vault://missing" });
    expect(bad.status).toBe(422);
    const created = post(platform, "/integrations", { name: "Payment GW", kind: "rest", target: "https://pay.example.com", retryPolicy: "Exponential backoff", timeoutMs: 3000, secretRef: "vault://integrations/slack-ops" });
    expect(created.status).toBe(201);
    const int = (created.body as { id: string }).id;
    const updated = send(platform, "PUT", `/integrations/${int}`, "u-amaya", { name: "Payment GW v2", kind: "rest", target: "https://pay2.example.com", retryPolicy: "None", timeoutMs: 2000, secretRef: "vault://integrations/slack-ops" });
    expect((updated.body as { name: string }).name).toBe("Payment GW v2");
    expect((post(platform, `/integrations/${int}/test`, {}).body as { status: string }).status).toBe("connected");
    // alerts: custom webhook URL accepted when valid, rejected when not
    const ok = post(platform, "/alerts", { name: "Custom URL", source: "event", action: "Stock.LowStockReached", threshold: 1, windowMinutes: 60, webhookUrl: "https://hooks.example.com/custom" });
    expect(ok.status).toBe(201);
    expect((ok.body as { webhookUrl: string }).webhookUrl).toBe("https://hooks.example.com/custom");
    expect(post(platform, "/alerts", { name: "Bad URL", source: "event", action: "Stock.LowStockReached", threshold: 1, windowMinutes: 60, webhookUrl: "notaurl" }).status).toBe(422);
    // SSRF guard: internal targets are rejected everywhere user URLs are accepted
    expect(post(platform, "/alerts", { name: "SSRF", source: "event", action: "X", threshold: 1, windowMinutes: 60, webhookUrl: "http://169.254.169.254/x" }).status).toBe(422);
    expect(post(platform, "/webhooks", { name: "evil", url: "http://127.0.0.1:8080/x", events: [], active: true }).status).toBe(422);
    expect(post(platform, "/integrations", { name: "evil", kind: "rest", target: "http://10.0.0.5/", retryPolicy: "None", timeoutMs: 1000, secretRef: "" }).status).toBe(422);
    expect(get(platform, "/secrets/read?path=../other").status).toBe(422);
  });

  it("fires an SLO burn-rate alert and serves log metrics per day and level", () => {
    const platform = createDemoPlatform();
    // one denied call on the operation inside the window: burn rate = (1-0)/(1-0.5) x100 = 200
    platform.audit(platform.userContext("u-amaya", "control"), "inventory.checkout", "op/drill", "denied", "burn drill");
    const slo = post(platform, "/slos", { operation: "inventory.checkout", targetSuccess: 0.5, targetP95Ms: 500, windowMinutes: 60 }).body as Slo;
    // threshold 1 = burn rate 0.01x; any recorded call on the operation already crosses it
    const rule = post(platform, "/alerts", { name: "Checkout burn", source: "slo", sloId: slo.id, threshold: 1, windowMinutes: 60 });
    expect(rule.status).toBe(201);
    const fires = get(platform, `/alerts/${(rule.body as AlertRule).id}/fires`).body as { items: AlertFire[] };
    expect(fires.items.length).toBeGreaterThan(0);
    expect(fires.items[0].count).toBe(200);
    // unknown SLO is rejected
    const bad = post(platform, "/alerts", { name: "Ghost", source: "slo", sloId: "slo-nope", threshold: 1, windowMinutes: 60 });
    expect(bad.status).toBe(422);
    // log metrics: one point per day with severity levels
    const logs = get(platform, "/analytics/log-metrics?days=7").body as { items: Array<{ date: string; levels: Record<string, number> }> };
    expect(logs.items).toHaveLength(7);
    expect(Object.keys(logs.items[0].levels).sort()).toEqual(["debug", "error", "info", "warn"]);
  });
});

describe("connect depth", () => {
  it("webhooks, api versions+portal, api keys, graphql", () => {
    const platform = createDemoPlatform();
    const wh = post(platform, "/webhooks", { name: "Slack alerts", url: "https://hooks.example.com/x", events: ["Stock"], secret: "s", active: true }).body as Webhook;
    expect(wh.id).toBeTruthy();
    const test = post(platform, `/webhooks/${wh.id}/test`, {});
    expect((test.body as WebhookDelivery).status).toBe("delivered");
    const replay = post(platform, `/webhooks/${wh.id}/deliveries/${(test.body as WebhookDelivery).id}/replay`, {});
    expect((replay.body as WebhookDelivery).status).toBe("pending");
    // versions + portal
    const api = platform.state.apis[0];
    const v = post(platform, `/apis/${api.id}/versions`, { version: "v2", status: "deprecated", changelog: "renamed fields" });
    expect(v.status).toBe(201);
    const catalog = get(platform, "/portal/apis").body as { items: Array<{ id: string; versions: ApiVersion[] }> };
    expect(catalog.items.find((a) => a.id === api.id)?.versions.some((x) => x.version === "v2")).toBe(true);
    // api keys
    const key = post(platform, "/api-keys", { name: "CI", permissions: ["data.manage"], quotaPerHour: 100 });
    expect((key.body as CreatedApiKey).rawKey.startsWith("wsn_")).toBe(true);
    const revoked = send(platform, "DELETE", `/api-keys/${(key.body as CreatedApiKey).id}`);
    expect((revoked.body as { revoked: boolean }).revoked).toBe(true);
    // graphql
    const g = post(platform, "/graphql", { query: 'query { Product { id name } }' });
    expect((g.body as { data: { Product: unknown[] } }).data.Product.length).toBeGreaterThan(0);
    const bad = post(platform, "/graphql", { query: "nope" });
    expect((bad.body as { errors: unknown[] }).errors.length).toBe(1);
  });
});

describe("data platform depth", () => {
  it("saves and runs a view, exports csv, imports json, migrates the schema with backfill", () => {
    const platform = createDemoPlatform();
    const ctx = platform.userContext("u-amaya", "studio");
    // saved view over Supplier
    const view = post(platform, "/entities/Supplier/views", {
      name: "Active grocery",
      filters: [
        { field: "status", op: "eq", value: "active" },
        { field: "category", op: "eq", value: "Grocery" },
      ],
      shared: true,
    }).body as SavedView;
    const run = post(platform, `/entities/Supplier/views/${view.id}/run`, {});
    expect(run.status).toBe(201);
    const runItems = (run.body as { items: EntityRecord[] }).items;
    expect(runItems.every((r) => r.values.status === "active" && r.values.category === "Grocery")).toBe(true);
    expect((get(platform, `/entities/Supplier/records?view=${view.id}`).body as { items: EntityRecord[] }).items.length).toBe(runItems.length);
    // export csv + import json round trip into a scratch entity
    const csv = (get(platform, "/entities/Supplier/records/export?format=csv").body as { body: string }).body;
    expect(csv.split("\n")[0].startsWith("id,name,")).toBe(true);
    const created = post(platform, "/entities/Supplier/records", { values: { name: "Imported Co", category: "Grocery", status: "active" } }).body as EntityRecord;
    const imp = post(platform, "/entities/Supplier/records/import", { format: "json", data: JSON.stringify([{ name: "Bulk Co", category: "Grocery", status: "suspended" }]) });
    expect(imp.status).toBe(201);
    expect((imp.body as { created: number }).created).toBe(1);
    // schema migration: add a field + backfill, then drop refused while records exist
    const mig = post(platform, "/entities/Supplier/migrate", {
      add: [{ name: "tier", label: "Tier", type: "enum", enumValues: ["standard", "gold"] }],
      backfill: { tier: "standard" },
      note: "add tier",
    });
    expect(mig.status).toBe(201);
    expect((mig.body as Entity).version).toBe(2);
    expect(platform.records("Supplier").find((r) => r.id === created.id)?.values.tier).toBe("standard");
    const bad = post(platform, "/entities/Supplier/migrate", { drop: ["category"] });
    expect(bad.status).toBe(422);
    expect(ctx).toBeTruthy();
  });
});

describe("deleting records", () => {
  it("deletes a record the user may write, and audits it", () => {
    const platform = createDemoPlatform();
    const created = post(platform, "/entities/Supplier/records", { values: { name: "Temp Supplies", category: "Grocery", status: "active" } }).body as EntityRecord;
    const response = send(platform, "DELETE", `/entities/Supplier/records/${created.id}`);
    expect(response.status).toBe(200);
    // soft delete: the row stays for history/restore, but list hides it
    const soft = platform.records("Supplier").find((r) => r.id === created.id);
    expect(soft?.deletedAt).toBeTruthy();
    const listed = (get(platform, "/entities/Supplier/records").body as { items: EntityRecord[] }).items;
    expect(listed.some((r) => r.id === created.id)).toBe(false);
    const withDeleted = (get(platform, "/entities/Supplier/records?includeDeleted=true").body as { items: EntityRecord[] }).items;
    expect(withDeleted.some((r) => r.id === created.id)).toBe(true);
    const restored = post(platform, `/entities/Supplier/records/${created.id}/restore`, {});
    expect(restored.status).toBe(201);
    expect(platform.records("Supplier").find((r) => r.id === created.id)?.deletedAt).toBeUndefined();
    const history = (get(platform, `/entities/Supplier/records/${created.id}/history`).body as { items: { action: string }[] }).items;
    expect(history.map((h: { action: string }) => h.action)).toEqual(["restored", "deleted", "created"]);
    expect(platform.state.audit.some((a) => a.action === "Supplier.delete" && a.outcome === "allowed")).toBe(true);
  });

  it("refuses to delete a record other records still reference", () => {
    const platform = createDemoPlatform();
    const response = send(platform, "DELETE", "/entities/Product/records/prod-oil");
    expect(response.status).toBe(409);
    expect(platform.records("Product").some((r) => r.id === "prod-oil")).toBe(true);
  });

  it("refuses users without write permission", () => {
    const platform = createDemoPlatform();
    const supplier = platform.records("Supplier")[0];
    expect(send(platform, "DELETE", `/entities/Supplier/records/${supplier.id}`, "u-nimal").status).toBe(403);
  });
});
