import {
  ApiError,
  type ApplicationPlan,
  type AuditRecord,
  type Entity,
  type EntityField,
  type EntryPoint,
  type EnvironmentKey,
  type FieldValue,
  type GroupRoleMapping,
  type HealthSignal,
  type McpServer,
  type OverviewStats,
  type Permission,
  type ResourceSummary,
  type Session,
  type Trace,
  type TraceSummary,
  type WorkflowDefinition,
} from "@workspacenow/types";
import { runAgent } from "./agents";
import { activitySeries, entryPointBreakdown, tokenSeries } from "./analytics";
import { listMcpTools } from "./mcp";
import { fail, type ExecutionContext, type Platform } from "./platform";
import { search } from "./search";
import { applyPlan, createRelease, deploy, planApplication, updateApplication } from "./studio";
import { decideApproval, runManually, saveWorkflow } from "./workflows";

export interface MockRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  token?: string;
}

export interface MockResponse {
  status: number;
  body: unknown;
}

interface RouteContext {
  platform: Platform;
  userId: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  ctx: (entryPoint?: EntryPoint) => ExecutionContext;
}

type Handler = (r: RouteContext) => unknown;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
  public?: boolean;
}

const routes: Route[] = [];

function route(method: string, path: string, handler: Handler, options: { public?: boolean } = {}) {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:(\w+)/g, (_m, key: string) => {
      keys.push(key);
      return "([^/]+)";
    })}$`,
  );
  routes.push({ method, pattern, keys, handler, public: options.public });
}

const list = <T>(items: T[]) => ({ items, total: items.length });

/** Server-side paging for list endpoints: limit (default 50, max 200) + offset, total kept. */
const page = <T>(items: T[], query: URLSearchParams) => {
  const limit = Math.min(Math.max(Number(query.get("limit") ?? 50), 1), 200);
  const offset = Math.max(Number(query.get("offset") ?? 0), 0);
  return { items: items.slice(offset, offset + limit), total: items.length };
};

function find<T extends { id: string }>(items: T[], id: string, label: string): T {
  const item = items.find((i) => i.id === id);
  if (!item) fail(404, "NOT_FOUND", `${label} ${id} not found`);
  return item;
}

function session(platform: Platform, userId: string): Session {
  const user = platform.state.users.find((u) => u.id === userId)!;
  return {
    actor: { kind: "user", id: user.id, name: user.name },
    permissions: [...platform.permissionsForUser(user.id)],
    roles: platform.rolesForUser(user.id).map((r) => r.name),
  };
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function traceSummaries(platform: Platform): TraceSummary[] {
  const byTrace = new Map<string, AuditRecord[]>();
  for (const record of platform.state.audit) {
    const group = byTrace.get(record.traceId) ?? [];
    group.push(record);
    byTrace.set(record.traceId, group);
  }
  return [...byTrace.entries()]
    .map(([traceId, records]) => ({
      traceId,
      title: `${records[0].actor.name}: ${records[0].action}`,
      startedAt: records[0].time,
      endedAt: records[records.length - 1].time,
      spanCount: records.length,
      denied: records.filter((r) => r.outcome === "denied").length,
      actors: [...new Set(records.map((r) => r.actor.name))],
    }))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/* Session and overview */

route("GET", "/session", ({ platform, userId }) => session(platform, userId));

route("GET", "/overview", ({ platform }): OverviewStats => {
  const s = platform.state;
  const today = s.audit.filter((a) => isToday(a.time));
  return {
    applications: s.applications.length,
    entities: s.entities.length,
    records: s.records.length,
    apis: s.apis.length,
    mcpTools: listMcpTools(platform).length,
    agents: s.agents.length,
    workflows: s.workflows.length,
    pendingApprovals: s.approvals.filter((a) => a.status === "pending").length,
    auditToday: today.length,
    deniedToday: today.filter((a) => a.outcome === "denied").length,
  };
});

route("GET", "/resources", ({ platform }) => {
  const s = platform.state;
  const dept = (id: string) => s.departments.find((d) => d.id === id)?.name ?? id;
  const appName = (id?: string) => s.applications.find((a) => a.id === id)?.name ?? "Organization";
  const items: ResourceSummary[] = [
    ...s.applications.map((a) => ({ id: a.id, type: "application" as const, name: a.name, workspace: "studio" as const, owner: dept(a.ownerDepartmentId), lifecycle: a.lifecycle, updatedAt: a.updatedAt })),
    ...s.entities.map((e) => ({ id: e.name, type: "entity" as const, name: e.label, workspace: "data" as const, owner: appName(e.ownerApplicationId), lifecycle: e.lifecycle, updatedAt: e.updatedAt })),
    ...s.apis.map((a) => ({ id: a.id, type: "api" as const, name: a.name, workspace: "connect" as const, owner: appName(a.applicationId), lifecycle: a.lifecycle, updatedAt: s.applications.find((x) => x.id === a.applicationId)?.updatedAt ?? "" })),
    ...s.mcpServers.map((m) => ({ id: m.id, type: "mcp-server" as const, name: m.name, workspace: "connect" as const, owner: m.kind === "managed" ? "Platform" : "External", lifecycle: m.status, updatedAt: m.registeredAt })),
    ...s.integrations.map((i) => ({ id: i.id, type: "integration" as const, name: i.name, workspace: "connect" as const, owner: "Platform Engineering", lifecycle: i.status, updatedAt: i.lastTestedAt ?? "" })),
    ...s.agents.map((a) => ({ id: a.id, type: "agent" as const, name: a.name, workspace: "ai" as const, owner: dept(a.ownerDepartmentId), lifecycle: a.status, updatedAt: "" })),
    ...s.workflows.map((w) => ({ id: w.id, type: "workflow" as const, name: w.name, workspace: "flow" as const, owner: appName(w.applicationId), lifecycle: w.status, updatedAt: "" })),
  ];
  return list(items);
});

route("GET", "/search", ({ platform, ctx, query }) => list(search(platform, ctx(), query.get("q") ?? "", Number(query.get("limit") ?? 30))));

route("GET", "/analytics/activity", ({ platform, query }) => list(activitySeries(platform, Number(query.get("days") ?? 14))));
route("GET", "/analytics/tokens", ({ platform, query }) => list(tokenSeries(platform, Number(query.get("days") ?? 14))));
route("GET", "/analytics/entry-points", ({ platform }) => list(entryPointBreakdown(platform)));

/* Control: organization and access */

route("GET", "/organization", ({ platform }) => platform.state.organization);
route("GET", "/departments", ({ platform }) => list(platform.state.departments));
route("GET", "/teams", ({ platform }) => list(platform.state.teams));
route("GET", "/users", ({ platform }) =>
  list(platform.state.users.map((u) => ({ ...u, roles: platform.rolesForUser(u.id).map((r) => r.name) }))),
);
route("GET", "/personas", ({ platform }) => list(platform.state.users), { public: true });
route("GET", "/roles", ({ platform }) => list(platform.state.roles));
route("GET", "/group-mappings", ({ platform }) => list(platform.state.groupMappings));
route("PUT", "/group-mappings", ({ platform, ctx, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "control.manage", "access.update", "group-mappings");
  const mappings = body.mappings as GroupRoleMapping[];
  if (!Array.isArray(mappings)) fail(422, "VALIDATION_FAILED", "mappings must be a list");
  for (const m of mappings) {
    if (!platform.state.roles.some((r) => r.id === m.roleId)) fail(422, "VALIDATION_FAILED", `Unknown role ${m.roleId}`);
  }
  platform.state.groupMappings = mappings;
  platform.audit(c, "access.update", "group-mappings", "allowed", `${mappings.length} mappings`);
  return list(mappings);
});
route("GET", "/environments", ({ platform }) => list(platform.state.environments));

/* Studio */

route("GET", "/applications", ({ platform }) => list(platform.state.applications));
route("GET", "/applications/:id", ({ platform, params }) => find(platform.state.applications, params.id, "Application"));
route("POST", "/applications/plan", ({ platform, ctx, body }) => {
  const c = ctx("studio");
  platform.requirePermission(c, "studio.manage", "application.plan", "application");
  const prompt = String(body.prompt ?? "").trim();
  if (prompt.length < 8) fail(422, "VALIDATION_FAILED", "Describe the application in a sentence or two");
  platform.audit({ ...c, actor: { kind: "agent", id: "agent-application-architect", name: "Application Architect", onBehalfOf: c.actor.name } }, "application.plan", "application", "allowed", prompt);
  return planApplication(prompt);
});
route("POST", "/applications", ({ platform, ctx, body }) => applyPlan(platform, ctx("studio"), body.plan as ApplicationPlan));
route("PUT", "/applications/:id", ({ platform, ctx, params, body }) => updateApplication(platform, ctx("studio"), params.id, body.plan as ApplicationPlan));
route("GET", "/me/pinned-applications", ({ platform, userId }) => list(platform.state.pins[userId] ?? []));
route("PUT", "/me/pinned-applications/:id", ({ platform, userId, params }) => {
  find(platform.state.applications, params.id, "Application");
  const pins = platform.state.pins[userId] ?? [];
  if (!pins.includes(params.id)) platform.state.pins[userId] = [...pins, params.id];
  return list(platform.state.pins[userId]);
});
route("DELETE", "/me/pinned-applications/:id", ({ platform, userId, params }) => {
  platform.state.pins[userId] = (platform.state.pins[userId] ?? []).filter((id) => id !== params.id);
  return list(platform.state.pins[userId]);
});
route("GET", "/applications/:id/releases", ({ platform, params }) =>
  list(platform.state.releases.filter((r) => r.applicationId === params.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
);
route("POST", "/applications/:id/releases", ({ platform, ctx, params, body }) =>
  createRelease(platform, ctx("studio"), params.id, String(body.notes ?? "")),
);
route("GET", "/deployments", ({ platform, query }) => {
  const appId = query.get("applicationId");
  return list(
    platform.state.deployments
      .filter((d) => !appId || d.applicationId === appId)
      .sort((a, b) => b.deployedAt.localeCompare(a.deployedAt)),
  );
});
route("POST", "/deployments", ({ platform, ctx, body }) =>
  deploy(platform, ctx("control"), String(body.applicationId), body.environment as EnvironmentKey, String(body.version)),
);

/* Data */

route("GET", "/entities", ({ platform }) => list(platform.state.entities));
route("GET", "/entities/:name", ({ platform, params }) => platform.entity(params.name));
route("POST", "/entities", ({ platform, ctx, body }) => {
  const c = ctx("studio");
  platform.requirePermission(c, "data.manage", "entity.create", "entity");
  const name = String(body.name ?? "").trim();
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) fail(422, "VALIDATION_FAILED", "Entity name must be PascalCase, e.g. PurchaseRequest");
  if (platform.state.entities.some((e) => e.name === name)) fail(409, "CONFLICT", `Entity ${name} already exists`);
  const fields = (body.fields as EntityField[] | undefined) ?? [];
  if (fields.length === 0) fail(422, "VALIDATION_FAILED", "Add at least one field");
  const entity: Entity = {
    id: platform.nextId("ent"),
    name,
    label: String(body.label || name),
    description: String(body.description ?? ""),
    scope: (body.scope as Entity["scope"]) ?? "organization",
    ownerApplicationId: (body.ownerApplicationId as string) || undefined,
    fields,
    relationships: fields
      .filter((f) => f.type === "reference" && f.reference)
      .map((f) => ({ name: f.name, kind: "many-to-one" as const, target: f.reference! })),
    events: [`${name}.Created`, `${name}.Updated`],
    readPermission: "data.manage",
    writePermission: "data.manage",
    version: 1,
    lifecycle: "draft",
    updatedAt: platform.now(),
  };
  platform.state.entities.push(entity);
  if (entity.ownerApplicationId) {
    const app = platform.state.applications.find((a) => a.id === entity.ownerApplicationId);
    app?.entityNames.push(entity.name);
  }
  platform.audit(c, "entity.create", `entity/${name}`, "allowed");
  return entity;
});
route("PATCH", "/entities/:name", ({ platform, ctx, params, body }) => {
  const c = ctx("studio");
  platform.requirePermission(c, "data.manage", "entity.update", `entity/${params.name}`);
  const entity = platform.entity(params.name);
  if (entity.scope === "external") fail(409, "INVALID_STATE", "External entities are defined by their source system");
  if (Array.isArray(body.fields)) entity.fields = body.fields as EntityField[];
  if (typeof body.description === "string") entity.description = body.description;
  if (body.readPermission) entity.readPermission = body.readPermission as Permission;
  if (body.writePermission) entity.writePermission = body.writePermission as Permission;
  entity.version += 1;
  entity.updatedAt = platform.now();
  platform.audit(c, "entity.update", `entity/${entity.name}`, "allowed", `Version ${entity.version}`);
  return entity;
});
route("GET", "/entities/:name/records", ({ platform, ctx, params, query }) => {
  const q = query.get("q")?.toLowerCase();
  const records = platform.invoke<Record<string, unknown>[]>(ctx("studio"), `${params.name}.list`);
  return page(
    q ? records.filter((r) => JSON.stringify(r.values).toLowerCase().includes(q)) : records,
    query,
  );
});
route("POST", "/entities/:name/records", ({ platform, ctx, params, body }) => {
  if (platform.entity(params.name).scope === "external") fail(409, "INVALID_STATE", "External entities are read-only");
  return platform.invoke(ctx("studio"), `${params.name}.create`, { values: body.values as Record<string, FieldValue> });
});
route("PATCH", "/entities/:name/records/:id", ({ platform, ctx, params, body }) => {
  if (platform.entity(params.name).scope === "external") fail(409, "INVALID_STATE", "External entities are read-only");
  return platform.invoke(ctx("studio"), `${params.name}.update`, { id: params.id, values: body.values });
});
route("DELETE", "/entities/:name/records/:id", ({ platform, ctx, params }) => {
  if (platform.entity(params.name).scope === "external") fail(409, "INVALID_STATE", "External entities are read-only");
  return platform.invoke(ctx("studio"), `${params.name}.delete`, { id: params.id });
});
route("GET", "/connections", ({ platform }) => list(platform.state.connections));

/* Business Operations */

route("GET", "/business-operations", ({ platform }) =>
  list(
    platform.listOperations().map(({ name, summary, permission, kind, entity }) => ({ name, summary, permission, kind, entity })),
  ),
);
route("POST", "/business-operations/invoke", ({ platform, ctx, body }) => {
  const c = ctx((body.entryPoint as EntryPoint) ?? "studio");
  const output = platform.invoke(c, String(body.operation), (body.input as Record<string, unknown>) ?? {});
  return { traceId: c.traceId, output };
});

/* Connect */

route("GET", "/apis", ({ platform }) => list(platform.state.apis));
route("GET", "/apis/:id", ({ platform, params }) => find(platform.state.apis, params.id, "API"));
route("GET", "/api-operations", ({ platform, query }) => {
  const apiId = query.get("apiId");
  return list(platform.state.operations.filter((o) => !apiId || o.apiId === apiId));
});
route("PATCH", "/api-operations/:id/mcp", ({ platform, ctx, params, body }) => {
  const c = ctx("control");
  const operation = find(platform.state.operations, params.id, "Operation");
  platform.requirePermission(c, "connect.manage", "mcp.expose", `api-operation/${operation.id}`);
  const enabled = Boolean(body.enabled);
  const fallbackName = operation.businessOperation.replace(/\./g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  const toolName = String(body.toolName || operation.mcp?.toolName || fallbackName);
  if (!/^[a-z][a-z0-9_]*$/.test(toolName)) fail(422, "VALIDATION_FAILED", "Tool names are snake_case");
  const taken = platform.state.operations.some((o) => o.id !== operation.id && o.mcp?.enabled && o.mcp.toolName === toolName);
  if (enabled && taken) fail(409, "CONFLICT", `Tool ${toolName} is already exposed`);
  operation.mcp = {
    toolName,
    description: String(body.description || operation.mcp?.description || operation.summary),
    enabled,
  };
  platform.audit(c, enabled ? "mcp.expose" : "mcp.withdraw", `mcp-tool/${toolName}`, "allowed");
  return operation;
});
route("POST", "/api-operations/:id/invoke", ({ platform, ctx, params, body }) => {
  const operation = find(platform.state.operations, params.id, "Operation");
  const c = ctx("api");
  const output = platform.invoke(c, operation.businessOperation, (body.input as Record<string, unknown>) ?? {});
  return { traceId: c.traceId, output };
});
route("GET", "/mcp/tools", ({ platform }) => list(listMcpTools(platform)));
route("GET", "/mcp/servers", ({ platform }) => list(platform.state.mcpServers));
route("POST", "/mcp/servers", ({ platform, ctx, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "connect.manage", "mcp.register", "mcp-server");
  const name = String(body.name ?? "").trim();
  const url = String(body.url ?? "").trim();
  if (!name) fail(422, "VALIDATION_FAILED", "Name is required");
  if (!/^https?:\/\//.test(url)) fail(422, "VALIDATION_FAILED", "URL must start with http:// or https://");
  const prefix = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
  const server: McpServer = {
    id: platform.nextId("mcp"),
    name,
    url,
    kind: "external",
    auth: (body.auth as McpServer["auth"]) ?? "oauth2",
    status: "healthy",
    tools: [
      { name: `${prefix}_search`, description: `Search ${name}.` },
      { name: `${prefix}_get`, description: `Fetch one item from ${name}.` },
    ],
    registeredAt: platform.now(),
  };
  platform.state.mcpServers.push(server);
  platform.audit(c, "mcp.register", `mcp-server/${server.id}`, "allowed", `Discovered ${server.tools.length} tools`);
  return server;
});
route("GET", "/integrations", ({ platform }) => list(platform.state.integrations));
route("POST", "/integrations/:id/test", ({ platform, ctx, params }) => {
  const c = ctx("control");
  const integration = find(platform.state.integrations, params.id, "Integration");
  platform.requirePermission(c, "connect.manage", "integration.test", `integration/${integration.id}`);
  integration.status = integration.target.includes("legacy") ? "failing" : "connected";
  integration.lastTestedAt = platform.now();
  platform.audit(c, "integration.test", `integration/${integration.id}`, integration.status === "connected" ? "allowed" : "failed",
    integration.status === "connected" ? "Connection succeeded" : "TLS handshake timed out");
  return integration;
});

/* AI */

route("GET", "/model-providers", ({ platform }) => list(platform.state.modelProviders));
route("GET", "/agents", ({ platform }) => list(platform.state.agents));
route("GET", "/agents/:id", ({ platform, params }) => find(platform.state.agents, params.id, "Agent"));
route("PATCH", "/agents/:id", ({ platform, ctx, params, body }) => {
  const c = ctx("control");
  const agent = find(platform.state.agents, params.id, "Agent");
  platform.requirePermission(c, "ai.manage", "agent.update", `agent/${agent.id}`);
  const tools = listMcpTools(platform).map((t) => t.name);
  if (Array.isArray(body.tools)) {
    const unknown = (body.tools as string[]).filter((t) => !tools.includes(t));
    if (unknown.length) fail(422, "VALIDATION_FAILED", `Unknown tools: ${unknown.join(", ")}`);
    agent.tools = body.tools as string[];
  }
  if (Array.isArray(body.permissions)) agent.permissions = body.permissions as Permission[];
  if (typeof body.instructions === "string") agent.instructions = body.instructions;
  if (typeof body.model === "string") agent.model = body.model;
  if (body.status === "active" || body.status === "disabled") agent.status = body.status;
  agent.version += 1;
  platform.audit(c, "agent.update", `agent/${agent.id}`, "allowed", `Version ${agent.version}`);
  return agent;
});
route("POST", "/agents/:id/runs", ({ platform, userId, params, body }) => {
  const user = platform.state.users.find((u) => u.id === userId)!;
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) fail(422, "VALIDATION_FAILED", "Prompt is required");
  const agent = find(platform.state.agents, params.id, "Agent");
  return runAgent(platform, agent.id, prompt, {
    trigger: "manual",
    onBehalfOf: user.name,
    delegatedFrom: agent.actsAsCaller ? platform.permissionsForUser(userId) : undefined,
  });
});
route("POST", "/sidekick/runs", ({ platform, userId, ctx, body }) => {
  const user = platform.state.users.find((u) => u.id === userId)!;
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) fail(422, "VALIDATION_FAILED", "Prompt is required");
  if (platform.rolesForUser(userId).length === 0) {
    const c = ctx("agent");
    platform.audit(c, "sidekick.run", "agent/agent-sidekick", "denied", "User holds no role");
    fail(403, "FORBIDDEN", "Sidekick is available to users who hold a role");
  }
  const applicationId = body.applicationId === undefined ? undefined : String(body.applicationId);
  return runAgent(platform, "agent-sidekick", prompt, {
    trigger: "manual",
    onBehalfOf: user.name,
    delegatedFrom: platform.permissionsForUser(userId),
    applicationId,
  });
});
route("GET", "/agent-runs", ({ platform, query }) => {
  const agentId = query.get("agentId");
  const q = query.get("q")?.toLowerCase();
  return page(
    platform.state.agentRuns
      .filter((r) => !agentId || r.agentId === agentId)
      .filter((r) => !q || `${r.id} ${r.prompt}`.toLowerCase().includes(q))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    query,
  );
});
route("GET", "/agent-runs/:id", ({ platform, params }) => find(platform.state.agentRuns, params.id, "Agent run"));

/* Flow */

route("GET", "/workflows", ({ platform }) => list(platform.state.workflows));
route("GET", "/workflows/:id", ({ platform, params }) => find(platform.state.workflows, params.id, "Workflow"));
route("PATCH", "/workflows/:id", ({ platform, ctx, params, body }) => {
  const c = ctx("control");
  const workflow = find(platform.state.workflows, params.id, "Workflow");
  platform.requirePermission(c, "flow.manage", "workflow.update", `workflow/${workflow.id}`);
  if (body.definition) return saveWorkflow(platform, c, workflow.id, body.definition as WorkflowDefinition);
  if (body.status === "active" || body.status === "paused") workflow.status = body.status;
  workflow.version += 1;
  platform.audit(c, "workflow.update", `workflow/${workflow.id}`, "allowed", `Status ${workflow.status}`);
  return workflow;
});
route("POST", "/workflows", ({ platform, ctx, body }) => saveWorkflow(platform, ctx("control"), undefined, body.definition as WorkflowDefinition));
route("POST", "/workflows/:id/executions", ({ platform, userId, params, body }) =>
  runManually(platform, userId, params.id, (body.input as Record<string, unknown>) ?? {}),
);
route("GET", "/executions", ({ platform, query }) => {
  const workflowId = query.get("workflowId");
  return list(
    platform.state.executions
      .filter((e) => !workflowId || e.workflowId === workflowId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
  );
});
route("GET", "/executions/:id", ({ platform, params }) => find(platform.state.executions, params.id, "Execution"));
route("GET", "/approvals", ({ platform, query }) => {
  const status = query.get("status");
  return page(
    platform.state.approvals
      .filter((a) => !status || a.status === status)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    query,
  );
});
route("POST", "/approvals/:id/decision", ({ platform, userId, params, body }) => {
  const decision = body.decision;
  if (decision !== "approved" && decision !== "rejected") fail(422, "VALIDATION_FAILED", "decision must be approved or rejected");
  return decideApproval(platform, userId, params.id, decision, String(body.comment ?? ""));
});

/* Observability and audit */

route("GET", "/events", ({ platform, query }) => page([...platform.state.events].reverse(), query));
route("GET", "/audit", ({ platform, ctx, query }) => {
  const c = ctx("control");
  platform.requirePermission(c, "audit.read", "audit.read", "audit");
  const actorKind = query.get("actorKind");
  const outcome = query.get("outcome");
  const q = query.get("q")?.toLowerCase();
  return list(
    [...platform.state.audit]
      .reverse()
      .filter((a) => !actorKind || a.actor.kind === actorKind)
      .filter((a) => !outcome || a.outcome === outcome)
      .filter((a) => !q || `${a.action} ${a.resource} ${a.actor.name} ${a.detail ?? ""}`.toLowerCase().includes(q)),
  );
});
route("GET", "/traces", ({ platform, ctx, query }) => {
  platform.requirePermission(ctx("control"), "audit.read", "audit.read", "traces");
  const q = query.get("q")?.toLowerCase();
  return page(
    q
      ? traceSummaries(platform).filter((t) => `${t.traceId} ${t.title} ${t.actors.join(" ")}`.toLowerCase().includes(q))
      : traceSummaries(platform),
    query,
  );
});
route("GET", "/traces/:id", ({ platform, ctx, params }): Trace => {
  platform.requirePermission(ctx("control"), "audit.read", "audit.read", `trace/${params.id}`);
  const summary = traceSummaries(platform).find((t) => t.traceId === params.id);
  if (!summary) fail(404, "NOT_FOUND", `Trace ${params.id} not found`);
  return {
    ...summary,
    audit: platform.state.audit.filter((a) => a.traceId === params.id),
    events: platform.state.events.filter((e) => e.traceId === params.id),
  };
});
route("GET", "/health", ({ platform }) => {
  const s = platform.state;
  const signals: HealthSignal[] = [
    ...s.applications.map((a) => ({ resource: a.name, kind: "application" as const, status: "healthy" as const, detail: `v${a.version}` })),
    ...s.apis.map((a) => ({ resource: a.name, kind: "api" as const, status: "healthy" as const, detail: `p95 ${40 + a.name.length * 3} ms` })),
    ...s.mcpServers.map((m) => ({ resource: m.name, kind: "mcp" as const, status: m.status === "healthy" ? ("healthy" as const) : m.status === "degraded" ? ("degraded" as const) : ("down" as const), detail: m.url })),
    ...s.integrations.map((i) => ({ resource: i.name, kind: "integration" as const, status: i.status === "failing" ? ("down" as const) : i.status === "untested" ? ("degraded" as const) : ("healthy" as const), detail: i.target })),
    ...s.connections.map((d) => ({ resource: d.name, kind: "database" as const, status: d.status === "connected" ? ("healthy" as const) : d.status === "degraded" ? ("degraded" as const) : ("down" as const), detail: d.host })),
    ...s.workflows.filter((w) => w.status === "active").map((w) => {
      const failed = s.executions.filter((e) => e.workflowId === w.id && e.status === "failed").length;
      return { resource: w.name, kind: "workflow" as const, status: failed ? ("degraded" as const) : ("healthy" as const), detail: `${failed} failed runs` };
    }),
  ];
  return list(signals);
});

/** Dispatches one request to the in-browser platform, as an HTTP server would. */
export function handleRequest(platform: Platform, request: MockRequest): MockResponse {
  const path = request.path.replace(/\/+$/, "") || "/";
  const candidates = routes.filter((r) => r.pattern.test(path));
  const matched = candidates.find((r) => r.method === request.method);
  if (!matched) {
    return {
      status: candidates.length ? 405 : 404,
      body: { status: candidates.length ? 405 : 404, code: "NOT_FOUND", message: `No route for ${request.method} ${path}` },
    };
  }
  const userId = request.token?.startsWith("demo.") ? request.token.slice(5) : "";
  if (!matched.public && !platform.state.users.some((u) => u.id === userId)) {
    return { status: 401, body: { status: 401, code: "UNAUTHENTICATED", message: "Sign in to continue" } };
  }
  const values = matched.pattern.exec(path)!.slice(1);
  const params = Object.fromEntries(matched.keys.map((k, i) => [k, decodeURIComponent(values[i])]));
  try {
    const body = matched.handler({
      platform,
      userId,
      params,
      query: request.query,
      body: (request.body as Record<string, unknown>) ?? {},
      ctx: (entryPoint = "studio") => platform.userContext(userId, entryPoint),
    });
    return { status: request.method === "POST" ? 201 : 200, body: body ?? null };
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, body: error.body };
    const message = error instanceof Error ? error.message : String(error);
    return { status: 500, body: { status: 500, code: "INVALID_STATE", message } };
  }
}
