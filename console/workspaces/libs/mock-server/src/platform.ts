import {
  ApiError,
  type Actor,
  type ApiErrorBody,
  type AuditRecord,
  type Entity,
  type EntityRecord,
  type EntryPoint,
  type FieldValue,
  type Permission,
  type PlatformEvent,
} from "@workspacenow/types";
import type { PlatformState } from "./state";

/** Who is acting, with what permissions, inside which trace. */
export interface ExecutionContext {
  actor: Actor;
  permissions: ReadonlySet<Permission>;
  traceId: string;
  entryPoint: EntryPoint;
}

export interface OperationDefinition {
  name: string;
  summary: string;
  permission: Permission;
  kind: "read" | "write";
  entity?: string;
  handler: (platform: Platform, ctx: ExecutionContext, input: Record<string, unknown>) => unknown;
}

type EventListener = (platform: Platform, event: PlatformEvent) => void;

export function fail(status: number, code: ApiErrorBody["code"], message: string, traceId?: string): never {
  throw new ApiError({ status, code, message, traceId });
}

/**
 * The shared platform runtime. Every entry point (Studio, API, MCP, Agent, Workflow)
 * reaches business logic only through {@link Platform.invoke}, so authorization,
 * validation, event publication and audit cannot diverge between interfaces.
 */
export class Platform {
  readonly state: PlatformState;
  private clock: () => Date;
  private readonly operations = new Map<string, OperationDefinition>();
  private readonly listeners: EventListener[] = [];
  private outbox: PlatformEvent[] = [];
  private depth = 0;

  constructor(state: PlatformState, clock: () => Date = () => new Date()) {
    this.state = state;
    this.clock = clock;
  }

  setClock(clock: () => Date): void {
    this.clock = clock;
  }

  now(): string {
    return this.clock().toISOString();
  }

  nextId(prefix: string): string {
    this.state.sequence += 1;
    return `${prefix}-${this.state.sequence.toString(36).padStart(4, "0")}`;
  }

  newTraceId(): string {
    return this.nextId("trace");
  }

  /* Identity and authorization */

  permissionsForUser(userId: string): Set<Permission> {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return new Set();
    const roleIds = this.rolesForUser(userId).map((r) => r.id);
    const permissions = this.state.roles
      .filter((role) => roleIds.includes(role.id))
      .flatMap((role) => role.permissions);
    return new Set(permissions);
  }

  rolesForUser(userId: string) {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return [];
    const roleIds = new Set(
      this.state.groupMappings.filter((m) => user.groups.includes(m.group)).map((m) => m.roleId),
    );
    return this.state.roles.filter((role) => roleIds.has(role.id));
  }

  userContext(userId: string, entryPoint: EntryPoint, traceId = this.newTraceId()): ExecutionContext {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) fail(401, "UNAUTHENTICATED", "Unknown user");
    return {
      actor: { kind: "user", id: user.id, name: user.name },
      permissions: this.permissionsForUser(user.id),
      traceId,
      entryPoint,
    };
  }

  /** Guard for platform administration actions that are not Business Operations. */
  requirePermission(ctx: ExecutionContext, permission: Permission, action: string, resource: string): void {
    if (!ctx.permissions.has(permission)) {
      this.audit(ctx, action, resource, "denied", `Missing permission ${permission}`);
      fail(403, "FORBIDDEN", `${ctx.actor.name} lacks permission ${permission}`, ctx.traceId);
    }
  }

  /* Business Operations */

  registerOperation(definition: OperationDefinition): void {
    this.operations.set(definition.name, definition);
  }

  getOperation(name: string): OperationDefinition | undefined {
    return this.operations.get(name) ?? this.entityOperation(name);
  }

  listOperations(): OperationDefinition[] {
    const generic = this.state.entities.flatMap((entity) =>
      ["list", "get", "create", "update"].map((verb) => this.entityOperation(`${entity.name}.${verb}`)!),
    );
    return [...this.operations.values(), ...generic];
  }

  /** The single governed execution path: authorize, run, audit, then publish events. */
  invoke<T = unknown>(ctx: ExecutionContext, name: string, input: Record<string, unknown> = {}): T {
    const operation = this.getOperation(name);
    if (!operation) fail(404, "NOT_FOUND", `Unknown business operation ${name}`, ctx.traceId);
    if (!ctx.permissions.has(operation.permission)) {
      this.audit(ctx, name, operation.entity ?? name, "denied", `Missing permission ${operation.permission}`);
      fail(403, "FORBIDDEN", `${ctx.actor.name} lacks permission ${operation.permission} for ${name}`, ctx.traceId);
    }
    this.depth += 1;
    try {
      const output = operation.handler(this, ctx, input) as T;
      this.audit(ctx, name, describeResource(operation, input, output), "allowed");
      return output;
    } catch (error) {
      if (error instanceof ApiError && error.status !== 403) {
        this.audit(ctx, name, operation.entity ?? name, "failed", error.message);
      }
      throw error;
    } finally {
      this.depth -= 1;
      if (this.depth === 0) this.flushOutbox();
    }
  }

  /* Events */

  onEvent(listener: EventListener): void {
    this.listeners.push(listener);
  }

  publish(ctx: ExecutionContext, type: string, source: string, payload: Record<string, unknown>): PlatformEvent {
    const event: PlatformEvent = {
      id: this.nextId("evt"),
      type,
      source,
      traceId: ctx.traceId,
      payload,
      time: this.now(),
    };
    this.state.events.push(event);
    // Subscribers run after the publishing operation has committed and been audited.
    this.outbox.push(event);
    if (this.depth === 0) this.flushOutbox();
    return event;
  }

  private flushOutbox(): void {
    while (this.outbox.length > 0) {
      const event = this.outbox.shift()!;
      for (const listener of this.listeners) listener(this, event);
    }
  }

  /* Audit */

  audit(
    ctx: ExecutionContext,
    action: string,
    resource: string,
    outcome: AuditRecord["outcome"],
    detail?: string,
  ): AuditRecord {
    const record: AuditRecord = {
      id: this.nextId("aud"),
      traceId: ctx.traceId,
      time: this.now(),
      actor: ctx.actor,
      entryPoint: ctx.entryPoint,
      action,
      resource,
      outcome,
      detail,
    };
    this.state.audit.push(record);
    return record;
  }

  /* Entity Runtime */

  entity(name: string): Entity {
    const entity = this.state.entities.find((e) => e.name === name);
    if (!entity) fail(404, "NOT_FOUND", `Entity ${name} not found`);
    return entity;
  }

  records(entityName: string): EntityRecord[] {
    return this.state.records.filter((r) => r.entity === entityName);
  }

  record(entityName: string, id: string): EntityRecord {
    const record = this.state.records.find((r) => r.entity === entityName && r.id === id);
    if (!record) fail(404, "NOT_FOUND", `${entityName} ${id} not found`);
    return record;
  }

  createRecord(ctx: ExecutionContext, entityName: string, values: Record<string, FieldValue>): EntityRecord {
    const entity = this.entity(entityName);
    const normalized = this.validate(entity, withDefaults(entity, values));
    const now = this.now();
    const record: EntityRecord = {
      id: this.nextId(recordIdPrefix(entity.name)),
      entity: entity.name,
      values: normalized,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.actor.name,
    };
    this.state.records.push(record);
    this.publish(ctx, `${entity.name}.Created`, `entity:${entity.name}`, { recordId: record.id });
    return record;
  }

  updateRecord(
    ctx: ExecutionContext,
    entityName: string,
    id: string,
    changes: Record<string, FieldValue>,
  ): EntityRecord {
    const entity = this.entity(entityName);
    const record = this.record(entityName, id);
    const normalized = this.validate(entity, { ...record.values, ...changes }, id);
    record.values = normalized;
    record.updatedAt = this.now();
    this.publish(ctx, `${entity.name}.Updated`, `entity:${entity.name}`, {
      recordId: record.id,
      fields: Object.keys(changes),
    });
    return record;
  }

  /** Removes a record, refusing while other records or a pending approval still point at it. */
  deleteRecord(ctx: ExecutionContext, entityName: string, id: string): { id: string; deleted: true } {
    const entity = this.entity(entityName);
    const record = this.record(entityName, id);
    const referencing = this.state.entities.flatMap((e) =>
      e.fields
        .filter((f) => f.type === "reference" && f.reference === entity.name)
        .flatMap((f) => this.records(e.name).filter((r) => r.values[f.name] === id).map(() => e.label)),
    );
    if (referencing.length > 0) {
      fail(409, "CONFLICT", `${id} is used by ${referencing.length} ${referencing.length === 1 ? "record" : "records"} (${[...new Set(referencing)].join(", ")})`);
    }
    if (this.state.approvals.some((a) => a.status === "pending" && a.subject?.entity === entity.name && a.subject.recordId === id)) {
      fail(409, "CONFLICT", `${id} has a pending approval; decide it first`);
    }
    this.state.records = this.state.records.filter((r) => r !== record);
    this.publish(ctx, `${entity.name}.Deleted`, `entity:${entity.name}`, { recordId: id });
    return { id, deleted: true };
  }

  private validate(entity: Entity, values: Record<string, FieldValue>, recordId?: string): Record<string, FieldValue> {
    const errors: string[] = [];
    const result: Record<string, FieldValue> = {};
    for (const field of entity.fields) {
      const raw = values[field.name];
      const empty = raw === undefined || raw === null || raw === "";
      if (empty) {
        if (field.required) errors.push(`${field.label} is required`);
        result[field.name] = null;
        continue;
      }
      switch (field.type) {
        case "number":
        case "integer": {
          const num = typeof raw === "number" ? raw : Number(raw);
          if (Number.isNaN(num)) errors.push(`${field.label} must be a number`);
          else if (field.type === "integer" && !Number.isInteger(num)) errors.push(`${field.label} must be a whole number`);
          result[field.name] = num;
          break;
        }
        case "boolean":
          result[field.name] = raw === true || raw === "true";
          break;
        case "enum":
          if (!field.enumValues?.includes(String(raw))) {
            errors.push(`${field.label} must be one of ${field.enumValues?.join(", ")}`);
          }
          result[field.name] = String(raw);
          break;
        case "reference":
          if (!this.state.records.some((r) => r.entity === field.reference && r.id === raw)) {
            errors.push(`${field.label} references a missing ${field.reference}`);
          }
          result[field.name] = String(raw);
          break;
        default:
          result[field.name] = String(raw);
      }
      if (field.unique) {
        const clash = this.records(entity.name).some(
          (r) => r.id !== recordId && r.values[field.name] === result[field.name],
        );
        if (clash) errors.push(`${field.label} must be unique`);
      }
    }
    if (errors.length > 0) fail(422, "VALIDATION_FAILED", errors.join("; "));
    return result;
  }

  private entityOperation(name: string): OperationDefinition | undefined {
    const [entityName, verb] = name.split(".");
    const entity = this.state.entities.find((e) => e.name === entityName);
    if (!entity || !verb) return undefined;
    const base = { name, entity: entity.name };
    switch (verb) {
      case "list":
        return {
          ...base,
          summary: `List ${entity.label} records`,
          permission: entity.readPermission,
          kind: "read",
          handler: (p) => p.records(entity.name),
        };
      case "get":
        return {
          ...base,
          summary: `Get a ${entity.label} record`,
          permission: entity.readPermission,
          kind: "read",
          handler: (p, _ctx, input) => p.record(entity.name, String(input.id)),
        };
      case "create":
        return {
          ...base,
          summary: `Create a ${entity.label} record`,
          permission: entity.writePermission,
          kind: "write",
          handler: (p, ctx, input) => p.createRecord(ctx, entity.name, input.values as Record<string, FieldValue>),
        };
      case "update":
        return {
          ...base,
          summary: `Update a ${entity.label} record`,
          permission: entity.writePermission,
          kind: "write",
          handler: (p, ctx, input) =>
            p.updateRecord(ctx, entity.name, String(input.id), input.values as Record<string, FieldValue>),
        };
      case "delete":
        return {
          ...base,
          summary: `Delete a ${entity.label} record`,
          permission: entity.writePermission,
          kind: "write",
          handler: (p, ctx, input) => p.deleteRecord(ctx, entity.name, String(input.id)),
        };
      default:
        return undefined;
    }
  }
}

/** "PurchaseOrder" -> "po", "Stock" -> "stoc": distinct, readable record id prefixes. */
function recordIdPrefix(entityName: string): string {
  const capitals = entityName.match(/[A-Z]/g) ?? [];
  return capitals.length > 1 ? capitals.join("").toLowerCase() : entityName.toLowerCase().slice(0, 4);
}

function withDefaults(entity: Entity, values: Record<string, FieldValue>): Record<string, FieldValue> {
  const result = { ...values };
  for (const field of entity.fields) {
    if ((result[field.name] === undefined || result[field.name] === "") && field.defaultValue !== undefined) {
      result[field.name] = field.defaultValue;
    }
  }
  return result;
}

function describeResource(operation: OperationDefinition, input: Record<string, unknown>, output: unknown): string {
  const id =
    (output && typeof output === "object" && "id" in output && typeof output.id === "string" && output.id) ||
    (typeof input.id === "string" && input.id) ||
    undefined;
  const subject = operation.entity ?? operation.name.split(".")[0];
  return id ? `${subject}/${id}` : subject;
}
