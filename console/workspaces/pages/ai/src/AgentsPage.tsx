import { Stack } from "@carbon/react";
import { useListAgents } from "@workspacenow/api-client";
import { buildPath, routes, type Agent } from "@workspacenow/types";
import { PageLayout, QueryState, SectionCard, SectionCardSkeleton, StatusChip, TableSkeleton, TextLink } from "@workspacenow/views";
import { PagedTable } from "./subComponents/ResourceTable";

import common from "./common.module.scss";

function AgentTable({ agents, label }: { agents: Agent[]; label: string }) {
  return (
    <PagedTable
      label={label}
      items={agents}
      rowKey={(agent) => agent.id}
      pageSize={5}
      emptyMessage="No agents."
      searchPlaceholder="Name, description, model or status"
      searchText={(a) => `${a.id} ${a.name} ${a.description} ${a.model} ${a.status}`}
      columns={[
        { key: "name", header: "Name", nowrap: true, cell: (agent) => <TextLink to={buildPath(routes.ai.agent, { agentId: agent.id })}>{agent.name}</TextLink> },
        { key: "description", header: "Description", cell: (agent) => agent.description },
        { key: "model", header: "Model", nowrap: true, cell: (agent) => <span className={common.mono}>{agent.model}</span> },
        { key: "tools", header: "Tools", end: true, cell: (agent) => <span className={common.numeric}>{agent.tools.length}</span> },
        { key: "status", header: "Status", cell: (agent) => <StatusChip status={agent.status} /> },
      ]}
    />
  );
}

export function AgentsPage() {
  const agents = useListAgents();
  const items = agents.data?.items ?? [];
  return (
    <PageLayout title="Agents" description="Business agents built by teams, and the platform's built-in agents.">
      <QueryState
        query={agents}
        skeleton={
          <Stack gap={6}>
            <SectionCardSkeleton flush>
              <TableSkeleton rows={2} columns={5} />
            </SectionCardSkeleton>
            <SectionCardSkeleton flush>
              <TableSkeleton rows={6} columns={5} />
            </SectionCardSkeleton>
          </Stack>
        }
      >
        {() => (
          <Stack gap={6}>
            <SectionCard title="Business agents" subtitle="Act on business data through assigned MCP tools." flush>
              <AgentTable label="Business agents" agents={items.filter((a) => a.kind === "business")} />
            </SectionCard>
            <SectionCard title="Built-in platform agents" subtitle="Help build applications; they propose Blueprint changes for a human to approve." flush>
              <AgentTable label="Built-in platform agents" agents={items.filter((a) => a.kind === "platform")} />
            </SectionCard>
          </Stack>
        )}
      </QueryState>
    </PageLayout>
  );
}
