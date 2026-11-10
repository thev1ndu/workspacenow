import { CheckmarkFilled, WarningFilled, ErrorFilled, Key, Layers, Group as GroupIcon } from "@carbon/react/icons";
import { CodeSnippet, Column, Grid, Stack } from "@carbon/react";

import { useListAudit, useListEnvironments, useListHealth, useListRoles, useListUsers, useOrganization } from "@workspacenow/api-client";
import { globalConfig, routes, type HealthSignal } from "@workspacenow/types";
import { DetailList, LinkButton, Metric, MetricGrid, PageLayout, QueryState, SectionCard, StatusChip, DetailSkeleton } from "@workspacenow/views";

import styles from "./control.module.scss";
import { AuditTable } from "./subComponents/AuditTable";
import { ControlTable } from "./subComponents/ControlTable";
import { EntryPointOutcomesChart } from "./subComponents/EntryPointOutcomesChart";
import { HealthChart } from "./subComponents/HealthChart";

const KIND_LABELS: Record<string, string> = {
  application: "Application",
  api: "API",
  mcp: "MCP server",
  agent: "Agent",
  workflow: "Workflow",
  integration: "Integration",
  database: "Database",
};

const STATUS_ORDER = ["down", "degraded", "healthy"];

const signalId = (signal: HealthSignal) => `${signal.kind}-${signal.resource}`;

const signalColumns = [
  { key: "resource", header: "Resource", cell: (signal: HealthSignal) => <span className={styles.name}>{signal.resource}</span> },
  { key: "kind", header: "Kind", cell: (signal: HealthSignal) => <span className={styles.muted}>{KIND_LABELS[signal.kind]}</span> },
  { key: "status", header: "Status", cell: (signal: HealthSignal) => <StatusChip status={signal.status} /> },
  { key: "detail", header: "Detail", cell: (signal: HealthSignal) => <span className={`${styles.monoLarge} ${styles.muted}`}>{signal.detail}</span> },
];

export function ControlOverview() {
  const organization = useOrganization();
  const users = useListUsers();
  const roles = useListRoles();
  const environments = useListEnvironments();
  const health = useListHealth();
  const denied = useListAudit({ outcome: "denied" });

  const signals = health.data?.items ?? [];
  const count = (status: string) => signals.filter((s) => s.status === status).length;

  return (
    <PageLayout title="Control" description="Administration, security, governance and operations for this installation.">
      <Stack gap={6}>
        <MetricGrid columns={6}>
          <Metric label="Users" value={users.data?.total ?? "-"} icon={<GroupIcon />} href={routes.control.organization} />
          <Metric label="Roles" value={roles.data?.total ?? "-"} icon={<Key />} href={routes.control.access} />
          <Metric label="Environments" value={environments.data?.total ?? "-"} icon={<Layers />} href={routes.control.environments} />
          <Metric label="Healthy" value={count("healthy")} icon={<CheckmarkFilled />} href="#health-signals" />
          <Metric label="Degraded" value={count("degraded")} icon={<WarningFilled />} href="#health-signals" />
          <Metric label="Down" value={count("down")} icon={<ErrorFilled />} href="#health-signals" />
        </MetricGrid>

        <SectionCard title="Installation">
          <QueryState query={organization} skeleton={<DetailSkeleton items={5} />}>
            {(org) => (
              <DetailList
                columns={4}
                items={[
                  { label: "Organization", value: org.name },
                  { label: "Installation", value: org.installationName },
                  { label: "Version", value: globalConfig.version },
                  { label: "Identity provider", value: org.identityProvider.type },
                  { label: "Issuer", fullWidth: true, value: <CodeSnippet type="inline">{org.identityProvider.issuer}</CodeSnippet> },
                ]}
              />
            )}
          </QueryState>
        </SectionCard>

        <Grid fullWidth>
          <Column sm={4} md={8} lg={10} className={styles.cell}>
            <EntryPointOutcomesChart />
          </Column>
          <Column sm={4} md={8} lg={6} className={styles.cell}>
            <HealthChart />
          </Column>
        </Grid>

        <SectionCard
          title="Recent denied actions"
          subtitle="Requests the platform refused, from any entry point"
          actions={
            <LinkButton size="sm" variant="ghost" href={routes.control.audit}>
              Audit log
            </LinkButton>
          }
          flush
        >
          <QueryState query={denied}>{(data) => <AuditTable records={data.items.slice(0, 6)} plain />}</QueryState>
        </SectionCard>

        <div id="health-signals" className={styles.anchor}>
          <SectionCard title="Health signals" subtitle="Applications, APIs, MCP servers, integrations, databases and workflows" flush>
            <QueryState query={health}>
              {(data) => (
                <ControlTable
                  label="Health signals"
                  rows={[...data.items].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))}
                  rowId={signalId}
                  columns={signalColumns}
                  emptyMessage="No health signals yet."
                  searchText={(signal) => `${signal.resource} ${KIND_LABELS[signal.kind] ?? signal.kind} ${signal.status} ${signal.detail ?? ""}`}
                  searchLabel="Search health signals"
                />
              )}
            </QueryState>
          </SectionCard>
        </div>
      </Stack>
    </PageLayout>
  );
}
