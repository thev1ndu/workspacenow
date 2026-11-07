import { describe, expect, it } from "vitest";
import { ApiError, planFromApplication, type AgentRun, type EntityRecord, type WorkflowDefinition } from "@workspacenow/types";
import { runAgent } from "./agents";
import { handleRequest } from "./router";
import { createDemoPlatform } from "./runtime";
import { applyPlan, createRelease, deploy, planApplication, planApplicationEdit, updateApplication } from "./studio";
import { decideApproval, runManually, saveWorkflow } from "./workflows";

const get = (platform: ReturnType<typeof createDemoPlatform>, path: string, user = "u-amaya") =>
  handleRequest(platform, { method: "GET", path, query: new URLSearchParams(), body: undefined, token: `demo.${user}` });

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

const send = (platform: ReturnType<typeof createDemoPlatform>, method: string, path: string, user = "u-amaya", body?: unknown) =>
  handleRequest(platform, { method, path, query: new URLSearchParams(), body, token: `demo.${user}` });

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

describe("deleting records", () => {
  it("deletes a record the user may write, and audits it", () => {
    const platform = createDemoPlatform();
    const created = post(platform, "/entities/Supplier/records", { values: { name: "Temp Supplies", category: "Grocery", status: "active" } }).body as EntityRecord;
    const response = send(platform, "DELETE", `/entities/Supplier/records/${created.id}`);
    expect(response.status).toBe(200);
    expect(platform.records("Supplier").some((r) => r.id === created.id)).toBe(false);
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
