import { Alert, Table } from "@heroui/react";
import { Code, LogoMcp, NodesRight, PlugConnection, Server } from "@workspacenow/icons";
import { useListApiOperations, useListApis, useListIntegrations, useListMcpServers, useListMcpTools } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, Metric, MetricGrid, PageLayout, QueryState, SectionCard, StatusChip, TextLink, formatRelative } from "@workspacenow/views";
import { ActivityChart } from "./subComponents/ActivityChart";

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
      <div className="grid gap-6">
        <Alert>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              APIs invoke governed business operations, never databases directly. The same operation backs a Studio form, a REST endpoint and
              an MCP tool, so authorization and validation cannot diverge.
            </Alert.Description>
          </Alert.Content>
        </Alert>

        <MetricGrid columns={5}>
          <Metric label="APIs" value={apis.data?.total ?? "—"} icon={<Code />} />
          <Metric label="Operations" value={operations.data?.total ?? "—"} icon={<NodesRight />} />
          <Metric label="MCP tools" value={tools.data?.total ?? "—"} icon={<LogoMcp />} />
          <Metric label="External MCP servers" value={external} icon={<Server />} />
          <Metric
            label="Healthy integrations"
            value={integrations.data ? `${healthyIntegrations}/${integrations.data.total}` : "—"}
            icon={<PlugConnection />}
          />
        </MetricGrid>

        <ActivityChart />

        <div className="grid items-start gap-6 lg:grid-cols-2">
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
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="APIs">
                      <Table.Header>
                        <Table.Column isRowHeader>Name</Table.Column>
                        <Table.Column>Base path</Table.Column>
                        <Table.Column>Status</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((api) => (
                          <Table.Row key={api.id} id={api.id}>
                            <Table.Cell>
                              <TextLink to={buildPath(routes.connect.api, { apiId: api.id })}>{api.name}</TextLink>
                            </Table.Cell>
                            <Table.Cell className="font-mono text-xs">{api.basePath}</Table.Cell>
                            <Table.Cell>
                              <StatusChip status={api.lifecycle} />
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )}
            </QueryState>
          </SectionCard>
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
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Integrations">
                      <Table.Header>
                        <Table.Column isRowHeader>Name</Table.Column>
                        <Table.Column>Last tested</Table.Column>
                        <Table.Column>Status</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((i) => (
                          <Table.Row key={i.id} id={i.id}>
                            <Table.Cell>{i.name}</Table.Cell>
                            <Table.Cell className="text-muted">{formatRelative(i.lastTestedAt)}</Table.Cell>
                            <Table.Cell>
                              <StatusChip status={i.status} />
                            </Table.Cell>
                          </Table.Row>
                        ))}
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
