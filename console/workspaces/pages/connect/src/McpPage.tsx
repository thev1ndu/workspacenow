import { Add } from "@carbon/react/icons";
import { useState } from "react";
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";

import { useListMcpServers, useListMcpTools } from "@workspacenow/api-client";
import type { McpTool } from "@workspacenow/types";
import { DetailList, NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, formatRelative } from "@workspacenow/views";
import { McpServerLabel } from "./subComponents/McpServerLabel";
import { RegisterMcpServerDialog } from "./subComponents/RegisterMcpServerDialog";
import { ToolDefinitionDialog } from "./subComponents/ToolDefinitionDialog";

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
        <Button onClick={() => setRegistering(true)}>
          <Add className="size-4" aria-hidden />
          Register MCP server
        </Button>
      }
    >
      <div className="grid gap-6">
        <SectionCard title="Managed MCP server">
          {managed ? (
            <DetailList
              columns={4}
              items={[
                { label: "Endpoint", value: <span className="font-mono text-xs break-all">{managed.url}</span> },
                { label: "Authentication", value: "OAuth 2.0 (customer identity provider)" },
                { label: "Status", value: <StatusChip status={managed.status} /> },
                { label: "Exposed tools", value: tools.data?.items.filter((t) => t.source === "workspacenow").length ?? "—" },
              ]}
            />
          ) : (
            <NoDataFound message="No managed server." />
          )}
        </SectionCard>

        <SectionCard title="Tools" subtitle="Select a tool to see its generated definition." flush>
          <QueryState query={tools}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No tools. Expose an API operation over MCP to create one." />
              ) : (
                <TableContainer>
                  <Table aria-label="MCP tools" className="min-w-[900px]">
                    <TableHead>
                      <TableRow>
                        <TableHeader scope="col">Tool</TableHeader>
                        <TableHeader scope="col">Server</TableHeader>
                        <TableHeader scope="col">Business operation</TableHeader>
                        <TableHeader scope="col">Permission</TableHeader>
                        <TableHeader scope="col">Version</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.items.map((tool) => {
                        const id = `${tool.serverId}-${tool.name}`;
                        return (
                          <TableRow key={id} id={id}>
                            <TableCell>
                              <Button
                                kind="ghost"
                                size="sm"
                                className="h-auto px-1 py-0.5 font-mono text-xs font-medium"
                                onClick={() => setSelected(tool)}
                              >
                                {tool.name}
                              </Button>
                              {/* w-0 min-w-full: the description fills the column the tool name sets instead of widening the table. */}
                              <p className="mt-0.5 w-0 min-w-full truncate px-1 text-xs text-muted" title={tool.description}>
                                {tool.description}
                              </p>
                            </TableCell>
                            <TableCell>
                              <McpServerLabel server={serverOf(tool.serverId) ?? { name: tool.serverId, kind: tool.source === "workspacenow" ? "managed" : "external" }} />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{tool.businessOperation ?? "—"}</TableCell>
                            <TableCell className="font-mono text-xs">{tool.permission ?? "—"}</TableCell>
                            <TableCell className="tabular-nums">{tool.version}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            }
          </QueryState>
        </SectionCard>

        <SectionCard title="External MCP servers" subtitle="Their tools can be assigned to agents in the AI workspace." flush>
          <QueryState query={servers}>
            {() =>
              external.length === 0 ? (
                <NoDataFound message="No external servers registered." />
              ) : (
                <TableContainer>
                  <Table aria-label="External MCP servers" className="min-w-[860px]">
                    <TableHead>
                      <TableRow>
                        <TableHeader scope="col">Name</TableHeader>
                        <TableHeader scope="col">URL</TableHeader>
                        <TableHeader scope="col">Auth</TableHeader>
                        <TableHeader scope="col">Status</TableHeader>
                        <TableHeader scope="col">Discovered tools</TableHeader>
                        <TableHeader scope="col">Registered</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {external.map((server) => (
                        <TableRow key={server.id} id={server.id}>
                          <TableCell className="font-medium">
                            <McpServerLabel server={server} />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{server.url}</TableCell>
                          <TableCell>{server.auth}</TableCell>
                          <TableCell>
                            <StatusChip status={server.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {server.tools.map((t) => (
                                <Tag key={t.name} size="sm" type="gray" className="font-mono">
                                  {t.name}
                                </Tag>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted">{formatRelative(server.registeredAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            }
          </QueryState>
        </SectionCard>
      </div>
      {selected && <ToolDefinitionDialog tool={selected} onClose={() => setSelected(undefined)} />}
      {registering && <RegisterMcpServerDialog onClose={() => setRegistering(false)} />}
    </PageLayout>
  );
}
