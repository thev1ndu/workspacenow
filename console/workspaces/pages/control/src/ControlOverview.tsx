import { Table } from "@heroui/react";
import { CircleCheck, CircleExclamation, CircleXmark, Key, Layers, Persons } from "@workspacenow/icons";
import {
  useListAudit,
  useListEnvironments,
  useListHealth,
  useListRoles,
  useListUsers,
  useOrganization,
} from "@workspacenow/api-client";
import { globalConfig, routes } from "@workspacenow/types";
import { DetailList, LinkButton, Metric, MetricGrid, PageLayout, QueryState, SectionCard, StatusChip } from "@workspacenow/views";
import { AuditTable } from "./subComponents/AuditTable";
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
      <div className="grid gap-6">
        <MetricGrid columns={6}>
          <Metric label="Users" value={users.data?.total ?? "—"} icon={<Persons />} href={routes.control.organization} />
          <Metric label="Roles" value={roles.data?.total ?? "—"} icon={<Key />} href={routes.control.access} />
          <Metric label="Environments" value={environments.data?.total ?? "—"} icon={<Layers />} href={routes.control.environments} />
          <Metric label="Healthy" value={count("healthy")} icon={<CircleCheck />} href="#health-signals" />
          <Metric label="Degraded" value={count("degraded")} icon={<CircleExclamation />} href="#health-signals" />
          <Metric label="Down" value={count("down")} icon={<CircleXmark />} href="#health-signals" />
        </MetricGrid>

        <SectionCard title="Installation">
          <QueryState query={organization}>
            {(org) => (
              <DetailList
                columns={4}
                items={[
                  { label: "Organization", value: org.name },
                  { label: "Installation", value: org.installationName },
                  { label: "Version", value: globalConfig.version },
                  { label: "Identity provider", value: org.identityProvider.type },
                  { label: "Issuer", fullWidth: true, value: <code className="font-mono text-[13px]">{org.identityProvider.issuer}</code> },
                ]}
              />
            )}
          </QueryState>
        </SectionCard>

        <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
          <EntryPointOutcomesChart />
          <HealthChart />
        </div>

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
          <QueryState query={denied}>{(data) => <AuditTable records={data.items.slice(0, 6)} />}</QueryState>
        </SectionCard>

        <div id="health-signals" className="scroll-mt-20">
          <SectionCard title="Health signals" subtitle="Applications, APIs, MCP servers, integrations, databases and workflows" flush>
            <QueryState query={health}>
              {(data) => (
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Health signals" className="min-w-[640px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Resource</Table.Column>
                        <Table.Column>Kind</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>Detail</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {[...data.items]
                          .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
                          .map((signal) => {
                            const id = `${signal.kind}-${signal.resource}`;
                            return (
                              <Table.Row key={id} id={id}>
                                <Table.Cell className="font-medium">{signal.resource}</Table.Cell>
                                <Table.Cell className="text-muted">{KIND_LABELS[signal.kind]}</Table.Cell>
                                <Table.Cell>
                                  <StatusChip status={signal.status} />
                                </Table.Cell>
                                <Table.Cell className="font-mono text-[13px] text-muted">{signal.detail}</Table.Cell>
                              </Table.Row>
                            );
                          })}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )}
            </QueryState>
          </SectionCard>
        </div>
      </div>
    </PageLayout>
  );
}
