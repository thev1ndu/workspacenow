import { useState } from "react";
import { Button, Chip, Table } from "@heroui/react";
import { Plus } from "@workspacenow/icons";
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
        <Button onPress={() => setRegistering(true)}>
          <Plus className="size-4" aria-hidden />
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
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="MCP tools" className="min-w-[900px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Tool</Table.Column>
                        <Table.Column>Server</Table.Column>
                        <Table.Column>Business operation</Table.Column>
                        <Table.Column>Permission</Table.Column>
                        <Table.Column>Version</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((tool) => {
                          const id = `${tool.serverId}-${tool.name}`;
                          return (
                            <Table.Row key={id} id={id}>
                              <Table.Cell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto px-1 py-0.5 font-mono text-xs font-medium"
                                  onPress={() => setSelected(tool)}
                                >
                                  {tool.name}
                                </Button>
                                {/* w-0 min-w-full: the description fills the column the tool name sets instead of widening the table. */}
                                <p className="mt-0.5 w-0 min-w-full truncate px-1 text-xs text-muted" title={tool.description}>
                                  {tool.description}
                                </p>
                              </Table.Cell>
                              <Table.Cell>
                                <McpServerLabel server={serverOf(tool.serverId) ?? { name: tool.serverId, kind: tool.source === "workspacenow" ? "managed" : "external" }} />
                              </Table.Cell>
                              <Table.Cell className="font-mono text-xs">{tool.businessOperation ?? "—"}</Table.Cell>
                              <Table.Cell className="font-mono text-xs">{tool.permission ?? "—"}</Table.Cell>
                              <Table.Cell className="tabular-nums">{tool.version}</Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
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
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="External MCP servers" className="min-w-[860px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Name</Table.Column>
                        <Table.Column>URL</Table.Column>
                        <Table.Column>Auth</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>Discovered tools</Table.Column>
                        <Table.Column>Registered</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {external.map((server) => (
                          <Table.Row key={server.id} id={server.id}>
                            <Table.Cell className="font-medium">
                              <McpServerLabel server={server} />
                            </Table.Cell>
                            <Table.Cell className="font-mono text-xs">{server.url}</Table.Cell>
                            <Table.Cell>{server.auth}</Table.Cell>
                            <Table.Cell>
                              <StatusChip status={server.status} />
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex flex-wrap gap-1">
                                {server.tools.map((t) => (
                                  <Chip key={t.name} size="sm" variant="secondary" className="font-mono">
                                    {t.name}
                                  </Chip>
                                ))}
                              </div>
                            </Table.Cell>
                            <Table.Cell className="text-muted">{formatRelative(server.registeredAt)}</Table.Cell>
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
      </div>
      {selected && <ToolDefinitionDialog tool={selected} onClose={() => setSelected(undefined)} />}
      {registering && <RegisterMcpServerDialog onClose={() => setRegistering(false)} />}
    </PageLayout>
  );
}
