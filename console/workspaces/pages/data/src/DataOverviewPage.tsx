import { ArrowUpRight, DataBase, Layers, Group } from "@carbon/react/icons";
import { ContainedList, ContainedListItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";

import { DonutChart, isEmptySeries, type ChartTabularData, type DonutChartOptions } from "@workspacenow/charts";
import { useListApplications, useListConnections, useListEntities } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, Metric, MetricGrid, NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TextLink, MetricGridSkeleton, SectionCardSkeleton, TableSkeleton, DonutSkeleton, DetailSkeleton } from "@workspacenow/views";
import { SCOPE_LABEL } from "./constants";
import { ScopeChip } from "./subComponents/ScopeChip";

import common from "./common.module.scss";
import styles from "./DataOverviewPage.module.scss";

const DONUT_OPTIONS: DonutChartOptions = {
  donut: { center: { label: "Entities" } },
  accessibility: { svgAriaLabel: "Entities by scope" },
};

export function DataOverviewPage() {
  const entities = useListEntities();
  const connections = useListConnections();
  const { data: apps } = useListApplications();
  const appName = (id?: string) => apps?.items.find((a) => a.id === id)?.name ?? "-";

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
      <QueryState
        query={entities}
        skeleton={
          <Stack gap={6}>
            <MetricGridSkeleton />
            <div className={styles.split}>
              <SectionCardSkeleton flush>
                <TableSkeleton />
              </SectionCardSkeleton>
              <SectionCardSkeleton>
                <DonutSkeleton />
              </SectionCardSkeleton>
            </div>
          </Stack>
        }
      >
        {(data) => {
          const count = (scope: string) => data.items.filter((e) => e.scope === scope).length;
          const slices: ChartTabularData = (["application", "organization", "external"] as const)
            .map((scope) => ({ group: SCOPE_LABEL[scope], value: count(scope) }))
            .filter((s) => s.value > 0);
          return (
            <Stack gap={6}>
              <MetricGrid columns={4}>
                <Metric label="Entities" value={data.total} icon={<DataBase />} />
                <Metric label="Application-scoped" value={count("application")} icon={<Layers />} />
                <Metric label="Organization-shared" value={count("organization")} icon={<Group />} />
                <Metric label="External" value={count("external")} icon={<ArrowUpRight />} />
              </MetricGrid>

              <div className={styles.split}>
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
                      action={
                        <LinkButton size="sm" variant="secondary" href={routes.data.entities}>
                          Create an entity
                        </LinkButton>
                      }
                    />
                  ) : (
                    <TableContainer aria-label="Entities">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableHeader>Entity</TableHeader>
                            <TableHeader>Scope</TableHeader>
                            <TableHeader>Owner</TableHeader>
                            <TableHeader className={common.numeric}>Fields</TableHeader>
                            <TableHeader className={common.numeric}>Records</TableHeader>
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
                              <TableCell className={common.muted}>{appName(e.ownerApplicationId)}</TableCell>
                              <TableCell className={common.numeric}>{e.fields.length}</TableCell>
                              <TableCell className={common.numeric}>
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
                  {isEmptySeries(slices) ? (
                    <NoDataFound message="Scopes appear once entities exist." />
                  ) : (
                    <DonutChart data={slices} options={DONUT_OPTIONS} />
                  )}
                </SectionCard>
              </div>

              <QueryState
                query={connections}
                skeleton={
                  <SectionCardSkeleton>
                    <DetailSkeleton items={2} columns={1} />
                  </SectionCardSkeleton>
                }
              >
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
                        <p className={common.helper}>All connections are healthy.</p>
                      ) : (
                        <ContainedList label="Needs attention" kind="on-page">
                          {unhealthy.map((c) => (
                            <ContainedListItem key={c.id}>
                              <div className={common.row}>
                                <StatusChip status={c.status} />
                                <span>{c.name}</span>
                                <span className={common.subtle}>{c.host}</span>
                              </div>
                            </ContainedListItem>
                          ))}
                        </ContainedList>
                      )}
                    </SectionCard>
                  );
                }}
              </QueryState>
            </Stack>
          );
        }}
      </QueryState>
    </PageLayout>
  );
}
