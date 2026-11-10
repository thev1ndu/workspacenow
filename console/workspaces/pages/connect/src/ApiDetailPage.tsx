import { useState } from "react";
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Toggle } from "@carbon/react";
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
                    <TableContainer>
                      <Table aria-label="Operations" className="min-w-[860px]">
                        <TableHead>
                          <TableRow>
                            <TableHeader scope="col">Endpoint</TableHeader>
                            <TableHeader scope="col">Business operation</TableHeader>
                            <TableHeader scope="col">MCP tool</TableHeader>
                            <TableHeader scope="col" className="text-right">
                              Actions
                            </TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.items.map((op) => (
                            <TableRow key={op.id} id={op.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <MethodChip method={op.method} />
                                  <span className="font-mono text-xs whitespace-nowrap">{op.path}</span>
                                </div>
                                <p className="mt-1 text-xs text-muted">{op.summary}</p>
                              </TableCell>
                              <TableCell>
                                <p className="font-mono text-xs">{op.businessOperation}</p>
                                <p className="mt-0.5 font-mono text-xs text-muted">requires {op.permission}</p>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <div
                                  className="flex items-center gap-2"
                                  title={!canManage ? "Needs connect.manage; the platform will refuse the change" : undefined}
                                >
                                  <Toggle
                                    id={`mcp-${op.id}`}
                                    size="sm"
                                    hideLabel
                                    aria-label={`Expose ${op.summary} over MCP`}
                                    toggled={!!op.mcp?.enabled}
                                    disabled={updateMcp.isPending}
                                    onToggle={(enabled) => updateMcp.mutate({ operationId: op.id, enabled })}
                                  />
                                  <span className={`font-mono text-xs ${op.mcp?.enabled ? "text-foreground" : "text-muted"}`}>
                                    {op.mcp?.toolName ?? "—"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <Button kind="ghost" size="sm" onClick={() => setTrying(op)}>
                                  <Play className="size-3.5" aria-hidden />
                                  Try it
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
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
