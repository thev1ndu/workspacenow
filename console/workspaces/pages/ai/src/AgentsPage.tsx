import { Table } from "@heroui/react";
import { useListAgents } from "@workspacenow/api-client";
import { buildPath, routes, type Agent } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TextLink, SectionCardSkeleton, TableSkeleton } from "@workspacenow/views";

function AgentTable({ agents, label }: { agents: Agent[]; label: string }) {
  if (agents.length === 0) return <NoDataFound message="No agents." />;
  return (
    <Table variant="secondary">
      <Table.ScrollContainer>
        <Table.Content aria-label={label} className="min-w-[760px]">
          <Table.Header>
            <Table.Column isRowHeader>Name</Table.Column>
            <Table.Column>Description</Table.Column>
            <Table.Column>Model</Table.Column>
            <Table.Column className="text-right">Tools</Table.Column>
            <Table.Column>Status</Table.Column>
          </Table.Header>
          <Table.Body>
            {agents.map((agent) => (
              <Table.Row key={agent.id} id={agent.id}>
                <Table.Cell className="whitespace-nowrap">
                  <TextLink to={buildPath(routes.ai.agent, { agentId: agent.id })}>{agent.name}</TextLink>
                </Table.Cell>
                <Table.Cell className="text-muted">{agent.description}</Table.Cell>
                <Table.Cell className="font-mono text-xs whitespace-nowrap">{agent.model}</Table.Cell>
                <Table.Cell className="text-right tabular-nums">{agent.tools.length}</Table.Cell>
                <Table.Cell>
                  <StatusChip status={agent.status} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

export function AgentsPage() {
  const agents = useListAgents();
  return (
    <PageLayout title="Agents" description="Business agents built by teams, and the platform's built-in agents.">
      <QueryState query={agents} skeleton={
          <div className="grid gap-6">
            <SectionCardSkeleton flush>
              <TableSkeleton rows={2} columns={5} />
            </SectionCardSkeleton>
            <SectionCardSkeleton flush>
              <TableSkeleton rows={6} columns={5} />
            </SectionCardSkeleton>
          </div>
        }>
        {(data) => (
          <div className="grid gap-6">
            <SectionCard title="Business agents" subtitle="Act on business data through assigned MCP tools." flush>
              <AgentTable label="Business agents" agents={data.items.filter((a) => a.kind === "business")} />
            </SectionCard>
            <SectionCard title="Built-in platform agents" subtitle="Help build applications; they propose Blueprint changes for a human to approve." flush>
              <AgentTable label="Built-in platform agents" agents={data.items.filter((a) => a.kind === "platform")} />
            </SectionCard>
          </div>
        )}
      </QueryState>
    </PageLayout>
  );
}
