import { Table } from "@heroui/react";
import { ArrowUpRightFromSquare, Database, Layers, Persons } from "@workspacenow/icons";
import { EvilPieChart, type ChartConfig } from "@workspacenow/charts";
import { useListApplications, useListConnections, useListEntities } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, Metric, MetricGrid, PageLayout, QueryState, SectionCard, StatusChip, TextLink } from "@workspacenow/views";
import { ScopeChip } from "./subComponents/ScopeChip";

type ScopeSlice = { scope: string; count: number };

const scopeConfig = {
  application: { label: "Application-scoped", colors: { light: ["var(--accent)"], dark: ["var(--accent)"] } },
  organization: { label: "Organization-shared", colors: { light: ["var(--success)"], dark: ["var(--success)"] } },
  external: { label: "External system", colors: { light: ["var(--muted)"], dark: ["var(--muted)"] } },
} satisfies ChartConfig;

export function DataOverviewPage() {
  const entities = useListEntities();
  const connections = useListConnections();
  const { data: apps } = useListApplications();
  const appName = (id?: string) => apps?.items.find((a) => a.id === id)?.name ?? "—";

  return (
    <PageLayout
      title="Data"
      description="Business entities are the shared contract every application, API, agent and workflow builds on."
      actions={
        <LinkButton href={routes.data.model} variant="secondary">
          View data model
        </LinkButton>
      }
    >
      <QueryState query={entities}>
        {(data) => {
          const count = (scope: string) => data.items.filter((e) => e.scope === scope).length;
          const slices: ScopeSlice[] = (["application", "organization", "external"] as const)
            .map((scope) => ({ scope, count: count(scope) }))
            .filter((s) => s.count > 0);
          return (
            <div className="grid gap-6">
              <MetricGrid columns={4}>
                <Metric label="Entities" value={data.total} icon={<Database />} />
                <Metric label="Application-scoped" value={count("application")} icon={<Layers />} />
                <Metric label="Organization-shared" value={count("organization")} icon={<Persons />} />
                <Metric label="External" value={count("external")} icon={<ArrowUpRightFromSquare />} />
              </MetricGrid>

              <div className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
                <SectionCard
                  title="Entities"
                  actions={
                    <LinkButton size="sm" variant="ghost" href={routes.data.entities}>
                      Manage entities
                    </LinkButton>
                  }
                  flush
                >
                  <Table variant="secondary">
                    <Table.ScrollContainer>
                      <Table.Content aria-label="Entities" className="min-w-[560px]">
                        <Table.Header>
                          <Table.Column isRowHeader>Entity</Table.Column>
                          <Table.Column>Scope</Table.Column>
                          <Table.Column>Owner</Table.Column>
                          <Table.Column className="text-right">Fields</Table.Column>
                          <Table.Column className="text-right">Records</Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {data.items.map((e) => (
                            <Table.Row key={e.id} id={e.id}>
                              <Table.Cell>
                                <TextLink to={buildPath(routes.data.entity, { entityName: e.name })}>{e.label}</TextLink>
                              </Table.Cell>
                              <Table.Cell>
                                <ScopeChip scope={e.scope} />
                              </Table.Cell>
                              <Table.Cell className="text-muted">{appName(e.ownerApplicationId)}</Table.Cell>
                              <Table.Cell className="text-right tabular-nums">{e.fields.length}</Table.Cell>
                              <Table.Cell className="text-right">
                                <LinkButton size="sm" variant="ghost" href={buildPath(routes.data.records, { entityName: e.name })}>
                                  Browse
                                </LinkButton>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
                </SectionCard>

                <SectionCard title="Entities by scope" subtitle="Who owns the authoritative writes">
                  <EvilPieChart config={scopeConfig} data={slices} dataKey="count" nameKey="scope" className="aspect-auto h-56 flex-none">
                    <EvilPieChart.Pie innerRadius="58%" paddingAngle={2} cornerRadius={4} />
                    <EvilPieChart.Tooltip />
                    <EvilPieChart.Legend />
                  </EvilPieChart>
                </SectionCard>
              </div>

              <QueryState query={connections}>
                {(conns) => {
                  const unhealthy = conns.items.filter((c) => c.status !== "connected");
                  return (
                    <SectionCard
                      title="Connections"
                      subtitle={`${conns.items.filter((c) => c.managed).length} managed, ${conns.items.filter((c) => !c.managed).length} external`}
                      actions={
                        <LinkButton size="sm" variant="ghost" href={routes.data.connections}>
                          All connections
                        </LinkButton>
                      }
                    >
                      {unhealthy.length === 0 ? (
                        <p className="text-sm text-muted">All connections are healthy.</p>
                      ) : (
                        <ul className="grid gap-2">
                          {unhealthy.map((c) => (
                            <li key={c.id} className="flex items-center gap-2 text-sm">
                              <StatusChip status={c.status} />
                              <span className="font-medium">{c.name}</span>
                              <span className="font-mono text-xs text-muted">{c.host}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </SectionCard>
                  );
                }}
              </QueryState>
            </div>
          );
        }}
      </QueryState>
    </PageLayout>
  );
}
