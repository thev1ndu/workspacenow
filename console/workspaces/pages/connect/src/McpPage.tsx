import { Add } from "@carbon/react/icons";
import { useState } from "react";
import { Button, Stack, Tag } from "@carbon/react";

import { useListMcpServers, useListMcpTools } from "@workspacenow/api-client";
import type { McpTool } from "@workspacenow/types";
import { DetailList, NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, formatRelative } from "@workspacenow/views";
import { McpServerLabel } from "./subComponents/McpServerLabel";
import { PagedTable } from "./subComponents/ResourceTable";
import { RegisterMcpServerDialog } from "./subComponents/RegisterMcpServerDialog";
import { ToolDefinitionDialog } from "./subComponents/ToolDefinitionDialog";

import common from "./common.module.scss";

export function McpPage() {
  const tools = useListMcpTools();
  const servers = useListMcpServers();
  const [selected, setSelected] = useState<McpTool>();
  const [registering, setRegistering] = useState(false);

  const serverOf = (id: string) => servers.data?.items.find((s) => s.id === id);
  const managed = servers.data?.items.find((s) => s.kind === "managed");
  const external = servers.data?.items.filter((s) => s.kind === "external") ?? [];

  return (
    <PageLayout
      title="MCP"
      description="WorkspaceNow is both an MCP server, exposing selected business operations as tools, and an MCP client of external servers."
      actions={
        <Button renderIcon={Add} onClick={() => setRegistering(true)}>
          Register MCP server
        </Button>
      }
    >
      <Stack gap={6}>
        <SectionCard title="Managed MCP server">
          {managed ? (
            <DetailList
              columns={4}
              items={[
                { label: "Endpoint", value: <span className={common.mono}>{managed.url}</span> },
                { label: "Authentication", value: "OAuth 2.0 (customer identity provider)" },
                { label: "Status", value: <StatusChip status={managed.status} /> },
                { label: "Exposed tools", value: tools.data?.items.filter((t) => t.source === "workspacenow").length ?? "-" },
              ]}
            />
          ) : (
            <NoDataFound message="No managed server." />
          )}
        </SectionCard>

        <SectionCard title="Tools" subtitle="Select a tool to see its generated definition." flush>
          <QueryState query={tools}>
            {(data) => (
              <PagedTable
                label="MCP tools"
                items={data.items}
                rowKey={(tool) => `${tool.serverId}-${tool.name}`}
                emptyMessage="No tools. Expose an API operation over MCP to create one."
                searchPlaceholder="Search tools"
                searchText={(tool) => `${tool.name} ${tool.description} ${tool.serverId} ${tool.businessOperation ?? ""} ${tool.permission ?? ""}`}
                columns={[
                  {
                    key: "tool",
                    header: "Tool",
                    cell: (tool) => (
                      <Stack gap={1}>
                        <Button kind="ghost" size="sm" onClick={() => setSelected(tool)}>
                          {tool.name}
                        </Button>
                        <span className={`${common.secondary} ${common.truncate}`} title={tool.description}>
                          {tool.description}
                        </span>
                      </Stack>
                    ),
                  },
                  {
                    key: "server",
                    header: "Server",
                    cell: (tool) => (
                      <McpServerLabel server={serverOf(tool.serverId) ?? { name: tool.serverId, kind: tool.source === "workspacenow" ? "managed" : "external" }} />
                    ),
                  },
                  { key: "operation", header: "Business operation", cell: (tool) => <span className={common.mono}>{tool.businessOperation ?? "-"}</span> },
                  { key: "permission", header: "Permission", cell: (tool) => <span className={common.mono}>{tool.permission ?? "-"}</span> },
                  { key: "version", header: "Version", cell: (tool) => <span className={common.numeric}>{tool.version}</span> },
                ]}
              />
            )}
          </QueryState>
        </SectionCard>

        <SectionCard title="External MCP servers" subtitle="Their tools can be assigned to agents in the AI workspace." flush>
          <QueryState query={servers}>
            {() => (
              <PagedTable
                label="External MCP servers"
                items={external}
                rowKey={(server) => server.id}
                emptyMessage="No external servers registered."
                searchPlaceholder="Search servers"
                searchText={(server) => `${server.name} ${server.url} ${server.auth} ${server.status} ${server.tools.map((t) => t.name).join(" ")}`}
                columns={[
                  { key: "name", header: "Name", cell: (server) => <McpServerLabel server={server} /> },
                  { key: "url", header: "URL", cell: (server) => <span className={common.mono}>{server.url}</span> },
                  { key: "auth", header: "Auth", cell: (server) => server.auth },
                  { key: "status", header: "Status", cell: (server) => <StatusChip status={server.status} /> },
                  {
                    key: "tools",
                    header: "Discovered tools",
                    cell: (server) => (
                      <div className={common.wrap}>
                        {server.tools.map((t) => (
                          <Tag key={t.name} size="sm" type="gray">
                            {t.name}
                          </Tag>
                        ))}
                      </div>
                    ),
                  },
                  { key: "registered", header: "Registered", cell: (server) => formatRelative(server.registeredAt) },
                ]}
              />
            )}
          </QueryState>
        </SectionCard>
      </Stack>
      {selected && <ToolDefinitionDialog tool={selected} onClose={() => setSelected(undefined)} />}
      {registering && <RegisterMcpServerDialog onClose={() => setRegistering(false)} />}
    </PageLayout>
  );
}
