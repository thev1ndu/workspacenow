// Route templates for every console page. Build links with buildPath, never hand-written strings.

export const routes = {
  home: "/",
  /** Every application its users can open, outside the console. */
  catalog: "/catalog",
  /** An application as its users run it, full screen outside the console. */
  app: "/apps/:appId",
  studio: {
    root: "/studio",
    applications: "/studio/applications",
    application: "/studio/applications/:appId",
    applicationEdit: "/studio/applications/:appId/edit",
    builder: "/studio/builder",
    templates: "/studio/templates",
  },
  connect: {
    root: "/connect",
    apis: "/connect/apis",
    api: "/connect/apis/:apiId",
    mcp: "/connect/mcp",
    integrations: "/connect/integrations",
  },
  data: {
    root: "/data",
    entities: "/data/entities",
    entity: "/data/entities/:entityName",
    records: "/data/records/:entityName",
    model: "/data/model",
    connections: "/data/connections",
  },
  ai: {
    root: "/ai",
    agents: "/ai/agents",
    agent: "/ai/agents/:agentId",
    runs: "/ai/runs",
    run: "/ai/runs/:runId",
    models: "/ai/models",
  },
  flow: {
    root: "/flow",
    workflows: "/flow/workflows",
    workflowNew: "/flow/workflows/new",
    workflow: "/flow/workflows/:workflowId",
    workflowEdit: "/flow/workflows/:workflowId/edit",
    executions: "/flow/executions",
    execution: "/flow/executions/:executionId",
    approvals: "/flow/approvals",
  },
  control: {
    root: "/control",
    organization: "/control/organization",
    access: "/control/access",
    environments: "/control/environments",
    audit: "/control/audit",
    alerts: "/control/alerts",
    traces: "/control/traces",
    trace: "/control/traces/:traceId",
    health: "/control/health",
    settings: "/control/settings",
  },
} as const;

/** Fills ":param" segments of a route template. */
export function buildPath(template: string, params: Record<string, string> = {}): string {
  return template.replace(/:(\w+)/g, (_match, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing route param "${key}" for ${template}`);
    }
    return encodeURIComponent(value);
  });
}
