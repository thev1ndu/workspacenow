import type {
  Application,
  ApplicationPlan,
  Deployment,
  EntityField,
  EnvironmentKey,
  Release,
} from "@workspacenow/types";
import { DEFAULT_SLO, ownedEntities, planFromApplication, planOperations, validatePlan, validatePlanChanges } from "@workspacenow/types";
import { fail, type ExecutionContext, type Platform } from "./platform";

type PlannedEntity = ApplicationPlan["entities"][number];

const f = (name: string, label: string, type: EntityField["type"], extra: Partial<EntityField> = {}): EntityField => ({
  name,
  label,
  type,
  ...extra,
});

interface Template {
  match: string[];
  name: string;
  description: string;
  department: string;
  entities: PlannedEntity[];
  workflows: string[];
}

const TEMPLATES: Template[] = [
  {
    match: ["employee", "leave", "hr", "staff"],
    name: "Employee Management",
    description: "Employee registration, department assignment, documents and leave approvals.",
    department: "dep-hr",
    entities: [
      {
        name: "Employee",
        label: "Employee",
        description: "A person employed by the organization.",
        fields: [
          f("employeeNumber", "Employee number", "string", { required: true, unique: true }),
          f("fullName", "Full name", "string", { required: true }),
          f("email", "Email", "string", { required: true, unique: true }),
          f("department", "Department", "enum", { enumValues: ["Store Operations", "Procurement", "Finance", "Human Resources"] }),
          f("startDate", "Start date", "date"),
        ],
        relationships: [{ name: "leaveRequests", kind: "one-to-many", target: "LeaveRequest" }],
      },
      {
        name: "LeaveRequest",
        label: "Leave request",
        description: "A request by an Employee for time off.",
        fields: [
          f("employee", "Employee", "reference", { required: true, reference: "Employee" }),
          f("startDate", "Start date", "date", { required: true }),
          f("endDate", "End date", "date", { required: true }),
          f("type", "Leave type", "enum", { enumValues: ["annual", "sick", "unpaid"], defaultValue: "annual" }),
          f("status", "Status", "enum", { enumValues: ["pending", "approved", "rejected"], defaultValue: "pending" }),
        ],
        relationships: [{ name: "employee", kind: "many-to-one", target: "Employee" }],
      },
      {
        name: "EmployeeDocument",
        label: "Employee document",
        description: "A document held on an Employee's file.",
        fields: [
          f("employee", "Employee", "reference", { required: true, reference: "Employee" }),
          f("title", "Title", "string", { required: true }),
          f("category", "Category", "enum", { enumValues: ["contract", "identity", "certificate"] }),
        ],
        relationships: [{ name: "employee", kind: "many-to-one", target: "Employee" }],
      },
    ],
    workflows: ["Leave approval"],
  },
  {
    match: ["customer", "support", "ticket", "complaint"],
    name: "Customer Support",
    description: "Customer cases, ticket triage and resolution tracking.",
    department: "dep-stores",
    entities: [
      {
        name: "Customer",
        label: "Customer",
        description: "A person or business buying from the organization.",
        fields: [
          f("name", "Name", "string", { required: true }),
          f("email", "Email", "string", { unique: true }),
          f("loyaltyTier", "Loyalty tier", "enum", { enumValues: ["standard", "silver", "gold"], defaultValue: "standard" }),
        ],
        relationships: [{ name: "tickets", kind: "one-to-many", target: "SupportTicket" }],
      },
      {
        name: "SupportTicket",
        label: "Support ticket",
        description: "A customer issue being worked on.",
        fields: [
          f("customer", "Customer", "reference", { required: true, reference: "Customer" }),
          f("subject", "Subject", "string", { required: true }),
          f("priority", "Priority", "enum", { enumValues: ["low", "normal", "high"], defaultValue: "normal" }),
          f("status", "Status", "enum", { enumValues: ["open", "in-progress", "resolved"], defaultValue: "open" }),
        ],
        relationships: [{ name: "customer", kind: "many-to-one", target: "Customer" }],
      },
    ],
    workflows: ["Ticket escalation"],
  },
  {
    match: ["asset", "equipment", "device", "maintenance"],
    name: "Asset Tracking",
    description: "Store equipment register, assignment and maintenance history.",
    department: "dep-it",
    entities: [
      {
        name: "Asset",
        label: "Asset",
        description: "A physical item of equipment the organization owns.",
        fields: [
          f("tag", "Asset tag", "string", { required: true, unique: true }),
          f("name", "Name", "string", { required: true }),
          f("store", "Store", "enum", { enumValues: ["Colombo City", "Kandy", "Galle"] }),
          f("condition", "Condition", "enum", { enumValues: ["good", "needs-service", "retired"], defaultValue: "good" }),
        ],
        relationships: [{ name: "maintenance", kind: "one-to-many", target: "MaintenanceRecord" }],
      },
      {
        name: "MaintenanceRecord",
        label: "Maintenance record",
        description: "Service work performed on an Asset.",
        fields: [
          f("asset", "Asset", "reference", { required: true, reference: "Asset" }),
          f("performedOn", "Performed on", "date", { required: true }),
          f("notes", "Notes", "text"),
        ],
        relationships: [{ name: "asset", kind: "many-to-one", target: "Asset" }],
      },
    ],
    workflows: ["Maintenance reminder"],
  },
];

function toPascal(words: string[]): string {
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

/** The Application Architect agent's plan for a natural-language request. */
export function planApplication(prompt: string): ApplicationPlan {
  const text = prompt.toLowerCase();
  const template = TEMPLATES.find((t) => t.match.some((m) => text.includes(m)));
  if (template) {
    return {
      prompt,
      name: template.name,
      description: template.description,
      ownerDepartmentId: template.department,
      entities: template.entities,
      pages: template.entities.flatMap((e) => [
        { title: `${e.label}s`, kind: "list" as const, entity: e.name },
        { title: `New ${e.label.toLowerCase()}`, kind: "form" as const, entity: e.name },
      ]),
      operations: planOperations(template.entities),
      workflows: template.workflows,
      permissions: ["studio.manage to edit", "data.manage to change entities", "control.manage to grant access"],
      slo: { ...DEFAULT_SLO },
    };
  }
  const words = text.match(/[a-z]+/g)?.filter((w) => w.length > 3 && !["build", "create", "application", "with", "that", "manage", "management", "track"].includes(w)) ?? [];
  const subject = toPascal(words.slice(0, 1).length ? words.slice(0, 1) : ["item"]);
  const entity: PlannedEntity = {
    name: subject,
    label: subject,
    description: `A ${subject.toLowerCase()} managed by this application.`,
    fields: [
      f("name", "Name", "string", { required: true }),
      f("description", "Description", "text"),
      f("status", "Status", "enum", { enumValues: ["active", "inactive"], defaultValue: "active" }),
    ],
    relationships: [],
  };
  return {
    prompt,
    name: `${subject} Management`,
    description: `Generated from: "${prompt}"`,
    ownerDepartmentId: "dep-it",
    entities: [entity],
    pages: [
      { title: `${subject} list`, kind: "list", entity: subject },
      { title: `New ${subject.toLowerCase()}`, kind: "form", entity: subject },
    ],
    operations: planOperations([entity]),
    workflows: [],
    permissions: ["studio.manage to edit"],
    slo: { ...DEFAULT_SLO },
  };
}

/** Keeps the SLO records tagged with the app in step with its plan: one per operation while enabled. */
function syncAppSlos(platform: Platform, appId: string, operations: string[], slo: ApplicationPlan["slo"]): void {
  platform.state.slos = platform.state.slos.filter((s) => s.applicationId !== appId);
  if (!slo?.enabled) return;
  const now = platform.now();
  for (const operation of operations) {
    platform.state.slos.push({
      id: platform.nextId("slo"),
      operation,
      applicationId: appId,
      targetSuccess: slo.targetSuccess,
      targetP95Ms: slo.targetP95Ms,
      windowMinutes: slo.windowMinutes,
      createdAt: now,
    });
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** A planned entity as a draft entity owned by the application. */
function addEntity(platform: Platform, app: Application, e: PlannedEntity, now: string): void {
  platform.state.entities.push({
    ...e,
    id: platform.nextId("ent"),
    scope: "application",
    ownerApplicationId: app.id,
    events: [`${e.name}.Created`, `${e.name}.Updated`],
    // Generated applications are governed by the platform's data permission until roles are refined.
    readPermission: "data.manage",
    writePermission: "data.manage",
    version: 1,
    lifecycle: "draft",
    updatedAt: now,
  });
}

/** The application's generated CRUD API, created the first time it is needed. */
function applicationApi(platform: Platform, app: Application) {
  const existing = platform.state.apis.find((a) => a.applicationId === app.id);
  if (existing) return existing;
  const api = {
    id: platform.nextId("api"),
    name: `${app.name} API`,
    basePath: `/${app.slug}`,
    applicationId: app.id,
    version: "0.1.0",
    lifecycle: "draft" as const,
    description: `Generated CRUD operations for ${app.name}.`,
  };
  platform.state.apis.push(api);
  return api;
}

function addCrudOperations(platform: Platform, apiId: string, e: PlannedEntity): void {
  const path = `/${slugify(e.label)}s`;
  const ops = [
    { method: "GET" as const, path, verb: "list", summary: `List ${e.label.toLowerCase()}s` },
    { method: "GET" as const, path: `${path}/{id}`, verb: "get", summary: `Get a ${e.label.toLowerCase()}` },
    { method: "POST" as const, path, verb: "create", summary: `Create a ${e.label.toLowerCase()}` },
    { method: "PATCH" as const, path: `${path}/{id}`, verb: "update", summary: `Update a ${e.label.toLowerCase()}` },
  ];
  for (const op of ops) {
    platform.state.operations.push({
      id: platform.nextId("op"),
      apiId,
      method: op.method,
      path: op.path,
      summary: op.summary,
      businessOperation: `${e.name}.${op.verb}`,
      permission: "data.manage",
      rateLimitPerMinute: 120,
    });
  }
}

/** Applies an approved plan: Application Blueprint, entities, pages and a CRUD API. */
// planApplicationEdit revises an existing app's plan from a change prompt: keeps the current
// blueprint and applies a simple deterministic change so the editor has something to review.
export function planApplicationEdit(platform: Platform, applicationId: string, prompt: string): ApplicationPlan {
  const app = platform.state.applications.find((a) => a.id === applicationId);
  if (!app) fail(404, "NOT_FOUND", "Application not found");
  const entities = platform.state.entities;
  const current = planFromApplication(app, entities);
  const text = prompt.toLowerCase();
  const revised: ApplicationPlan = { ...current, prompt };
  const words = text.match(/[a-z]+/g)?.filter((w) => w.length > 3 && !["with", "that", "this", "add", "please", "want", "need"].includes(w)) ?? [];
  const subject = words[0] ? toPascal([words[0]]) : "Note";
  if (!current.entities.some((e) => e.name === subject)) {
    const entity: PlannedEntity = {
      name: subject,
      label: subject,
      description: `A ${subject.toLowerCase()} added by the Architect.`,
      fields: [
        { name: "title", label: "Title", type: "string", required: true },
        { name: "status", label: "Status", type: "enum", enumValues: ["open", "done"] },
      ],
      relationships: [],
    };
    revised.entities = [...current.entities, entity];
    revised.pages = [...current.pages, { title: `${subject}s`, kind: "list", entity: subject }];
  }
  revised.operations = planOperations(revised.entities);
  return revised;
}

export function applyPlan(platform: Platform, ctx: ExecutionContext, plan: ApplicationPlan): Application {
  platform.requirePermission(ctx, "studio.manage", "application.create", "application");
  const slug = slugify(plan.name);
  if (platform.state.applications.some((a) => a.slug === slug)) {
    fail(409, "CONFLICT", `An application named ${plan.name} already exists`);
  }
  // Plans can be hand-edited, so the platform re-checks every one before creating anything.
  const problems = validatePlan(plan, platform.state.entities.map((e) => e.name));
  if (problems.length > 0) fail(422, "VALIDATION_FAILED", problems.slice(0, 3).join("; "));

  const now = platform.now();
  const app: Application = {
    id: platform.nextId("app"),
    name: plan.name,
    slug,
    description: plan.description,
    ownerDepartmentId: plan.ownerDepartmentId,
    lifecycle: "draft",
    version: "0.1.0",
    entityNames: plan.entities.map((e) => e.name),
    pages: plan.pages.map((p) => ({ title: p.title, kind: p.kind, entity: p.entity, scan: p.scan, id: platform.nextId("page") })),
    slo: plan.slo ? { ...plan.slo } : undefined,
    createdAt: now,
    updatedAt: now,
  };
  platform.state.applications.push(app);
  const api = applicationApi(platform, app);
  for (const e of plan.entities) {
    addEntity(platform, app, e, now);
    addCrudOperations(platform, api.id, e);
  }
  syncAppSlos(platform, app.id, planOperations(plan.entities), plan.slo);
  platform.audit(ctx, "application.create", `application/${app.id}`, "allowed", plan.prompt ? `From prompt: ${plan.prompt}` : "Built in the visual editor");
  platform.publish(ctx, "Application.Created", `application:${app.slug}`, { applicationId: app.id });
  return app;
}

/**
 * Applies an edited plan to an existing application. Only changes that keep its records valid are
 * accepted (see validatePlanChanges); new entities get a CRUD API like those of a new application.
 */
export function updateApplication(platform: Platform, ctx: ExecutionContext, applicationId: string, plan: ApplicationPlan): Application {
  platform.requirePermission(ctx, "studio.manage", "application.update", `application/${applicationId}`);
  const app = platform.state.applications.find((a) => a.id === applicationId);
  if (!app) fail(404, "NOT_FOUND", "Application not found");
  const slug = slugify(plan.name);
  if (platform.state.applications.some((a) => a.id !== app.id && a.slug === slug)) {
    fail(409, "CONFLICT", `An application named ${plan.name} already exists`);
  }
  const saved = ownedEntities(app, platform.state.entities);
  const others = platform.state.entities.map((e) => e.name).filter((name) => !saved.some((e) => e.name === name));
  const problems = [...validatePlan(plan, others), ...validatePlanChanges(saved, plan)];
  if (problems.length > 0) fail(422, "VALIDATION_FAILED", problems.slice(0, 3).join("; "));

  const now = platform.now();
  const api = applicationApi(platform, app);
  for (const e of plan.entities) {
    const entity = saved.find((s) => s.name === e.name);
    if (!entity) {
      addEntity(platform, app, e, now);
      addCrudOperations(platform, api.id, e);
      continue;
    }
    const next = { label: e.label, description: e.description, fields: e.fields, relationships: e.relationships };
    if (JSON.stringify(next) === JSON.stringify({ label: entity.label, description: entity.description, fields: entity.fields, relationships: entity.relationships })) continue;
    Object.assign(entity, next, { version: entity.version + 1, updatedAt: now });
  }
  app.name = plan.name;
  app.description = plan.description;
  app.ownerDepartmentId = plan.ownerDepartmentId;
  // Shared entities the application uses but does not own stay listed.
  app.entityNames = [...new Set([...app.entityNames, ...plan.entities.map((e) => e.name)])];
  app.pages = plan.pages.map((p) => ({
    title: p.title,
    kind: p.kind,
    entity: p.entity,
    scan: p.scan,
    id: p.id && app.pages.some((existing) => existing.id === p.id) ? p.id : platform.nextId("page"),
  }));
  app.slo = plan.slo ? { ...plan.slo } : undefined;
  app.updatedAt = now;
  syncAppSlos(platform, app.id, planOperations(plan.entities), plan.slo);
  platform.audit(ctx, "application.update", `application/${app.id}`, "allowed", "Edited in the visual editor");
  platform.publish(ctx, "Application.Updated", `application:${app.slug}`, { applicationId: app.id });
  return app;
}

function bump(version: string): string {
  const [major, minor] = version.split(".").map(Number);
  return `${major}.${(minor ?? 0) + 1}.0`;
}

export function createRelease(platform: Platform, ctx: ExecutionContext, applicationId: string, notes: string): Release {
  platform.requirePermission(ctx, "studio.manage", "release.create", `application/${applicationId}`);
  const app = platform.state.applications.find((a) => a.id === applicationId);
  if (!app) fail(404, "NOT_FOUND", "Application not found");
  const hasReleases = platform.state.releases.some((r) => r.applicationId === app.id);
  const version = hasReleases ? bump(app.version) : app.version === "0.1.0" ? "1.0.0" : app.version;
  const release: Release = {
    id: platform.nextId("rel"),
    applicationId: app.id,
    version,
    notes,
    createdAt: platform.now(),
    createdBy: ctx.actor.name,
  };
  platform.state.releases.push(release);
  app.version = version;
  app.lifecycle = "released";
  app.updatedAt = release.createdAt;
  for (const entity of platform.state.entities) {
    if (entity.ownerApplicationId === app.id) entity.lifecycle = "released";
  }
  platform.audit(ctx, "release.create", `application/${app.id}`, "allowed", `Release ${version}`);
  return release;
}

const PROMOTION_ORDER: EnvironmentKey[] = ["development", "staging", "production"];

export function deploy(
  platform: Platform,
  ctx: ExecutionContext,
  applicationId: string,
  environment: EnvironmentKey,
  version: string,
): Deployment {
  const app = platform.state.applications.find((a) => a.id === applicationId);
  if (!app) fail(404, "NOT_FOUND", "Application not found");
  if (!platform.state.releases.some((r) => r.applicationId === app.id && r.version === version)) {
    fail(422, "VALIDATION_FAILED", `Release ${version} does not exist`);
  }
  const env = platform.state.environments.find((e) => e.key === environment);
  if (!env) fail(404, "NOT_FOUND", `Environment ${environment} not found`);
  if (env.requiresApproval) {
    platform.requirePermission(ctx, "deployment.promote", "deployment.promote", `application/${app.id}`);
  } else {
    platform.requirePermission(ctx, "studio.manage", "deployment.create", `application/${app.id}`);
  }
  const previous = PROMOTION_ORDER[PROMOTION_ORDER.indexOf(environment) - 1];
  if (
    previous &&
    !platform.state.deployments.some(
      (d) => d.applicationId === app.id && d.environment === previous && d.version === version,
    )
  ) {
    fail(409, "INVALID_STATE", `Release ${version} must be deployed to ${previous} first`);
  }
  for (const d of platform.state.deployments) {
    if (d.applicationId === app.id && d.environment === environment && d.status === "active") d.status = "superseded";
  }
  const deployment: Deployment = {
    id: platform.nextId("dep"),
    applicationId: app.id,
    environment,
    version,
    status: "active",
    deployedAt: platform.now(),
    deployedBy: ctx.actor.name,
  };
  platform.state.deployments.push(deployment);
  platform.audit(ctx, "deployment.create", `application/${app.id}`, "allowed", `${version} to ${environment}`);
  platform.publish(ctx, "Deployment.Completed", `application:${app.slug}`, { environment, version });
  return deployment;
}
