import { Play } from "@carbon/react/icons";
import { useState } from "react";
import { Button, Stack, Toggle } from "@carbon/react";

import { useParams } from "react-router-dom";
import { useCan, useGetApi, useListApiOperations, useListApplications, useUpdateMcpExposure } from "@workspacenow/api-client";
import { routes, type ApiOperation } from "@workspacenow/types";
import { DetailList, PageLayout, QueryState, SectionCard, StatusChip } from "@workspacenow/views";
import { MethodChip } from "./subComponents/MethodChip";
import { PagedTable } from "./subComponents/ResourceTable";
import { TryItDialog } from "./subComponents/TryItDialog";

import common from "./common.module.scss";

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
          <Stack gap={6}>
            <SectionCard title="Overview">
              <DetailList
                columns={4}
                items={[
                  { label: "Base path", value: <span className={common.mono}>{apiData.basePath}</span> },
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
                {(data) => (
                  <PagedTable
                    label="Operations"
                    items={data.items}
                    rowKey={(op) => op.id}
                    emptyMessage="This API has no operations."
                    searchPlaceholder="Search operations"
                    searchText={(op) => `${op.method} ${op.path} ${op.summary} ${op.businessOperation} ${op.permission} ${op.mcp?.toolName ?? ""}`}
                    columns={[
                      {
                        key: "endpoint",
                        header: "Endpoint",
                        cell: (op) => (
                          <Stack gap={2}>
                            <span className={common.inline}>
                              <MethodChip method={op.method} />
                              <span className={common.mono}>{op.path}</span>
                            </span>
                            <span className={common.secondary}>{op.summary}</span>
                          </Stack>
                        ),
                      },
                      {
                        key: "operation",
                        header: "Business operation",
                        cell: (op) => (
                          <Stack gap={1}>
                            <span className={common.mono}>{op.businessOperation}</span>
                            <span className={common.secondary}>requires {op.permission}</span>
                          </Stack>
                        ),
                      },
                      {
                        key: "mcp",
                        header: "MCP tool",
                        nowrap: true,
                        cell: (op) => (
                          <span className={common.inline} title={!canManage ? "Needs connect.manage; the platform will refuse the change" : undefined}>
                            <Toggle
                              id={`mcp-${op.id}`}
                              size="sm"
                              hideLabel
                              labelText={`Expose ${op.summary} over MCP`}
                              aria-label={`Expose ${op.summary} over MCP`}
                              toggled={!!op.mcp?.enabled}
                              disabled={updateMcp.isPending}
                              onToggle={(enabled) => updateMcp.mutate({ operationId: op.id, enabled })}
                            />
                            <span className={common.mono}>{op.mcp?.toolName ?? "-"}</span>
                          </span>
                        ),
                      },
                      {
                        key: "actions",
                        header: "Actions",
                        end: true,
                        nowrap: true,
                        cell: (op) => (
                          <Button kind="ghost" size="sm" renderIcon={Play} onClick={() => setTrying(op)}>
                            Try it
                          </Button>
                        ),
                      },
                    ]}
                  />
                )}
              </QueryState>
            </SectionCard>
            {trying && <TryItDialog api={apiData} operation={trying} onClose={() => setTrying(undefined)} />}
          </Stack>
        )}
      </QueryState>
    </PageLayout>
  );
}
