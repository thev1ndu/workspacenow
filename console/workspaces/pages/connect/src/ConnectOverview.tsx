import { Code, Api, Flow, Plug, Network_3 } from "@carbon/react/icons";
import { Column, Grid, InlineNotification, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";

import { useListApiOperations, useListApis, useListIntegrations, useListMcpServers, useListMcpTools } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, Metric, MetricGrid, PageLayout, QueryState, SectionCard, StatusChip, TextLink, formatRelative } from "@workspacenow/views";
import { ActivityChart } from "./subComponents/ActivityChart";

import common from "./common.module.scss";

export function ConnectOverview() {
  const apis = useListApis();
  const operations = useListApiOperations();
  const tools = useListMcpTools();
  const servers = useListMcpServers();
  const integrations = useListIntegrations();

  const external = servers.data?.items.filter((s) => s.kind === "external").length ?? 0;
  const healthyIntegrations = integrations.data?.items.filter((i) => i.status === "connected").length ?? 0;

  return (
    <PageLayout title="Connect" description="APIs, integrations and MCP exposure for the installation's business operations.">
      <Stack gap={6}>
        <InlineNotification
          className={common.notice}
          kind="info"
          lowContrast
          hideCloseButton
          subtitle="APIs invoke governed business operations, never databases directly. The same operation backs a Studio form, a REST endpoint and an MCP tool, so authorization and validation cannot diverge."
        />

        <MetricGrid columns={5}>
          <Metric label="APIs" value={apis.data?.total ?? "-"} icon={<Code />} />
          <Metric label="Operations" value={operations.data?.total ?? "-"} icon={<Flow />} />
          <Metric label="MCP tools" value={tools.data?.total ?? "-"} icon={<Api />} />
          <Metric label="External MCP servers" value={external} icon={<Network_3 />} />
          <Metric
            label="Healthy integrations"
            value={integrations.data ? `${healthyIntegrations}/${integrations.data.total}` : "-"}
            icon={<Plug />}
          />
        </MetricGrid>

        <ActivityChart />

        <Grid fullWidth withRowGap>
          <Column sm={4} md={8} lg={8}>
            <SectionCard
              title="APIs"
              actions={
                <LinkButton size="sm" variant="ghost" href={routes.connect.apis}>
                  All APIs
                </LinkButton>
              }
              flush
            >
              <QueryState query={apis}>
                {(data) => (
                  <TableContainer>
                    <Table aria-label="APIs">
                      <TableHead>
                        <TableRow>
                          <TableHeader scope="col">Name</TableHeader>
                          <TableHeader scope="col">Base path</TableHeader>
                          <TableHeader scope="col">Status</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.items.map((api) => (
                          <TableRow key={api.id} id={api.id}>
                            <TableCell>
                              <TextLink to={buildPath(routes.connect.api, { apiId: api.id })}>{api.name}</TextLink>
                            </TableCell>
                            <TableCell>
                              <span className={common.mono}>{api.basePath}</span>
                            </TableCell>
                            <TableCell>
                              <StatusChip status={api.lifecycle} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </QueryState>
            </SectionCard>
          </Column>
          <Column sm={4} md={8} lg={8}>
            <SectionCard
              title="Integrations"
              actions={
                <LinkButton size="sm" variant="ghost" href={routes.connect.integrations}>
                  Manage
                </LinkButton>
              }
              flush
            >
              <QueryState query={integrations}>
                {(data) => (
                  <TableContainer>
                    <Table aria-label="Integrations">
                      <TableHead>
                        <TableRow>
                          <TableHeader scope="col">Name</TableHeader>
                          <TableHeader scope="col">Last tested</TableHeader>
                          <TableHeader scope="col">Status</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.items.map((i) => (
                          <TableRow key={i.id} id={i.id}>
                            <TableCell>{i.name}</TableCell>
                            <TableCell>{formatRelative(i.lastTestedAt)}</TableCell>
                            <TableCell>
                              <StatusChip status={i.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </QueryState>
            </SectionCard>
          </Column>
        </Grid>
      </Stack>
    </PageLayout>
  );
}
