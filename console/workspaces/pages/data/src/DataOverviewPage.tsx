import { ArrowUpRight, DataBase, Layers, Group } from "@carbon/react/icons";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";

import { EvilPieChart, type ChartConfig } from "@workspacenow/charts";
import { useListApplications, useListConnections, useListEntities } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, Metric, MetricGrid, NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TextLink, MetricGridSkeleton, SectionCardSkeleton, TableSkeleton, DonutSkeleton, DetailSkeleton } from "@workspacenow/views";
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
      <QueryState query={entities} skeleton={
        <div className="grid gap-6">
          <MetricGridSkeleton />
          <div className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
            <SectionCardSkeleton flush>
              <TableSkeleton />
            </SectionCardSkeleton>
            <SectionCardSkeleton>
              <DonutSkeleton />
            </SectionCardSkeleton>
          </div>
        </div>
      }>
        {(data) => {
          const count = (scope: string) => data.items.filter((e) => e.scope === scope).length;
          const slices: ScopeSlice[] = (["application", "organization", "external"] as const)
            .map((scope) => ({ scope, count: count(scope) }))
            .filter((s) => s.count > 0);
          return (
            <div className="grid gap-6">
              <MetricGrid columns={4}>
                <Metric label="Entities" value={data.total} icon={<DataBase />} />
                <Metric label="Application-scoped" value={count("application")} icon={<Layers />} />
                <Metric label="Organization-shared" value={count("organization")} icon={<Group />} />
                <Metric label="External" value={count("external")} icon={<ArrowUpRight />} />
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
                  {data.items.length === 0 ? (
                    <NoDataFound
                      message="No entities yet. Entities are the shared records your applications, agents and workflows use."
                      action={<LinkButton size="sm" variant="secondary" href={routes.data.entities}>Create an entity</LinkButton>}
                    />
                  ) : (
                  <TableContainer aria-label="Entities">
                    <Table className="min-w-[560px]">
                      <TableHead>
                        <TableRow>
                          <TableHeader>Entity</TableHeader>
                          <TableHeader>Scope</TableHeader>
                          <TableHeader>Owner</TableHeader>
                          <TableHeader className="text-right">Fields</TableHeader>
                          <TableHeader className="text-right">Records</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.items.map((e) => (
                          <TableRow key={e.id} id={e.id}>
                            <TableCell>
                              <TextLink to={buildPath(routes.data.entity, { entityName: e.name })}>{e.label}</TextLink>
                            </TableCell>
                            <TableCell>
                              <ScopeChip scope={e.scope} />
                            </TableCell>
                            <TableCell className="text-muted">{appName(e.ownerApplicationId)}</TableCell>
                            <TableCell className="text-right tabular-nums">{e.fields.length}</TableCell>
                            <TableCell className="text-right">
                              <LinkButton size="sm" variant="ghost" href={buildPath(routes.data.records, { entityName: e.name })}>
                                Browse
                              </LinkButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  )}
                </SectionCard>

                <SectionCard title="Entities by scope" subtitle="Who owns the authoritative writes">
                  {slices.length === 0 ? (
                    <NoDataFound message="Scopes appear once entities exist." />
                  ) : (
                  <EvilPieChart config={scopeConfig} data={slices} dataKey="count" nameKey="scope" className="aspect-auto h-56 flex-none">
                    <EvilPieChart.Pie innerRadius="58%" paddingAngle={2} cornerRadius={4} />
                    <EvilPieChart.Tooltip />
                    <EvilPieChart.Legend />
                  </EvilPieChart>
                  )}
                </SectionCard>
              </div>

              <QueryState query={connections} skeleton={
                  <SectionCardSkeleton>
                    <DetailSkeleton items={2} columns={1} />
                  </SectionCardSkeleton>
                }>
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
