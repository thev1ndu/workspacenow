import {
  ApiError,
  type ApplicationPlan,
  type AuditRecord,
  type Entity,
  type EntityField,
  type EntityRecord,
  type EntryPoint,
  type EnvironmentKey,
  type FieldValue,
  type Group, GroupInput, GroupRoleMapping,
  type HealthSignal,
  type Integration,
  type IntegrationInput,
  type McpServer,
  type OverviewStats,
  type Permission,
  type ResourceSummary,
  type SavedView,
  type SavedViewInput,
  type SchemaMigration,
  type Session,
  type Trace,
  type TraceSummary,
  type ErrorGroup,
  type ServiceStat,
  type WorkflowDefinition,
  type ApiKey,
  type ApiVersion,
  type ApiVersionInput,
  type Webhook,
  type WebhookDelivery,
  type WebhookInput,
  type AlertRule,
  type AlertRuleInput,
  type Slo,
  type SloInput
} from "@workspacenow/types";
import { runAgent } from "./agents";
import { activitySeries, entryPointBreakdown, logSeries, tokenSeries } from "./analytics";
import { listMcpTools } from "./mcp";
import { fail, type ExecutionContext, type Platform } from "./platform";
import { search } from "./search";
import { applyPlan, createRelease, deploy, planApplication, planApplicationEdit, updateApplication } from "./studio";
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

// Tolerant of older persisted states that predate a field: never throw on a missing array.
const list = <T>(items: T[] | undefined) => ({ items: items ?? [], total: items?.length ?? 0 });

/** Server-side paging for list endpoints: limit (default 50, max 200) + offset, total kept. */
const page = <T>(items: T[] | undefined, query: URLSearchParams) => {
  const rows = items ?? [];
  const limit = Math.min(Math.max(Number(query.get("limit") ?? 50), 1), 200);
  const offset = Math.max(Number(query.get("offset") ?? 0), 0);
  return { items: rows.slice(offset, offset + limit), total: rows.length };
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

// errorGroups derives demo error groups from failed and denied audit records, grouped by actor
// service, action and detail — mirroring how wsn-observer groups error spans by fingerprint
// (denied calls surface as error spans on the API too).
function errorGroups(platform: Platform): ErrorGroup[] {
  const failed = platform.state.audit.filter((a) => a.outcome === "failed" || a.outcome === "denied");
  const groups = new Map<string, ErrorGroup>();
  for (const record of failed) {
    const service = record.actor.kind === "agent" ? "wsn-ai-service" : "wsn-service";
    const fingerprint = `${service} ${record.action} ${record.detail ?? ""}`;
    const group = groups.get(fingerprint) ?? {
      fingerprint,
      service,
      spanName: record.action,
      message: record.detail || `operation ${record.action} failed`,
      count: 0,
      firstSeen: record.time,
      lastSeen: record.time,
      traceIds: [],
    };
    group.count += 1;
    if (record.time < group.firstSeen) group.firstSeen = record.time;
    if (record.time > group.lastSeen) group.lastSeen = record.time;
    if (group.traceIds.length < 5 && !group.traceIds.includes(record.traceId)) group.traceIds.push(record.traceId);
    groups.set(fingerprint, group);
  }
  return [...groups.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}

// serviceStats derives per-service telemetry health from the demo state.
function serviceStats(platform: Platform): ServiceStat[] {
  const s = platform.state;
  const lastSeen = s.audit.length ? s.audit[s.audit.length - 1].time : new Date().toISOString();
  const spans = s.audit.length + s.events.length;
  const errors = s.audit.filter((a) => a.outcome === "failed" || a.outcome === "denied").length;
  return [
    { service: "wsn-service", spans, errors, logs: s.audit.length, errorRate: spans ? errors / spans : 0, lastSeen },
    { service: "wsn-ai-service", spans: s.agentRuns.length, errors: s.agentRuns.filter((r) => r.status === "failed").length, logs: s.agentRuns.length, errorRate: 0, lastSeen },
    { service: "wsn-observer", spans: 0, errors: 0, logs: 0, errorRate: 0, lastSeen },
    { service: "console", spans: 0, errors: 0, logs: 0, errorRate: 0, lastSeen },
  ].map((st) => ({ ...st, errorRate: st.spans ? st.errors / st.spans : 0 }));
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
route("GET", "/analytics/log-metrics", ({ platform, query }) => list(logSeries(platform, Number(query.get("days") ?? 14))));

/* Control: organization and access */

route("GET", "/organization", ({ platform }) => platform.state.organization);
route("GET", "/departments", ({ platform }) => list(platform.state.departments));
route("GET", "/teams", ({ platform }) => list(platform.state.teams));
route("GET", "/users", ({ platform }) =>
  list(platform.state.users.map((u) => ({ ...u, roles: platform.rolesForUser(u.id).map((r) => r.name) }))),
);
route("PUT", "/users/:userId/roles", ({ platform, ctx, params, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "control.manage", "user.roles", `user/${params.userId}`);
  const user = platform.state.users.find((u) => u.id === params.userId);
  if (!user) fail(404, "NOT_FOUND", `No user ${params.userId}`);
  const roleIds = body.roles as string[];
  if (!Array.isArray(roleIds)) fail(422, "VALIDATION_FAILED", "roles must be a list");
  for (const id of roleIds) {
    if (!platform.state.roles.some((r) => r.id === id)) fail(422, "VALIDATION_FAILED", `Unknown role ${id}`);
  }
  user.roleIds = roleIds;
  platform.audit(c, "user.roles", `user/${user.id}`, "allowed", `${roleIds.length} roles`);
  return { ...user, roles: platform.rolesForUser(user.id).map((r) => r.name) };
});
route("GET", "/personas", ({ platform }) => list(platform.state.users), { public: true });
route("GET", "/roles", ({ platform }) => list(platform.state.roles));
route("GET", "/group-mappings", ({ platform }) => list(platform.state.groupMappings));
route("GET", "/groups", ({ platform }) => list(platform.state.groups));
route("POST", "/groups", ({ platform, ctx, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "control.manage", "group.create", "groups");
  const input = body as unknown as GroupInput;
  if (!input.name?.trim()) fail(422, "VALIDATION_FAILED", "A group needs a name");
  for (const id of input.memberIds ?? []) {
    if (!platform.state.users.some((u) => u.id === id)) fail(422, "VALIDATION_FAILED", `Unknown member ${id}`);
  }
  const g: Group = { id: platform.nextId("grp"), name: input.name.trim(), description: input.description ?? "", memberIds: input.memberIds ?? [] };
  platform.state.groups.push(g);
  platform.audit(c, "group.create", `group/${g.id}`, "allowed", g.name);
  return g;
});
route("PUT", "/groups/:groupId", ({ platform, ctx, params, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "control.manage", "group.update", `group/${params.groupId}`);
  const g = platform.state.groups.find((x) => x.id === params.groupId);
  if (!g) fail(404, "NOT_FOUND", `No group ${params.groupId}`);
  const input = body as unknown as GroupInput;
  if (!input.name?.trim()) fail(422, "VALIDATION_FAILED", "A group needs a name");
  g.name = input.name.trim();
  g.description = input.description ?? "";
  g.memberIds = input.memberIds ?? [];
  platform.audit(c, "group.update", `group/${g.id}`, "allowed", g.name);
  return g;
});
route("DELETE", "/groups/:groupId", ({ platform, ctx, params }) => {
  const c = ctx("control");
  platform.requirePermission(c, "control.manage", "group.delete", `group/${params.groupId}`);
  const i = platform.state.groups.findIndex((x) => x.id === params.groupId);
  if (i < 0) fail(404, "NOT_FOUND", `No group ${params.groupId}`);
  platform.state.groups.splice(i, 1);
  platform.audit(c, "group.delete", `group/${params.groupId}`, "allowed", "");
  return { deleted: true };
});
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
route("POST", "/applications/:id/plan", ({ platform, ctx, params, body }) => {
  const c = ctx("studio");
  platform.requirePermission(c, "studio.manage", "application.plan", `application/${params.id}`);
  const prompt = String(body.prompt ?? "").trim();
  if (prompt.length < 8) fail(422, "VALIDATION_FAILED", "Describe the change in a sentence or two");
  platform.audit({ ...c, actor: { kind: "agent", id: "agent-application-architect", name: "Application Architect", onBehalfOf: c.actor.name } }, "application.plan", `application/${params.id}`, "allowed", prompt);
  return planApplicationEdit(platform, params.id, prompt);
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
  const viewId = query.get("view");
  let records = platform.invoke<Record<string, unknown>[]>(ctx("studio"), `${params.name}.list`) as unknown as EntityRecord[];
  if (query.get("includeDeleted") === "true") {
    records = platform.records(params.name);
  }
  if (viewId) {
    const view = platform.state.views.find((v) => v.id === viewId && v.entity === params.name);
    if (!view) fail(404, "NOT_FOUND", "View not found");
    records = platform.runView(params.name, view);
  }
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
route("GET", "/entities/:name/records/export", ({ platform, ctx, params, query }) => {
  const entity = platform.entity(params.name);
  platform.requirePermission(ctx("studio"), entity.readPermission, `${params.name}.export`, `entity/${params.name}`);
  const format = query.get("format") === "csv" ? "csv" : "json";
  let rows = platform.records(params.name).filter((r) => !r.deletedAt);
  const viewId = query.get("view");
  if (viewId) {
    const view = platform.state.views.find((v) => v.id === viewId && v.entity === params.name);
    if (!view) fail(404, "NOT_FOUND", "View not found");
    rows = platform.runView(params.name, view);
  }
  if (format === "csv") {
    const header = ["id", ...entity.fields.map((f) => f.name)];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = [header, ...rows.map((r) => [r.id, ...entity.fields.map((f) => r.values[f.name])])]
      .map((row) => row.map(esc).join(","))
      .join("\n");
    return { body, contentType: "text/csv", download: `${params.name.toLowerCase()}.csv` };
  }
  return { body: JSON.stringify(rows), contentType: "application/json", download: `${params.name.toLowerCase()}.json` };
});
route("POST", "/entities/:name/records/import", ({ platform, ctx, params, body }) => {
  const entity = platform.entity(params.name);
  if (entity.scope === "external") fail(409, "INVALID_STATE", "External entities are read-only");
  platform.requirePermission(ctx("studio"), entity.writePermission, `${params.name}.import`, `entity/${params.name}`);
  const format = body.format === "csv" ? "csv" : "json";
  let rows: Record<string, FieldValue>[];
  if (format === "csv") {
    const lines = String(body.data ?? "").split("\n").filter((l) => l.trim());
    const header = (lines.shift() ?? "").split(",");
    rows = lines.map((l) => {
      const cells = l.split(",");
      const values: Record<string, FieldValue> = {};
      header.forEach((h, i) => {
        if (h !== "id" && cells[i] !== undefined && cells[i] !== "") values[h] = cells[i];
      });
      return values;
    });
  } else {
    rows = JSON.parse(String(body.data ?? "[]")) as Record<string, FieldValue>[];
  }
  const c = ctx("studio");
  for (const values of rows) platform.createRecord(c, params.name, values);
  platform.audit(c, `${params.name}.import`, `entity/${params.name}`, "allowed", `${rows.length} records`);
  return { created: rows.length };
});
route("POST", "/entities/:name/records/:id/files/:field", ({ platform, ctx, params, query, body }) => {
  const entity = platform.entity(params.name);
  const field = entity.fields.find((f) => f.name === params.field);
  if (!field || field.type !== "file") fail(422, "VALIDATION_FAILED", `${params.name} has no file field ${params.field}`);
  const c = ctx("studio");
  platform.requirePermission(c, entity.writePermission, `${params.name}.file.upload`, `entity/${params.name}`);
  const record = platform.records(params.name).find((r) => r.id === params.id);
  if (!record) fail(404, "NOT_FOUND", "Record not found");
  const raw = (body as { __rawBase64?: string })?.__rawBase64;
  if (!raw) fail(422, "VALIDATION_FAILED", "body must carry the file bytes");
  const name = (query.get("name") || "file").split("/").pop()!;
  const key = `uploads/${params.name}/${params.id}/${params.field}/file-${platform.nextId("file")}-${name}`;
  platform.state.uploads[key] = { name, contentType: "application/octet-stream", dataBase64: raw };
  const ref = { key, name, sizeBytes: Math.floor(raw.length * 0.75), contentType: "application/octet-stream" };
  platform.invoke(c, `${params.name}.update`, { id: params.id, values: { [params.field]: JSON.stringify(ref) } });
  platform.audit(c, "record.file.upload", `record/${params.name}/${params.id}`, "allowed", `${params.field} ${name}`);
  return platform.records(params.name).find((r) => r.id === params.id);
});
route("GET", "/entities/:name/records/:id/files/:field", ({ platform, ctx, params }) => {
  const entity = platform.entity(params.name);
  const field = entity.fields.find((f) => f.name === params.field);
  if (!field || field.type !== "file") fail(422, "VALIDATION_FAILED", `${params.name} has no file field ${params.field}`);
  const c = ctx("studio");
  platform.requirePermission(c, entity.readPermission, `${params.name}.file.download`, `entity/${params.name}`);
  const record = platform.records(params.name).find((r) => r.id === params.id);
  const raw = record?.values[params.field];
  let ref: { key?: string; name?: string } = {};
  try {
    ref = typeof raw === "string" ? JSON.parse(raw) : {};
  } catch { /* not a ref */ }
  const obj = ref.key ? platform.state.uploads[ref.key] : undefined;
  if (!obj) fail(404, "NOT_FOUND", `No file on ${params.id}.${params.field}`);
  return { __fileBase64: obj.dataBase64, contentType: obj.contentType, name: obj.name };
});
route("GET", "/entities/:name/records/:id/history", ({ platform, ctx, params }) => {
  const entity = platform.entity(params.name);
  platform.requirePermission(ctx("studio"), entity.readPermission, `${params.name}.history`, `entity/${params.name}/${params.id}`);
  const items = platform.state.history
    .filter((h) => h.entity === params.name && h.recordId === params.id)
    .sort((a, b) => b.seq - a.seq);
  return list(items);
});
route("POST", "/entities/:name/records/:id/restore", ({ platform, ctx, params }) => {
  const entity = platform.entity(params.name);
  if (entity.scope === "external") fail(409, "INVALID_STATE", "External entities are read-only");
  platform.requirePermission(ctx("studio"), entity.writePermission, `${params.name}.restore`, `entity/${params.name}/${params.id}`);
  return platform.restoreRecord(ctx("studio"), params.name, params.id);
});
route("GET", "/entities/:name/versions", ({ platform, params }) =>
  list([...platform.state.entityVersions.filter((v) => v.entity === params.name)].sort((a, b) => b.version - a.version)));
route("GET", "/entities/:name/versions/diff", ({ platform, params, query }) => {
  const from = Number(query.get("from"));
  const to = Number(query.get("to"));
  const versions = platform.state.entityVersions.filter((v) => v.entity === params.name);
  const a = versions.find((v) => v.version === from);
  const b = versions.find((v) => v.version === to);
  if (!a || !b) fail(404, "NOT_FOUND", `Entity ${params.name} has no versions ${from}/${to}`);
  const fieldsOf = (doc: Record<string, unknown>) => Object.fromEntries(((doc.fields as Array<{ name: string }>) ?? []).map((f) => [f.name, f]));
  const fa = fieldsOf(a.doc);
  const fb = fieldsOf(b.doc);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: Array<{ field: string; from: unknown; to: unknown }> = [];
  for (const name of Object.keys(fb)) if (!(name in fa)) added.push(name);
  for (const name of Object.keys(fa)) {
    if (!(name in fb)) removed.push(name);
    else if (JSON.stringify(fa[name]) !== JSON.stringify(fb[name])) changed.push({ field: name, from: fa[name], to: fb[name] });
  }
  return { from, to, added, removed, changed };
});
route("POST", "/entities/:name/records/purge", ({ platform, ctx, params, query }) => {
  const c = ctx("control");
  platform.requirePermission(c, "data.manage", "entity.purge", `entity/${params.name}`);
  const days = Math.max(Number(query.get("olderThanDays") ?? 30), 1);
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const before = platform.state.records.length;
  platform.state.records = platform.state.records.filter((r) => !(r.entity === params.name && r.deletedAt && r.deletedAt < cutoff));
  const purged = before - platform.state.records.length;
  platform.audit(c, "entity.purge", `entity/${params.name}`, "allowed", `purged ${purged} records older than ${days} days`);
  return { purged };
});
route("POST", "/entities/:name/migrate", ({ platform, ctx, params, body }) =>
  platform.migrateEntity(ctx("studio"), params.name, body as SchemaMigration),
);
route("GET", "/entities/:name/views", ({ platform, ctx, params }) => {
  const entity = platform.entity(params.name);
  platform.requirePermission(ctx("studio"), entity.readPermission, `${params.name}.views`, `entity/${params.name}`);
  const c = ctx("studio");
  return list(platform.state.views.filter((v) => v.entity === params.name && (v.shared || v.ownerId === c.actor.id)));
});
route("POST", "/entities/:name/views", ({ platform, ctx, params, body }) => {
  const entity = platform.entity(params.name);
  const c = ctx("studio");
  platform.requirePermission(c, entity.readPermission, `${params.name}.view.create`, `entity/${params.name}`);
  const input = body as SavedViewInput;
  if (!input.name?.trim()) fail(422, "VALIDATION_FAILED", "The view needs a name");
  const now = platform.now();
  const view: SavedView = {
    id: platform.nextId("view"), entity: params.name, name: input.name.trim(), filters: input.filters ?? [],
    sortField: input.sortField, sortDesc: input.sortDesc, limit: input.limit, ownerId: c.actor.id,
    shared: input.shared, createdAt: now, updatedAt: now,
  };
  platform.state.views.push(view);
  platform.audit(c, `${params.name}.view.create`, `entity/${params.name}/${view.id}`, "allowed", view.name);
  return view;
});
route("PUT", "/entities/:name/views/:viewId", ({ platform, ctx, params, body }) => {
  const c = ctx("studio");
  platform.requirePermission(c, "data.manage", `${params.name}.view.update`, `entity/${params.name}/${params.viewId}`);
  const view = platform.state.views.find((v) => v.id === params.viewId && v.entity === params.name);
  if (!view) fail(404, "NOT_FOUND", "View not found");
  const input = body as SavedViewInput;
  if (!input.name?.trim()) fail(422, "VALIDATION_FAILED", "The view needs a name");
  Object.assign(view, { name: input.name.trim(), filters: input.filters ?? [], sortField: input.sortField, sortDesc: input.sortDesc, limit: input.limit, shared: input.shared, updatedAt: platform.now() });
  return view;
});
route("DELETE", "/entities/:name/views/:viewId", ({ platform, ctx, params }) => {
  const c = ctx("studio");
  platform.requirePermission(c, "data.manage", `${params.name}.view.delete`, `entity/${params.name}/${params.viewId}`);
  const i = platform.state.views.findIndex((v) => v.id === params.viewId && v.entity === params.name);
  if (i < 0) fail(404, "NOT_FOUND", "View not found");
  const [view] = platform.state.views.splice(i, 1);
  platform.audit(c, `${params.name}.view.delete`, `entity/${params.name}/${params.viewId}`, "allowed", view.name);
  return { id: params.viewId, deleted: true };
});
route("POST", "/entities/:name/views/:viewId/run", ({ platform, ctx, params, query }) => {
  const entity = platform.entity(params.name);
  const c = ctx("studio");
  platform.requirePermission(c, entity.readPermission, `${params.name}.list`, `entity/${params.name}`);
  const view = platform.state.views.find((v) => v.id === params.viewId && v.entity === params.name);
  if (!view || (!view.shared && view.ownerId !== c.actor.id)) fail(404, "NOT_FOUND", "View not found");
  const rows = platform.runView(params.name, view);
  return page(rows, query);
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

/** Demo-side SSRF guard mirroring wsn-service's netutil.AssertPublicHTTPURL (literal IPs + internal hostnames). */
function assertPublicUrl(raw: string): void {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    fail(422, "VALIDATION_FAILED", "must be an absolute http(s) URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") fail(422, "VALIDATION_FAILED", "must be an absolute http(s) URL");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    fail(422, "VALIDATION_FAILED", "URL points at internal infrastructure");
  }
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0$)/.test(host) || host === "::1" || host === "0.0.0.0") {
    fail(422, "VALIDATION_FAILED", "URL points at internal infrastructure");
  }
}

const INTEGRATION_KINDS = ["rest", "soap", "webhook", "database", "message-broker", "saas"];
route("POST", "/integrations", ({ platform, ctx, body }) => {
  const c = ctx("connect");
  platform.requirePermission(c, "connect.manage", "integration.create", "integration");
  const input = body as IntegrationInput;
  if (!input.name?.trim() || !input.target?.trim() || !(input.timeoutMs > 0)) fail(422, "VALIDATION_FAILED", "An integration needs a name, a target and a positive timeout (ms)");
  if (!INTEGRATION_KINDS.includes(input.kind)) fail(422, "VALIDATION_FAILED", "kind must be rest, soap, webhook, database, message-broker or saas");
  assertPublicUrl(input.target);
  if (input.secretRef && !platform.state.secrets[input.secretRef]) fail(422, "VALIDATION_FAILED", `Credential ${input.secretRef} is not readable`);
  const integration: Integration = { ...input, id: platform.nextId("int"), status: "untested", name: input.name.trim(), target: input.target.trim(), auth: input.auth, lastTestedAt: undefined };
  platform.state.integrations.push(integration);
  platform.audit(c, "integration.create", `integration/${integration.id}`, "allowed", integration.name);
  return integration;
});
route("PUT", "/integrations/:id", ({ platform, ctx, params, body }) => {
  const c = ctx("connect");
  const integration = find(platform.state.integrations, params.id, "Integration");
  platform.requirePermission(c, "connect.manage", "integration.update", `integration/${params.id}`);
  const input = body as IntegrationInput;
  if (!input.name?.trim() || !input.target?.trim() || !(input.timeoutMs > 0)) fail(422, "VALIDATION_FAILED", "An integration needs a name, a target and a positive timeout (ms)");
  assertPublicUrl(input.target);
  if (input.secretRef && !platform.state.secrets[input.secretRef]) fail(422, "VALIDATION_FAILED", `Credential ${input.secretRef} is not readable`);
  Object.assign(integration, input, { name: input.name.trim(), target: input.target.trim() });
  platform.audit(c, "integration.update", `integration/${params.id}`, "allowed", integration.name);
  return integration;
});
route("GET", "/secrets", ({ platform, ctx, query }) => {
  const c = ctx("connect");
  platform.requirePermission(c, "connect.manage", "secret.list", "secrets");
  const prefix = query.get("prefix") ?? "";
  const items = Object.keys(platform.state.secrets).filter((k) => k.startsWith(prefix));
  return { items, totalCount: items.length };
});
route("GET", "/secrets/read", ({ platform, ctx, query }) => {
  const c = ctx("control");
  platform.requirePermission(c, "control.manage", "secret.read", `secret/${query.get("path")}`);
  const path = query.get("path") ?? "";
  if (path.split("/").some((seg) => seg === ".." || seg === ".")) fail(422, "VALIDATION_FAILED", "invalid secret path");
  const values = platform.state.secrets[path];
  if (!values) fail(404, "NOT_FOUND", `No secret at ${path}`);
  platform.audit(c, "secret.read", `secret/${path}`, "allowed", `read ${path}`);
  return { path, values };
});
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

route("GET", "/webhooks", ({ platform }) => list(platform.state.webhooks));
route("POST", "/webhooks", ({ platform, ctx, body }) => {
  assertPublicUrl((body as WebhookInput).url ?? "");
  const c = ctx("control");
  platform.requirePermission(c, "connect.manage", "webhook.create", "webhook");
  const input = body as WebhookInput;
  if (!input.name?.trim() || !input.url?.trim()) fail(422, "VALIDATION_FAILED", "The webhook needs a name and a URL");
  const now = platform.now();
  const wh: Webhook = { id: platform.nextId("wh"), name: input.name.trim(), url: input.url.trim(), events: input.events ?? [], secret: input.secret, active: input.active ?? true, createdAt: now, updatedAt: now };
  platform.state.webhooks.push(wh);
  platform.audit(c, "webhook.create", `webhook/${wh.id}`, "allowed", wh.name);
  return wh;
});
route("PUT", "/webhooks/:id", ({ platform, ctx, params, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "connect.manage", "webhook.update", `webhook/${params.id}`);
  const wh = find(platform.state.webhooks, params.id, "Webhook");
  const input = body as WebhookInput;
  Object.assign(wh, { name: input.name, url: input.url, events: input.events ?? [], secret: input.secret, active: input.active ?? true, updatedAt: platform.now() });
  return wh;
});
route("DELETE", "/webhooks/:id", ({ platform, ctx, params }) => {
  const c = ctx("control");
  platform.requirePermission(c, "connect.manage", "webhook.delete", `webhook/${params.id}`);
  const i = platform.state.webhooks.findIndex((w) => w.id === params.id);
  if (i < 0) fail(404, "NOT_FOUND", "Webhook not found");
  platform.state.webhooks.splice(i, 1);
  return { id: params.id, deleted: true };
});
route("GET", "/webhooks/:id/deliveries", ({ platform, ctx, params }) => {
  platform.requirePermission(ctx("control"), "connect.manage", "webhook.deliveries", `webhook/${params.id}`);
  return list(platform.state.webhookDeliveries.filter((d) => d.webhookId === params.id));
});
route("POST", "/webhooks/:id/deliveries/:deliveryId/replay", ({ platform, ctx, params }) => {
  platform.requirePermission(ctx("control"), "connect.manage", "webhook.replay", `webhook/${params.id}/${params.deliveryId}`);
  const d = find(platform.state.webhookDeliveries, params.deliveryId, "Delivery");
  if (d.webhookId !== params.id) fail(404, "NOT_FOUND", "Delivery not found");
  d.status = "pending";
  d.nextRetryAt = undefined;
  d.lastError = undefined;
  return d;
});
route("POST", "/webhooks/:id/test", ({ platform, ctx, params }) => {
  const c = ctx("control");
  platform.requirePermission(c, "connect.manage", "webhook.test", `webhook/${params.id}`);
  const wh = find(platform.state.webhooks, params.id, "Webhook");
  const d: WebhookDelivery = { id: platform.nextId("dlv"), webhookId: wh.id, eventId: "test", eventType: "Webhook.Test", status: "delivered", attempts: 1, lastStatus: 200, deliveredAt: platform.now(), createdAt: platform.now() };
  platform.state.webhookDeliveries.push(d);
  return d;
});
route("GET", "/apis/:id/versions", ({ platform, params }) => list(platform.state.apiVersions.filter((v) => v.apiId === params.id)));
route("POST", "/apis/:id/versions", ({ platform, ctx, params, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "connect.manage", "api.version.create", `api/${params.id}`);
  find(platform.state.apis, params.id, "API");
  const input = body as ApiVersionInput;
  if (!input.version?.trim()) fail(422, "VALIDATION_FAILED", "The version needs a version string, e.g. v2");
  const v: ApiVersion = { id: platform.nextId("ver"), apiId: params.id, version: input.version.trim(), status: input.status ?? "active", changelog: input.changelog, sunset: input.sunset, createdAt: platform.now() };
  platform.state.apiVersions.push(v);
  return v;
});
route("PUT", "/apis/:apiId/versions/:versionId", ({ platform, ctx, params, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "connect.manage", "api.version.update", `api/${params.apiId}/${params.versionId}`);
  const v = platform.state.apiVersions.find((x) => x.id === params.versionId && x.apiId === params.apiId);
  if (!v) fail(404, "NOT_FOUND", "Version not found");
  const input = body as ApiVersionInput;
  if (input.status) v.status = input.status;
  if (input.changelog) v.changelog = input.changelog;
  if (input.sunset) v.sunset = input.sunset;
  return v;
});
route("GET", "/portal/apis", ({ platform }) =>
  list(
    platform.state.apis
      .filter((a) => a.lifecycle !== "archived")
      .map((a) => ({
        id: a.id, name: a.name, basePath: a.basePath, description: a.description, defaultVersion: a.defaultVersion,
        versions: platform.state.apiVersions.filter((v) => v.apiId === a.id && v.status !== "retired"),
        operations: platform.state.operations.filter((o) => o.apiId === a.id).map((o) => ({ id: o.id, method: o.method, path: o.path, summary: o.summary, version: o.version, permission: o.permission, rateLimitPerMinute: o.rateLimitPerMinute })),
      })),
  ),
);
route("GET", "/api-keys", ({ platform, ctx }) => {
  platform.requirePermission(ctx("control"), "connect.manage", "api-key.list", "api-key");
  return list(platform.state.apiKeys);
});
route("POST", "/api-keys", ({ platform, ctx, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "connect.manage", "api-key.create", "api-key");
  const input = body as { name: string; permissions?: string[]; quotaPerHour?: number };
  if (!input.name?.trim()) fail(422, "VALIDATION_FAILED", "The key needs a name");
  const raw = `wsn_${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
  const key: ApiKey = { id: platform.nextId("key"), name: input.name.trim(), prefix: raw.slice(0, 12), permissions: (input.permissions ?? []) as Permission[], quotaPerHour: input.quotaPerHour ?? 0, revoked: false, createdAt: platform.now() };
  platform.state.apiKeys.push(key);
  platform.audit(c, "api-key.create", `api-key/${key.id}`, "allowed", key.name);
  return { ...key, rawKey: raw };
});
route("DELETE", "/api-keys/:id", ({ platform, ctx, params }) => {
  const c = ctx("control");
  platform.requirePermission(c, "connect.manage", "api-key.revoke", `api-key/${params.id}`);
  const k = find(platform.state.apiKeys, params.id, "API key");
  k.revoked = true;
  return { id: k.id, revoked: true };
});
route("POST", "/graphql", ({ platform, ctx, body }) => {
  const c = ctx("studio");
  const q = String(body.query ?? "");
  const m = q.match(/query\s*\{\s*(\w+)(?:\([^)]*\))?\s*\{([^}]*)\}/);
  if (!m) return { data: null, errors: [{ message: "only 'query { Entity(args) { fields } }' is supported" }] };
  const entityName = m[1];
  const fields = m[2].trim().split(/\s+/).filter(Boolean);
  const entity = platform.state.entities.find((e) => e.name === entityName);
  if (!entity) return { data: null, errors: [{ message: `Entity ${entityName} not found` }] };
  platform.requirePermission(c, entity.readPermission, `${entityName}.list`, `entity/${entityName}`);
  const rows = platform.records(entityName).filter((r) => !r.deletedAt).map((r) => {
    const row: Record<string, unknown> = { id: r.id };
    for (const f of fields) if (f in r.values) row[f] = r.values[f];
    return row;
  });
  return { data: { [entityName]: rows } };
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
  const applicationId = query.get("applicationId");
  return page(
    platform.state.approvals
      .filter((a) => !status || a.status === status)
      .filter((a) => !applicationId || a.subject?.applicationId === applicationId)
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

route("GET", "/events", ({ platform, query }) => {
  const applicationId = query.get("applicationId");
  const rows = [...platform.state.events].reverse();
  return page(applicationId ? rows.filter((e) => (e.payload as Record<string, unknown>)?.applicationId === applicationId) : rows, query);
});
route("GET", "/status", ({ platform }) => {
  const components = [
    ...platform.state.connections.map((d) => ({ kind: "database", resource: d.name, status: d.status === "connected" ? "healthy" : d.status === "degraded" ? "degraded" : "down", detail: d.host })),
    ...platform.state.integrations.map((i) => ({ kind: "integration", resource: i.name, status: i.status === "failing" ? "down" : i.status === "untested" ? "degraded" : "healthy", detail: i.target })),
    { kind: "api", resource: "wsn-service", status: "healthy", detail: "serving" },
    { kind: "agent-runtime", resource: "wsn-ai-service", status: "healthy", detail: "connected" },
    { kind: "observer", resource: "wsn-observer", status: "healthy", detail: "ingesting" },
  ];
  const status = components.some((c) => c.status === "down") ? "down" : components.some((c) => c.status === "degraded") ? "degraded" : "healthy";
  return { status, service: "wsn-service", version: "mock", uptimeSeconds: 3600, time: platform.now(), components };
}, { public: true });
route("GET", "/alerts", ({ platform }) => list(platform.state.alertRules));
route("POST", "/alerts", ({ platform, ctx, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "control.manage", "alert.create", "alert");
  const input = body as AlertRuleInput;
  const source = input.source ?? "audit";
  if (!input.name?.trim() || !(input.threshold > 0) || !(input.windowMinutes > 0) || (source !== "slo" && !input.action?.trim()))
    fail(422, "VALIDATION_FAILED", "An alert needs a name, an action or event type, a threshold and a window in minutes");
  if (source === "slo") {
    if (!input.sloId && !input.action?.trim()) fail(422, "VALIDATION_FAILED", "An SLO alert needs an sloId or the operation name");
    if (input.sloId && !platform.state.slos.some((x) => x.id === input.sloId)) fail(422, "VALIDATION_FAILED", `SLO ${input.sloId} does not exist`);
  }
  if (input.webhookUrl) assertPublicUrl(input.webhookUrl);
  const now = platform.now();
  const rule: AlertRule = { ...input, id: platform.nextId("alr"), source, active: input.active ?? true, name: input.name.trim(), action: (input.action ?? "").trim(), createdAt: now, updatedAt: now };
  platform.state.alertRules.push(rule);
  // mock evaluator: slo rules fire on the SLO's burn rate ×100, audit/event rules on the window count
  let count = 0;
  if (source === "slo") {
    const slo = platform.state.slos.find((x) => x.id === rule.sloId || x.operation === rule.action);
    if (slo) {
      const since = new Date(Date.now() - slo.windowMinutes * 60000).toISOString();
      const rows = platform.state.audit.filter((a) => a.action === slo.operation && a.time >= since);
      const calls = rows.length;
      const errors = rows.filter((r) => r.outcome !== "allowed").length;
      const successRate = calls > 0 ? (calls - errors) / calls : 1;
      count = calls > 0 ? Math.round(((1 - successRate) / Math.max(1 - slo.targetSuccess, 0.0001)) * 100) : 0;
    }
  } else {
    const since = new Date(Date.now() - rule.windowMinutes * 60000).toISOString();
    count = platform.state.audit.filter((a) => a.action === rule.action && (!rule.outcome || a.outcome === rule.outcome) && a.time >= since).length;
  }
  if (count >= rule.threshold) {
    platform.state.alertFires.push({ id: platform.nextId("fire"), ruleId: rule.id, firedAt: now, count, status: "firing", createdAt: now });
  }
  platform.audit(c, "alert.create", `alert/${rule.id}`, "allowed", rule.name);
  return rule;
});
route("PUT", "/alerts/:id", ({ platform, ctx, params, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "control.manage", "alert.update", `alert/${params.id}`);
  const rule = find(platform.state.alertRules, params.id, "Alert rule");
  Object.assign(rule, body, { updatedAt: platform.now() });
  return rule;
});
route("DELETE", "/alerts/:id", ({ platform, ctx, params }) => {
  platform.requirePermission(ctx("control"), "control.manage", "alert.delete", `alert/${params.id}`);
  const i = platform.state.alertRules.findIndex((r) => r.id === params.id);
  if (i < 0) fail(404, "NOT_FOUND", "Alert rule not found");
  platform.state.alertRules.splice(i, 1);
  return { id: params.id, deleted: true };
});
route("GET", "/alerts/:id/fires", ({ platform, params }) => list(platform.state.alertFires.filter((f) => f.ruleId === params.id)));
route("POST", "/alerts/:id/fires/:fireId/ack", ({ platform, ctx, params }) => {
  platform.requirePermission(ctx("control"), "control.manage", "alert.ack", `alert/${params.id}/${params.fireId}`);
  const f = find(platform.state.alertFires, params.fireId, "Alert fire");
  if (f.ruleId !== params.id) fail(404, "NOT_FOUND", "Alert fire not found");
  f.status = "acked";
  f.ackedBy = ctx("control").actor.name;
  f.ackedAt = platform.now();
  return f;
});
route("GET", "/slos", ({ platform }) => list(platform.state.slos));
route("POST", "/slos", ({ platform, ctx, body }) => {
  const c = ctx("control");
  platform.requirePermission(c, "control.manage", "slo.create", "slo");
  const input = body as SloInput;
  if (!input.operation?.trim() || !(input.targetSuccess > 0) || !(input.targetP95Ms > 0) || !(input.windowMinutes > 0))
    fail(422, "VALIDATION_FAILED", "An SLO needs an operation, a success target, a p95 target (ms) and a window in minutes");
  const slo: Slo = { id: platform.nextId("slo"), operation: input.operation.trim(), targetSuccess: input.targetSuccess, targetP95Ms: input.targetP95Ms, windowMinutes: input.windowMinutes, createdAt: platform.now() };
  platform.state.slos.push(slo);
  return slo;
});
route("GET", "/slos/:id/status", ({ platform, params }) => {
  const slo = find(platform.state.slos, params.id, "SLO");
  const since = new Date(Date.now() - slo.windowMinutes * 60000).toISOString();
  const rows = platform.state.audit.filter((a) => a.action === slo.operation && a.time >= since);
  const calls = rows.length;
  const errors = rows.filter((r) => r.outcome !== "allowed").length;
  const successRate = calls > 0 ? (calls - errors) / calls : 1;
  const breached = calls > 0 && (successRate < slo.targetSuccess || 120 > slo.targetP95Ms);
  return { sloId: slo.id, operation: slo.operation, calls, errors, successRate, p95Ms: 120, targetP95Ms: slo.targetP95Ms, breached };
});
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
route("GET", "/errors", ({ platform, ctx, query }) => {
  platform.requirePermission(ctx("control"), "audit.read", "error.list", "errors");
  const q = query.get("q")?.toLowerCase();
  const service = query.get("serviceName");
  return page(
    errorGroups(platform)
      .filter((g) => !service || g.service === service)
      .filter((g) => !q || `${g.message} ${g.spanName}`.toLowerCase().includes(q)),
    query,
  );
});
route("GET", "/services", ({ platform, ctx }) => {
  platform.requirePermission(ctx("control"), "audit.read", "service.list", "services");
  return list(serviceStats(platform));
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
