import type { Actor, EntryPoint, FieldValue, Id, ResourceType } from "./domain";

export interface ListResponse<T> {
  items: T[];
  total: number;
}

/** Error body returned by the platform for any rejected request. */
export interface ApiErrorBody {
  status: number;
  code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_FAILED" | "CONFLICT" | "INVALID_STATE";
  message: string;
  traceId?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = body.status;
    this.body = body;
  }
}

/** Invocation of a governed Business Operation from any entry point. */
export interface InvokeOperationRequest {
  operation: string;
  input: Record<string, unknown>;
  entryPoint: EntryPoint;
}

export interface OperationResult<T = unknown> {
  traceId: string;
  output: T;
}

export interface BusinessOperationDescriptor {
  name: string;
  summary: string;
  permission: string;
  entity?: string;
  kind: "read" | "write";
}

export interface RecordInput {
  values: Record<string, FieldValue>;
}

/** One match from the global search, ranked best first. Clients turn it into a link. */
export interface SearchHit {
  type: ResourceType | "record" | "user";
  id: Id;
  title: string;
  subtitle: string;
  /** For records: the entity, and the application page that lists it, when one does. */
  entity?: string;
  appId?: Id;
  pageId?: Id;
}

export interface Session {
  actor: Actor;
  permissions: string[];
  roles: string[];
}

/** One day of platform activity, for trend charts. Type aliases (not interfaces) so rows fit chart data types. */
export type ActivityPoint = {
  date: string;
  apiCalls: number;
  agentToolCalls: number;
  workflowSteps: number;
  denied: number;
};

export type TokenUsagePoint = {
  date: string;
  [model: string]: number | string;
};

/** One OpenBao secret's values, returned by GET /secrets/read (sensitive). */
export type SecretValues = {
  path: string;
  values: Record<string, string>;
};

/** One day of log volume per severity level, for the log-metrics chart. */
export type LogMetricPoint = {
  date: string;
  levels: Record<string, number>;
};

export type EntryPointBreakdown = {
  entryPoint: string;
  allowed: number;
  denied: number;
  failed: number;
};
