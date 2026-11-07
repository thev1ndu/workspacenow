import type {
  Agent,
  AgentRun,
  Api,
  ApiOperation,
  Application,
  Approval,
  AuditRecord,
  DatabaseConnection,
  Department,
  Deployment,
  Entity,
  EntityRecord,
  Environment,
  GroupRoleMapping,
  Integration,
  McpServer,
  ModelProvider,
  Organization,
  PlatformEvent,
  Release,
  Role,
  Team,
  User,
  Workflow,
  WorkflowExecution,
  RecordHistoryEntry,
  SavedView,
  ApiKey,
  ApiVersion,
  Webhook,
  WebhookDelivery,
  AlertFire,
  AlertRule,
  Slo
} from "@workspacenow/types";

/** Everything one Installation persists. */
export interface PlatformState {
  schemaVersion: number;
  sequence: number;
  organization: Organization;
  departments: Department[];
  teams: Team[];
  users: User[];
  roles: Role[];
  groupMappings: GroupRoleMapping[];
  environments: Environment[];
  applications: Application[];
  releases: Release[];
  deployments: Deployment[];
  entities: Entity[];
  records: EntityRecord[];
  connections: DatabaseConnection[];
  apis: Api[];
  operations: ApiOperation[];
  mcpServers: McpServer[];
  integrations: Integration[];
  modelProviders: ModelProvider[];
  agents: Agent[];
  agentRuns: AgentRun[];
  workflows: Workflow[];
  executions: WorkflowExecution[];
  approvals: Approval[];
  events: PlatformEvent[];
  audit: AuditRecord[];
  views: SavedView[];
  history: RecordHistoryEntry[];
  webhooks: Webhook[];
  webhookDeliveries: WebhookDelivery[];
  apiVersions: ApiVersion[];
  apiKeys: ApiKey[];
  alertRules: AlertRule[];
  alertFires: AlertFire[];
  slos: Slo[];
  /** Application ids each user pinned, keyed by user id, in pin order. */
  pins: Record<string, string[]>;
}

export const SCHEMA_VERSION = 5; // v5: seed also carries a webhook, alert rule + fire, SLO and backup record

const STORAGE_KEY = "workspacenow-demo-state";

export function loadState(): PlatformState | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PlatformState;
    return parsed.schemaVersion === SCHEMA_VERSION ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function saveState(state: PlatformState): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode, quota); the demo keeps running in memory.
  }
}

export function clearState(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing persisted to clear.
  }
}
