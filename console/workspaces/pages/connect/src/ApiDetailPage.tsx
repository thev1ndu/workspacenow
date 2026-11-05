import { useState } from "react";
import { Button, Switch, Table, Tooltip } from "@heroui/react";
import { Play } from "@workspacenow/icons";
import { useParams } from "react-router-dom";
import { useCan, useGetApi, useListApiOperations, useListApplications, useUpdateMcpExposure } from "@workspacenow/api-client";
import { routes, type ApiOperation } from "@workspacenow/types";
import { DetailList, NoDataFound, PageLayout, QueryState, SectionCard, StatusChip } from "@workspacenow/views";
import { MethodChip } from "./subComponents/MethodChip";
import { TryItDialog } from "./subComponents/TryItDialog";

export function ApiDetailPage() {
  const { apiId } = useParams();
  const api = useGetApi({ apiId });
  const operations = useListApiOperations({ apiId });
  const applications = useListApplications();
  const updateMcp = useUpdateMcpExposure();
  const canManage = useCan("connect.manage");
  const [trying, setTrying] = useState<ApiOperation>();

  return (
    <PageLayout
      title={api.data?.name ?? "API"}
      description={api.data?.description}
      backHref={routes.connect.apis}
      backLabel="APIs"
      isLoading={api.isLoading}
    >
      <QueryState query={api}>
        {(apiData) => (
          <div className="grid gap-6">
            <SectionCard title="Overview">
              <DetailList
                columns={4}
                items={[
                  { label: "Base path", value: <span className="font-mono text-xs">{apiData.basePath}</span> },
                  { label: "Version", value: apiData.version },
                  { label: "Lifecycle", value: <StatusChip status={apiData.lifecycle} /> },
                  {
                    label: "Application",
                    value: applications.data?.items.find((a) => a.id === apiData.applicationId)?.name ?? apiData.applicationId,
                  },
                ]}
              />
            </SectionCard>
            <SectionCard
              title="Operations"
              subtitle="Turn on MCP to generate a tool definition on the managed MCP server. Exposure never grants access: callers still need the operation's permission."
              flush
            >
              <QueryState query={operations}>
                {(data) =>
                  data.items.length === 0 ? (
                    <NoDataFound message="This API has no operations." />
                  ) : (
                    <Table variant="secondary">
                      <Table.ScrollContainer>
                        <Table.Content aria-label="Operations" className="min-w-[860px]">
                          <Table.Header>
                            <Table.Column isRowHeader>Endpoint</Table.Column>
                            <Table.Column>Business operation</Table.Column>
                            <Table.Column>MCP tool</Table.Column>
                            <Table.Column className="text-right">Actions</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {data.items.map((op) => (
                              <Table.Row key={op.id} id={op.id}>
                                <Table.Cell>
                                  <div className="flex items-center gap-2">
                                    <MethodChip method={op.method} />
                                    <span className="font-mono text-xs whitespace-nowrap">{op.path}</span>
                                  </div>
                                  <p className="mt-1 text-xs text-muted">{op.summary}</p>
                                </Table.Cell>
                                <Table.Cell>
                                  <p className="font-mono text-xs">{op.businessOperation}</p>
                                  <p className="mt-0.5 font-mono text-xs text-muted">requires {op.permission}</p>
                                </Table.Cell>
                                <Table.Cell className="whitespace-nowrap">
                                  <Tooltip delay={300} isDisabled={canManage}>
                                    <Switch
                                      size="sm"
                                      aria-label={`Expose ${op.summary} over MCP`}
                                      isSelected={!!op.mcp?.enabled}
                                      isDisabled={updateMcp.isPending}
                                      onChange={(enabled) => updateMcp.mutate({ operationId: op.id, enabled })}
                                    >
                                      <Switch.Content>
                                        <Switch.Control>
                                          <Switch.Thumb />
                                        </Switch.Control>
                                        <span className={`font-mono text-xs ${op.mcp?.enabled ? "text-foreground" : "text-muted"}`}>
                                          {op.mcp?.toolName ?? "—"}
                                        </span>
                                      </Switch.Content>
                                    </Switch>
                                    <Tooltip.Content>Needs connect.manage; the platform will refuse the change</Tooltip.Content>
                                  </Tooltip>
                                </Table.Cell>
                                <Table.Cell className="text-right whitespace-nowrap">
                                  <Button size="sm" variant="ghost" onPress={() => setTrying(op)}>
                                    <Play className="size-3.5" aria-hidden />
                                    Try it
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  )
                }
              </QueryState>
            </SectionCard>
            {trying && <TryItDialog api={apiData} operation={trying} onClose={() => setTrying(undefined)} />}
          </div>
        )}
      </QueryState>
    </PageLayout>
  );
}
