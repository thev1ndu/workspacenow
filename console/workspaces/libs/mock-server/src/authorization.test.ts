import { describe, expect, it } from "vitest";
import type { AgentRun, Approval, CreatedApiKey, Integration, Permission, SavedView, Webhook, Workflow, WorkflowDefinition } from "@workspacenow/types";
import { handleRequest } from "./router";
import { createDemoPlatform } from "./runtime";
import { decideApproval, runManually, saveWorkflow } from "./workflows";

// Personas: u-amaya admin, u-sahan developer and release, u-nimal store, u-kavya officer, u-ruwan approver, u-dilini auditor.

type Demo = ReturnType<typeof createDemoPlatform>;

const call = (platform: Demo, method: string, path: string, user: string, body?: unknown) => {
  const [p, q] = path.split("?");
  return handleRequest(platform, { method, path: p, query: new URLSearchParams(q ?? ""), body, token: `demo.${user}` });
};
const get = (platform: Demo, path: string, user: string) => call(platform, "GET", path, user);
const status = (platform: Demo, path: string, user: string) => get(platform, path, user).status;
const items = <T>(platform: Demo, path: string, user: string) => (get(platform, path, user).body as { items: T[] }).items;

/** Adds a user who holds exactly the given roles, plus those roles when they are new. */
function addUser(platform: Demo, id: string, roles: Array<{ id: string; permissions: string[] }>): void {
  for (const r of roles) {
    if (!platform.state.roles.some((x) => x.id === r.id)) {
      platform.state.roles.push({ id: r.id, name: r.id, description: "", permissions: r.permissions as Permission[] });
    }
  }
  platform.state.users.push({ id, name: id, email: `${id}@example.com`, title: "Test", departmentId: "dep-it", teamId: "team-platform", groups: [], roleIds: roles.map((r) => r.id) });
}

describe("AI reads (rule 1)", () => {
  it("guards model providers and agents by any of their reader permissions", () => {
    const platform = createDemoPlatform();
    expect(status(platform, "/model-providers", "u-nimal")).toBe(403);
    expect(status(platform, "/model-providers", "u-dilini")).toBe(200);
    expect(status(platform, "/model-providers", "u-sahan")).toBe(200);
    expect(status(platform, "/agents", "u-kavya")).toBe(403);
    expect(status(platform, "/agents", "u-dilini")).toBe(200);
    expect(status(platform, "/agents/agent-inventory", "u-nimal")).toBe(403);
    expect(status(platform, "/agents/agent-inventory", "u-sahan")).toBe(200);
    addUser(platform, "u-flow", [{ id: "role-flow", permissions: ["flow.manage"] }]);
    expect(status(platform, "/agents", "u-flow")).toBe(200);
    expect(status(platform, "/model-providers", "u-flow")).toBe(403);
  });

  it("treats a wildcard role as holding every permission", () => {
    const platform = createDemoPlatform();
    addUser(platform, "u-root", [{ id: "role-root", permissions: ["*"] }]);
    expect(status(platform, "/agents", "u-root")).toBe(200);
    expect(status(platform, "/audit", "u-root")).toBe(200);
  });
});

describe("agent run history (rule 2)", () => {
  it("shows people without ai.manage or audit.read only the runs they started", () => {
    const platform = createDemoPlatform();
    const runs = items<AgentRun & { userId?: string }>(platform, "/agent-runs", "u-dilini");
    const kavyaRun = runs.find((r) => r.userId === "u-kavya")!;
    const nimalRun = runs.find((r) => r.userId === "u-nimal")!;
    expect(kavyaRun).toBeDefined();
    expect(nimalRun).toBeDefined();

    const own = items<AgentRun & { userId?: string }>(platform, "/agent-runs", "u-nimal");
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((r) => r.userId === "u-nimal")).toBe(true);
    expect(status(platform, `/agent-runs/${kavyaRun.id}`, "u-nimal")).toBe(404);
    expect(status(platform, `/agent-runs/${kavyaRun.id}`, "u-kavya")).toBe(200);
    expect(status(platform, `/agent-runs/${kavyaRun.id}`, "u-sahan")).toBe(200);
  });

  it("records who started each new run", () => {
    const platform = createDemoPlatform();
    const run = call(platform, "POST", "/sidekick/runs", "u-kavya", { prompt: "Which items are low on stock?" }).body as AgentRun & { userId?: string };
    expect(run.userId).toBe("u-kavya");
    expect(items<AgentRun>(platform, "/agent-runs", "u-kavya").some((r) => r.id === run.id)).toBe(true);
    expect(items<AgentRun>(platform, "/agent-runs", "u-ruwan").some((r) => r.id === run.id)).toBe(false);
  });
});

describe("running an agent on its own identity (rule 3)", () => {
  it("needs ai.manage or every permission the agent holds", () => {
    const platform = createDemoPlatform();
    const prompt = { prompt: "Which suppliers do we use?" };
    const refused = call(platform, "POST", "/agents/agent-procurement/runs", "u-nimal", prompt);
    expect(refused.status).toBe(403);
    expect(platform.state.audit.some((a) => a.action === "agent.run" && a.outcome === "denied" && a.actor.id === "u-nimal")).toBe(true);
    expect(call(platform, "POST", "/agents/agent-procurement/runs", "u-kavya", prompt).status).toBe(201);
    expect(call(platform, "POST", "/agents/agent-procurement/runs", "u-sahan", prompt).status).toBe(201);
    // agents that act as the caller narrow to the caller's permissions instead
    expect(call(platform, "POST", "/agents/agent-sidekick/runs", "u-nimal", prompt).status).toBe(201);
  });
});

describe("editing an agent (rule 4)", () => {
  it("refuses permissions the editor does not hold", () => {
    const platform = createDemoPlatform();
    const refused = call(platform, "PATCH", "/agents/agent-inventory", "u-sahan", { permissions: ["inventory.read", "inventory.write"] });
    expect(refused.status).toBe(403);
    expect(platform.state.agents.find((a) => a.id === "agent-inventory")!.permissions).toEqual(["inventory.read"]);
    const ok = call(platform, "PATCH", "/agents/agent-inventory", "u-sahan", { permissions: ["inventory.read", "supplier.read"] });
    expect(ok.status).toBe(200);
    expect(call(platform, "PATCH", "/agents/agent-inventory", "u-amaya", { permissions: ["inventory.read", "inventory.write"] }).status).toBe(200);
  });
});

describe("sidekick in an application (rule 5)", () => {
  it("needs the permission of at least one of the application's tools", () => {
    const platform = createDemoPlatform();
    addUser(platform, "u-release", [{ id: "role-release", permissions: [] }]);
    const prompt = { prompt: "Which items are low on stock?", applicationId: "app-inventory" };
    expect(call(platform, "POST", "/sidekick/runs", "u-release", prompt).status).toBe(403);
    expect(call(platform, "POST", "/sidekick/runs", "u-release", { prompt: prompt.prompt }).status).toBe(201);
    expect(call(platform, "POST", "/sidekick/runs", "u-nimal", prompt).status).toBe(201);
  });
});

describe("identity reads (rule 6)", () => {
  it("guards users, groups, mappings and roles", () => {
    const platform = createDemoPlatform();
    for (const path of ["/users", "/groups", "/group-mappings"]) {
      expect(status(platform, path, "u-nimal"), path).toBe(403);
      expect(status(platform, path, "u-sahan"), path).toBe(200);
      expect(status(platform, path, "u-dilini"), path).toBe(200);
      expect(status(platform, path, "u-amaya"), path).toBe(200);
    }
    expect(status(platform, "/roles", "u-nimal")).toBe(403);
    expect(status(platform, "/roles", "u-dilini")).toBe(200);
    addUser(platform, "u-flow", [{ id: "role-flow", permissions: ["flow.manage"] }]);
    addUser(platform, "u-ai", [{ id: "role-ai", permissions: ["ai.manage"] }]);
    expect(status(platform, "/roles", "u-flow")).toBe(200);
    expect(status(platform, "/roles", "u-ai")).toBe(200);
    expect(status(platform, "/users", "u-flow")).toBe(403);
  });
});

describe("role grants (rule 7)", () => {
  it("needs the granter to hold every permission of each newly granted role", () => {
    const platform = createDemoPlatform();
    addUser(platform, "u-access", [{ id: "role-access", permissions: ["control.manage"] }]);
    expect(call(platform, "PUT", "/users/u-nimal/roles", "u-access", { roles: ["role-auditor"] }).status).toBe(403);
    expect(platform.state.audit.some((a) => a.action === "role.grant" && a.outcome === "denied")).toBe(true);
    // a role the user already holds is not a new grant
    expect(call(platform, "PUT", "/users/u-access/roles", "u-access", { roles: ["role-access"] }).status).toBe(200);
    expect(call(platform, "PUT", "/users/u-nimal/roles", "u-amaya", { roles: ["role-auditor"] }).status).toBe(200);

    const mappings = platform.state.groupMappings.map((m) => ({ ...m }));
    expect(call(platform, "PUT", "/group-mappings", "u-access", { mappings: [...mappings, { group: "store-staff", roleId: "role-auditor" }] }).status).toBe(403);
    expect(call(platform, "PUT", "/group-mappings", "u-access", { mappings }).status).toBe(200);

    // joining a group mapped to roles is a grant too; leaving one is not
    expect(call(platform, "PUT", "/groups/grp-admins", "u-access", { name: "workspacenow-admins", memberIds: ["u-amaya", "u-nimal"] }).status).toBe(403);
    expect(call(platform, "PUT", "/groups/grp-admins", "u-access", { name: "workspacenow-admins", memberIds: ["u-amaya"] }).status).toBe(200);
    expect(call(platform, "POST", "/groups", "u-access", { name: "store-staff", memberIds: ["u-kavya"] }).status).toBe(403);
    expect(call(platform, "POST", "/groups", "u-access", { name: "unmapped", memberIds: ["u-kavya"] }).status).toBe(201);
  });

  it("keeps the last user who explicitly holds the wildcard role", () => {
    const platform = createDemoPlatform();
    platform.state.roles.push({ id: "role-root", name: "Root", description: "", permissions: ["*" as Permission] });
    platform.state.users.find((u) => u.id === "u-amaya")!.roleIds = ["role-root"];
    // holding role-admin is not holding "*", so it cannot hand out the wildcard role
    addUser(platform, "u-admin2", [{ id: "role-admin", permissions: [] }]);
    expect(call(platform, "PUT", "/users/u-sahan/roles", "u-admin2", { roles: ["role-root"] }).status).toBe(403);

    const last = call(platform, "PUT", "/users/u-amaya/roles", "u-amaya", { roles: [] });
    expect(last.status).toBe(409);
    expect((last.body as { code: string }).code).toBe("INVALID_STATE");
    expect(call(platform, "PUT", "/users/u-sahan/roles", "u-amaya", { roles: ["role-root"] }).status).toBe(200);
    expect(call(platform, "PUT", "/users/u-amaya/roles", "u-amaya", { roles: [] }).status).toBe(200);
  });
});

describe("flow reads, approvals and workflow permissions (rule 8)", () => {
  const gate = (): WorkflowDefinition => ({
    name: "Gate",
    description: "",
    trigger: { kind: "manual" },
    steps: [{ id: "ok", kind: "approval", name: "Sign off", permission: "procurement.approve", description: "Check it", next: null }],
  });

  it("guards workflows and executions by flow.manage or audit.read", () => {
    const platform = createDemoPlatform();
    const exec = platform.state.executions[0];
    for (const path of ["/workflows", "/workflows/wf-low-stock", "/executions", `/executions/${exec.id}`]) {
      expect(status(platform, path, "u-nimal"), path).toBe(403);
      expect(status(platform, path, "u-dilini"), path).toBe(200);
      expect(status(platform, path, "u-sahan"), path).toBe(200);
    }
  });

  it("records the requester, filters approvals to what a person may see, and refuses self-decisions", () => {
    const platform = createDemoPlatform();
    call(platform, "POST", "/business-operations/invoke", "u-nimal", { operation: "inventory.recordSale", input: { stockId: "stk-rice-cmb", quantity: 8 } });
    const pending = platform.state.approvals.find((a) => a.status === "pending") as Approval & { requestedBy?: string; requestedByName?: string };
    expect(pending.requestedBy).toBe("u-nimal");
    expect(pending.requestedByName).toBe("Nimal Silva");

    const seen = (user: string) => items<Approval>(platform, "/approvals", user).map((a) => a.id);
    expect(seen("u-nimal")).toContain(pending.id); // requested it
    expect(seen("u-ruwan")).toContain(pending.id); // may decide it
    expect(seen("u-kavya")).not.toContain(pending.id);
    expect(seen("u-dilini")).toContain(pending.id);

    const admin = platform.userContext("u-amaya", "control");
    const workflow = saveWorkflow(platform, admin, undefined, gate());
    workflow.status = "active";
    const execution = runManually(platform, "u-amaya", workflow.id, {});
    const own = platform.state.approvals.find((a) => a.executionId === execution.id)!;
    expect(call(platform, "POST", `/approvals/${own.id}/decision`, "u-amaya", { decision: "approved" }).status).toBe(403);
    expect(() => decideApproval(platform, "u-amaya", own.id, "approved", "")).toThrow(/someone else/);
    expect(call(platform, "POST", `/approvals/${own.id}/decision`, "u-ruwan", { decision: "approved" }).status).toBe(201);
  });

  it("needs every permission the workflow's operations use, to save it and to start it", () => {
    const platform = createDemoPlatform();
    const definition: WorkflowDefinition = {
      name: "Auto sale",
      description: "",
      trigger: { kind: "manual" },
      steps: [{ id: "sell", kind: "operation", name: "Sell", businessOperation: "inventory.recordSale" }],
    };
    const workflow = saveWorkflow(platform, platform.userContext("u-amaya", "control"), undefined, definition);
    workflow.status = "active";
    // the earlier version already held inventory.write, but Sahan still may not save one needing it
    const renamed = call(platform, "PATCH", `/workflows/${workflow.id}`, "u-sahan", { definition: { ...definition, name: "Renamed" } });
    expect(renamed.status).toBe(403);
    expect((platform.state.workflows.find((w) => w.id === workflow.id) as Workflow).name).toBe("Auto sale");
    expect(call(platform, "POST", `/workflows/${workflow.id}/executions`, "u-sahan", { input: { stockId: "stk-rice-cmb", quantity: 1 } }).status).toBe(403);
    expect(call(platform, "POST", `/workflows/${workflow.id}/executions`, "u-amaya", { input: { stockId: "stk-rice-cmb", quantity: 1 } }).status).toBe(201);
  });
});

describe("observability reads (rule 9)", () => {
  it("guards events, resources, alerts and SLOs, and keeps overview, analytics and health open", () => {
    const platform = createDemoPlatform();
    const rule = call(platform, "POST", "/alerts", "u-amaya", { name: "Denied", source: "audit", action: "x", threshold: 1, windowMinutes: 60 }).body as { id: string };
    const slo = call(platform, "POST", "/slos", "u-amaya", { operation: "inventory.checkout", targetSuccess: 0.99, targetP95Ms: 500, windowMinutes: 60 }).body as { id: string };
    expect(status(platform, "/events", "u-nimal")).toBe(403);
    expect(status(platform, "/events", "u-sahan")).toBe(200);
    expect(status(platform, "/events", "u-dilini")).toBe(200);
    for (const path of ["/resources", "/alerts", `/alerts/${rule.id}/fires`, "/slos", `/slos/${slo.id}/status`]) {
      expect(status(platform, path, "u-nimal"), path).toBe(403);
      expect(status(platform, path, "u-dilini"), path).toBe(200);
      expect(status(platform, path, "u-amaya"), path).toBe(200);
    }
    for (const path of ["/overview", "/analytics/activity?days=7", "/analytics/tokens?days=7", "/analytics/entry-points", "/health"]) {
      expect(status(platform, path, "u-nimal"), path).toBe(200);
    }
  });
});

describe("search visibility (rule 10)", () => {
  it("returns each kind of hit only to people its list endpoint serves", () => {
    const platform = createDemoPlatform();
    const kinds = (user: string) => new Set(items<{ type: string }>(platform, "/search?q=a&limit=1000", user).map((h) => h.type));
    const store = kinds("u-nimal");
    for (const type of ["mcp-server", "integration", "agent", "workflow", "user"]) expect(store.has(type), type).toBe(false);
    expect(store.has("record")).toBe(true);
    const auditor = kinds("u-dilini");
    for (const type of ["agent", "workflow", "user"]) expect(auditor.has(type), type).toBe(true);
    for (const type of ["mcp-server", "integration"]) expect(auditor.has(type), type).toBe(false);
    const developer = kinds("u-sahan");
    for (const type of ["mcp-server", "integration", "agent", "workflow", "user"]) expect(developer.has(type), type).toBe(true);
  });
});

describe("graphql (rule 11)", () => {
  it("answers fields the caller may read and returns an error entry for the rest", () => {
    const platform = createDemoPlatform();
    const perms = platform.permissionsForUser("u-nimal");
    const readable = platform.state.entities.find((e) => perms.has(e.readPermission))!;
    const denied = platform.state.entities.find((e) => !perms.has(e.readPermission))!;
    const res = call(platform, "POST", "/graphql", "u-nimal", { query: `query { ${readable.name} { id } ${denied.name} { id } }` });
    expect(res.status).toBe(201);
    const body = res.body as { data: Record<string, unknown[]>; errors?: Array<{ message: string }> };
    expect(body.data[readable.name].length).toBeGreaterThan(0);
    expect(body.data[denied.name]).toBeUndefined();
    expect(body.errors).toHaveLength(1);
    expect(body.errors![0].message).toContain(denied.readPermission);
    const both = call(platform, "POST", "/graphql", "u-amaya", { query: `query { ${readable.name} { id } ${denied.name} { id } }` }).body as { data: Record<string, unknown[]>; errors?: unknown[] };
    expect(both.errors).toBeUndefined();
    expect(Object.keys(both.data)).toEqual([readable.name, denied.name]);
  });
});

describe("connect reads and credential redaction (rule 12)", () => {
  it("needs connect.manage and masks stored tokens and secrets without changing them", () => {
    const platform = createDemoPlatform();
    for (const path of ["/integrations", "/webhooks", "/api-keys"]) {
      expect(status(platform, path, "u-nimal"), path).toBe(403);
      expect(status(platform, path, "u-dilini"), path).toBe(403);
      expect(status(platform, path, "u-sahan"), path).toBe(200);
    }
    const stored = platform.state.integrations[0];
    stored.auth = { type: "bearer", token: "real-token", refreshToken: "real-refresh" } as Integration["auth"];
    const listed = items<Integration>(platform, "/integrations", "u-amaya").find((i) => i.id === stored.id)!;
    expect(listed.auth?.token).toBe("********");
    expect((listed.auth as { refreshToken?: string }).refreshToken).toBe("********");
    expect(stored.auth?.token).toBe("real-token");

    const created = call(platform, "POST", "/webhooks", "u-amaya", { name: "Hook", url: "https://hooks.example.com/x", events: [], secret: "signing", active: true }).body as Webhook;
    expect(created.secret).toBe("signing");
    expect(items<Webhook>(platform, "/webhooks", "u-amaya").find((w) => w.id === created.id)!.secret).toBe("********");
    expect(platform.state.webhooks.find((w) => w.id === created.id)!.secret).toBe("signing");
  });
});

describe("api keys (rule 13)", () => {
  it("refuses permissions the creator lacks, validates expiry and records the owner", () => {
    const platform = createDemoPlatform();
    expect(call(platform, "POST", "/api-keys", "u-sahan", { name: "CI", permissions: ["inventory.write"] }).status).toBe(403);
    expect(call(platform, "POST", "/api-keys", "u-sahan", { name: "CI", permissions: ["inventory.read"], expiresAt: "2001-01-01T00:00:00Z" }).status).toBe(422);
    expect(call(platform, "POST", "/api-keys", "u-sahan", { name: "CI", permissions: ["inventory.read"], expiresAt: "not a date" }).status).toBe(422);
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const created = call(platform, "POST", "/api-keys", "u-sahan", { name: "CI", permissions: ["inventory.read"], expiresAt: future });
    expect(created.status).toBe(201);
    const key = created.body as CreatedApiKey & { ownerId?: string; expiresAt?: string };
    expect(key.ownerId).toBe("u-sahan");
    expect(key.expiresAt).toBe(future);
    const listed = items<CreatedApiKey & { ownerId?: string }>(platform, "/api-keys", "u-sahan").find((k) => k.id === key.id)!;
    expect(listed.ownerId).toBe("u-sahan");
    expect(call(platform, "POST", "/api-keys", "u-sahan", { name: "No expiry", permissions: [] }).status).toBe(201);
  });
});

describe("secret reads (rule 14)", () => {
  it("serves only integration credentials, except to the local system user", () => {
    const platform = createDemoPlatform();
    platform.state.secrets["vault://platform/database"] = { password: "demo-not-real" };
    expect(status(platform, "/secrets/read?path=vault://integrations/erp-db", "u-amaya")).toBe(200);
    expect(status(platform, "/secrets/read?path=vault://platform/database", "u-amaya")).toBe(403);
    expect(status(platform, "/secrets/read?path=vault://integrations/../platform/database", "u-amaya")).toBe(403);
    expect(status(platform, "/secrets/read?path=vault://integrations/erp-db", "u-nimal")).toBe(403);
    addUser(platform, "local:admin", [{ id: "role-admin", permissions: [] }]);
    expect(status(platform, "/secrets/read?path=vault://platform/database", "local:admin")).toBe(200);
  });
});

describe("business operation entry points (rule 15)", () => {
  it("accepts only an omitted, studio or api entry point", () => {
    const platform = createDemoPlatform();
    const invoke = (entryPoint?: string) =>
      call(platform, "POST", "/business-operations/invoke", "u-amaya", { operation: "Supplier.list", input: {}, ...(entryPoint === undefined ? {} : { entryPoint }) }).status;
    expect(invoke()).toBe(201);
    expect(invoke("studio")).toBe(201);
    expect(invoke("api")).toBe(201);
    for (const forged of ["mcp", "agent", "workflow", "control"]) expect(invoke(forged), forged).toBe(422);
  });
});

describe("saved views (rule 16)", () => {
  it("lets owners change their own views and others only shared views with data.manage", () => {
    const platform = createDemoPlatform();
    const create = (shared: boolean) =>
      call(platform, "POST", "/entities/Supplier/views", "u-kavya", { name: shared ? "Shared" : "Mine", filters: [], shared }).body as SavedView;
    const mine = create(false);
    const shared = create(true);
    const edit = (view: SavedView, user: string) => call(platform, "PUT", `/entities/Supplier/views/${view.id}`, user, { name: "Edited", filters: [], shared: view.shared }).status;

    expect(edit(mine, "u-amaya")).toBe(404);
    expect(edit(mine, "u-kavya")).toBe(200);
    expect(edit(shared, "u-nimal")).toBe(403);
    expect(edit(shared, "u-amaya")).toBe(200);
    expect(call(platform, "DELETE", `/entities/Supplier/views/${mine.id}`, "u-nimal").status).toBe(404);
    expect(call(platform, "DELETE", `/entities/Supplier/views/${shared.id}`, "u-nimal").status).toBe(403);
    expect(call(platform, "DELETE", `/entities/Supplier/views/${mine.id}`, "u-kavya").status).toBe(200);
    expect(call(platform, "DELETE", `/entities/Supplier/views/${shared.id}`, "u-amaya").status).toBe(200);
  });
});
