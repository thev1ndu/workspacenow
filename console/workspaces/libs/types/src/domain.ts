// WorkspaceNow domain model shared by the console and the platform runtime.
// Terms follow WorkspaceNow/CONTEXT.md.

export type Id = string;
export type IsoDate = string;

export type WorkspaceKey = "studio" | "connect" | "data" | "ai" | "flow" | "control";

export type LifecycleState = "draft" | "preview" | "released" | "archived";

export type EnvironmentKey = "development" | "staging" | "production";

/* Organization and identity */

export interface Organization {
  id: Id;
  name: string;
  installationName: string;
  identityProvider: IdentityProviderConfig;
}

export interface IdentityProviderConfig {
  issuer: string;
  clientId: string;
  type: "keycloak" | "entra-id" | "okta" | "oidc";
  scopes: string[];
  groupsClaim: string;
}

export interface Department {
  id: Id;
  name: string;
  description: string;
}

export interface Team {
  id: Id;
  name: string;
  departmentId: Id;
}

export interface User {
  id: Id;
  name: string;
  email: string;
  title: string;
  departmentId: Id;
  teamId?: Id;
  /** Group claims asserted by the identity provider. */
  groups: string[];
}

export type Permission =
  | "studio.manage"
  | "connect.manage"
  | "data.manage"
  | "ai.manage"
  | "flow.manage"
  | "control.manage"
  | "inventory.read"
  | "inventory.write"
  | "supplier.read"
  | "supplier.write"
  | "procurement.read"
  | "procurement.request"
  | "procurement.approve"
  | "procurement.order"
  | "deployment.promote"
  | "audit.read";

export interface Role {
  id: Id;
  name: string;
  description: string;
  permissions: Permission[];
}

/** Maps an identity-provider group claim to a WorkspaceNow Role. */
export interface GroupRoleMapping {
  group: string;
  roleId: Id;
}

export type ActorKind = "user" | "agent" | "workflow" | "system";

export interface Actor {
  kind: ActorKind;
  id: Id;
  name: string;
  /** For agents running on behalf of a user or workflow. */
  onBehalfOf?: string;
}

/* Data */

export type FieldType = "string" | "text" | "number" | "integer" | "boolean" | "date" | "enum" | "reference";

export interface EntityField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  enumValues?: string[];
  /** Target entity name when type is "reference". */
  reference?: string;
  defaultValue?: string | number | boolean;
}

export type RelationshipKind = "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";

export interface EntityRelationship {
  name: string;
  kind: RelationshipKind;
  target: string;
  via?: string;
}

export type EntityScope = "application" | "organization" | "external";

export interface Entity {
  id: Id;
  name: string;
  label: string;
  description: string;
  scope: EntityScope;
  ownerApplicationId?: Id;
  fields: EntityField[];
  relationships: EntityRelationship[];
  /** Domain events this Entity publishes, e.g. "Stock.LowStockReached". */
  events: string[];
  readPermission: Permission;
  writePermission: Permission;
  version: number;
  lifecycle: LifecycleState;
  updatedAt: IsoDate;
  /** Row-level security: records are only visible when this holds for the caller ("$actor.id" etc. allowed in value). */
  rowFilter?: RowFilter;
}

export interface RowFilter {
  field: string;
  op: "eq" | "neq" | "in";
  value: FieldValue | FieldValue[];
}

export type FieldValue = string | number | boolean | null;

export interface EntityRecord {
  id: Id;
  entity: string;
  values: Record<string, FieldValue>;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  createdBy: string;
  deletedAt?: IsoDate;
  deletedBy?: string;
}

export interface FilterOp {
  field: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: FieldValue | FieldValue[];
}

export interface SavedView {
  id: Id;
  entity: string;
  name: string;
  filters: FilterOp[];
  sortField?: string;
  sortDesc?: boolean;
  limit?: number;
  ownerId: string;
  shared?: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export type SavedViewInput = Omit<SavedView, "id" | "entity" | "ownerId" | "createdAt" | "updatedAt">;

export interface RecordHistoryEntry {
  seq: number;
  entity: string;
  recordId: string;
  actor: string;
  action: "created" | "updated" | "deleted" | "restored";
  changedAt: IsoDate;
  changes: Record<string, FieldValue>;
  snapshot: Record<string, FieldValue> | null;
}

export interface SchemaMigration {
  add?: EntityField[];
  drop?: string[];
  retype?: EntityField[];
  backfill?: Record<string, FieldValue>;
  note?: string;
}

export interface DatabaseConnection {
  id: Id;
  name: string;
  engine: "postgresql" | "mysql" | "sqlserver" | "oracle" | "mongodb" | "redis";
  host: string;
  managed: boolean;
  status: "connected" | "degraded" | "disconnected";
  environment: EnvironmentKey;
}

/* Studio */

export interface Application {
  id: Id;
  name: string;
  slug: string;
  description: string;
  ownerDepartmentId: Id;
  lifecycle: LifecycleState;
  version: string;
  entityNames: string[];
  pages: AppPage[];
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface AppPage {
  id: Id;
  title: string;
  /** "pos" is the store till, built on inventory.checkout; it is seeded, not offered in the builder. */
  kind: "list" | "form" | "dashboard" | "scan" | "pos";
  entity?: string;
  /** For scan pages: how a scanned QR code finds a record, and what scanning it records. */
  scan?: ScanConfig;
}

export interface ScanConfig {
  /** The field whose value the QR code holds, or "id" for the record's own id. */
  matchField: string;
  /** Set this choice when a record is scanned, e.g. a ticket's status to "checked_in". */
  onScan?: { field: string; value: string };
}

export interface Release {
  id: Id;
  applicationId: Id;
  version: string;
  notes: string;
  createdAt: IsoDate;
  createdBy: string;
}

export interface Deployment {
  id: Id;
  applicationId: Id;
  environment: EnvironmentKey;
  version: string;
  status: "active" | "superseded";
  deployedAt: IsoDate;
  deployedBy: string;
}

export interface Environment {
  key: EnvironmentKey;
  name: string;
  description: string;
  requiresApproval: boolean;
}

export interface ApplicationPlan {
  prompt: string;
  name: string;
  description: string;
  ownerDepartmentId: Id;
  entities: Array<Pick<Entity, "name" | "label" | "description" | "fields" | "relationships">>;
  /** A page keeps its id when the plan edits an existing application, so links to it still work. */
  pages: Array<Omit<AppPage, "id"> & { id?: Id }>;
  operations: string[];
  workflows: string[];
  permissions: string[];
}

/* Connect */

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface Api {
  id: Id;
  name: string;
  basePath: string;
  applicationId: Id;
  version: string;
  defaultVersion?: string;
  lifecycle: LifecycleState;
  description: string;
}

export interface ApiOperation {
  id: Id;
  apiId: Id;
  method: HttpMethod;
  path: string;
  summary: string;
  /** The Business Operation this endpoint invokes. */
  businessOperation: string;
  permission: Permission;
  rateLimitPerMinute: number;
  version?: string;
  transform?: { request?: Record<string, string>; response?: Record<string, string> };
  mcp?: McpToolExposure;
}

export interface ApiVersion {
  id: Id;
  apiId: Id;
  version: string;
  status: "active" | "deprecated" | "retired";
  changelog?: string;
  deprecatedAt?: IsoDate;
  sunset?: IsoDate;
  createdAt: IsoDate;
}

export type ApiVersionInput = Pick<ApiVersion, "version" | "status" | "changelog" | "sunset">;

export interface Webhook {
  id: Id;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export type WebhookInput = Omit<Webhook, "id" | "createdAt" | "updatedAt">;

export interface WebhookDelivery {
  id: Id;
  webhookId: Id;
  eventId: string;
  eventType: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  lastStatus?: number;
  lastError?: string;
  deliveredAt?: IsoDate;
  nextRetryAt?: IsoDate;
  createdAt: IsoDate;
}

export interface ApiKey {
  id: Id;
  name: string;
  prefix: string;
  permissions: Permission[];
  quotaPerHour: number;
  revoked: boolean;
  createdAt: IsoDate;
  lastUsedAt?: IsoDate;
}

export interface CreatedApiKey extends ApiKey {
  rawKey: string;
}

export interface PortalCatalogEntry {
  id: Id;
  name: string;
  basePath: string;
  description: string;
  defaultVersion?: string;
  versions: Array<Record<string, unknown>>;
  operations: Array<Record<string, unknown>>;
}

export interface AuthConfig {
  type: "none" | "bearer" | "oauth2";
  token?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecretRef?: string;
  scopes?: string[];
}

export interface McpToolExposure {
  toolName: string;
  description: string;
  enabled: boolean;
}

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  items?: JsonSchema;
}

export interface McpTool {
  name: string;
  description: string;
  source: "workspacenow" | "external";
  serverId: Id;
  operationId?: Id;
  businessOperation?: string;
  permission?: Permission;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  version: string;
}

export interface McpServer {
  id: Id;
  name: string;
  url: string;
  kind: "managed" | "external";
  auth: "oauth2" | "api-key" | "none";
  status: "healthy" | "degraded" | "unreachable";
  tools: Array<Pick<McpTool, "name" | "description">>;
  registeredAt: IsoDate;
}

export type IntegrationInput = Omit<Integration, "id" | "status" | "lastTestedAt">;
export interface Integration {
  id: Id;
  name: string;
  kind: "rest" | "soap" | "webhook" | "database" | "message-broker" | "saas";
  target: string;
  status: "connected" | "failing" | "untested";
  retryPolicy: string;
  timeoutMs: number;
  secretRef: string;
  auth?: AuthConfig;
  lastTestedAt?: IsoDate;
}

/* AI */

export interface ModelProvider {
  id: Id;
  name: string;
  kind: "hosted" | "self-hosted";
  endpoint: string;
  models: string[];
  status: "healthy" | "degraded";
  tokensThisMonth: number;
  costThisMonthUsd: number;
}

export interface Agent {
  id: Id;
  name: string;
  description: string;
  kind: "platform" | "business";
  ownerDepartmentId: Id;
  model: string;
  instructions: string;
  /** MCP tool names this Agent may call. */
  tools: string[];
  /** Permissions held by the Agent's own service identity. */
  permissions: Permission[];
  maxToolCallsPerRun: number;
  /** Runs only as a signed-in user, holding just the permissions both it and the user hold. */
  actsAsCaller?: boolean;
  version: number;
  status: "active" | "draft" | "disabled";
}

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  outcome: "allowed" | "denied" | "error";
  output?: unknown;
  reason?: string;
}

export type AgentRunStep =
  | { kind: "thought"; text: string }
  | { kind: "tool"; call: ToolCall };

export interface AgentRun {
  id: Id;
  agentId: Id;
  traceId: Id;
  prompt: string;
  trigger: "manual" | "workflow";
  /** Set when the run was confined to one application's tools. */
  applicationId?: Id;
  status: "completed" | "failed";
  steps: AgentRunStep[];
  answer: string;
  startedAt: IsoDate;
  durationMs: number;
  tokens: number;
}

/* Flow */

export type WorkflowTrigger =
  | { kind: "entity-event"; event: string }
  | { kind: "schedule"; cron: string }
  | { kind: "manual" };

/** Where a step's node sits on the workflow canvas. */
export interface CanvasPosition {
  x: number;
  y: number;
}

/**
 * What every step shares. `next` is the step that runs after this one: undefined means the step
 * after it in `steps` (how linear workflows are written), null means the workflow ends here.
 */
interface StepBase {
  id: Id;
  name: string;
  next?: Id | null;
  position?: CanvasPosition;
}

export type ConditionOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "exists";

export type WorkflowStep =
  | (StepBase & { kind: "agent"; agentId: Id; prompt: string })
  /** A rejection ends the run unless `onReject` names a step to take instead. */
  | (StepBase & { kind: "approval"; permission: Permission; description: string; onReject?: Id | null })
  | (StepBase & { kind: "operation"; businessOperation: string })
  | (StepBase & { kind: "notify"; channel: string; message: string })
  /** Branches on a value in the run's context: `then` when it holds, `otherwise` when not. `next` is unused. */
  | (StepBase & { kind: "condition"; field: string; operator: ConditionOperator; value: string; then: Id | null; otherwise: Id | null })
  | (StepBase & { kind: "wait"; minutes: number });

export type WorkflowStepKind = WorkflowStep["kind"];

export interface Workflow {
  id: Id;
  name: string;
  description: string;
  applicationId?: Id;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  /** The first step; the first in `steps` when unset. */
  start?: Id | null;
  /** Where the trigger's node sits on the canvas. */
  triggerPosition?: CanvasPosition;
  /** Permissions held by the Workflow's own service identity. */
  permissions: Permission[];
  version: number;
  status: "active" | "paused";
}

export type StepStatus = "pending" | "running" | "waiting" | "completed" | "failed" | "skipped";

export interface ExecutionStep {
  stepId: Id;
  status: StepStatus;
  startedAt?: IsoDate;
  endedAt?: IsoDate;
  detail?: string;
}

export interface WorkflowExecution {
  id: Id;
  workflowId: Id;
  traceId: Id;
  status: "running" | "waiting" | "completed" | "failed";
  context: Record<string, unknown>;
  steps: ExecutionStep[];
  startedAt: IsoDate;
  endedAt?: IsoDate;
}

export interface Approval {
  id: Id;
  executionId: Id;
  workflowId: Id;
  stepId: Id;
  traceId: Id;
  title: string;
  summary: string;
  permission: Permission;
  subject?: { entity: string; recordId: Id; applicationId?: Id };
  status: "pending" | "approved" | "rejected";
  requestedAt: IsoDate;
  decidedAt?: IsoDate;
  decidedBy?: string;
  comment?: string;
}

/* Events, audit and observability */

export interface PlatformEvent {
  id: Id;
  type: string;
  source: string;
  traceId: Id;
  payload: Record<string, unknown>;
  time: IsoDate;
}

export type EntryPoint = "studio" | "api" | "mcp" | "agent" | "workflow" | "control" | "system";

export interface AuditRecord {
  id: Id;
  traceId: Id;
  time: IsoDate;
  actor: Actor;
  entryPoint: EntryPoint;
  action: string;
  resource: string;
  outcome: "allowed" | "denied" | "failed";
  detail?: string;
}

export interface TraceSummary {
  traceId: Id;
  title: string;
  startedAt: IsoDate;
  endedAt: IsoDate;
  spanCount: number;
  denied: number;
  actors: string[];
}

export interface Trace extends TraceSummary {
  audit: AuditRecord[];
  events: PlatformEvent[];
}

export interface HealthSignal {
  resource: string;
  kind: "application" | "api" | "mcp" | "agent" | "workflow" | "integration" | "database";
  status: "healthy" | "degraded" | "down";
  detail: string;
}

/* Resource registry */

export type ResourceType =
  | "application"
  | "entity"
  | "api"
  | "mcp-server"
  | "integration"
  | "agent"
  | "workflow";

export interface ResourceSummary {
  id: Id;
  type: ResourceType;
  name: string;
  workspace: WorkspaceKey;
  owner: string;
  lifecycle: string;
  updatedAt: IsoDate;
}

export interface OverviewStats {
  applications: number;
  entities: number;
  records: number;
  apis: number;
  mcpTools: number;
  agents: number;
  workflows: number;
  pendingApprovals: number;
  auditToday: number;
  deniedToday: number;
}

/* Ops: alerts, SLOs, status, backups */
export interface AlertRule {
  id: Id;
  name: string;
  /** "slo" rules alert on the SLO's burn rate (threshold = burn rate × 100, e.g. 600 = 6×). */
  source: "audit" | "event" | "slo";
  action: string;
  outcome?: string;
  threshold: number;
  windowMinutes: number;
  webhookId?: Id;
  /** Custom URL notified directly when the rule fires (alternative to webhookId; unsigned). */
  webhookUrl?: string;
  /** The SLO this rule watches when source is "slo". */
  sloId?: Id;
  active: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}
export type AlertRuleInput = Omit<AlertRule, "id" | "createdAt" | "updatedAt">;
export interface AlertFire {
  id: Id;
  ruleId: Id;
  firedAt: IsoDate;
  count: number;
  status: "firing" | "acked";
  ackedBy?: string;
  ackedAt?: IsoDate;
  createdAt: IsoDate;
}
export interface Slo {
  id: Id;
  operation: string;
  targetSuccess: number;
  targetP95Ms: number;
  windowMinutes: number;
  createdAt: IsoDate;
}
export type SloInput = Omit<Slo, "id" | "createdAt">;
export interface SloStatus {
  sloId: Id;
  operation: string;
  calls: number;
  errors: number;
  successRate: number;
  p95Ms: number;
  breached: boolean;
}
export interface StatusPage {
  status: "healthy" | "degraded" | "down" | "unknown";
  service: string;
  version: string;
  uptimeSeconds: number;
  time: IsoDate;
  components: Array<{ kind: string; resource: string; status: string; detail?: string }>;
}
