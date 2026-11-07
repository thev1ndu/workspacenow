import { useMemo, useState } from "react";
import { Table } from "@heroui/react";
import { useListAgents } from "@workspacenow/api-client";
import { buildPath, routes, type Agent } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TablePager, TextInput, TextLink, SectionCardSkeleton, TableSkeleton, usePagination } from "@workspacenow/views";

function AgentTable({ agents, label, pager }: { agents: Agent[]; label: string; pager?: { page: number; totalPages: number; total: number; pageSize: number; onPageChange: (p: number) => void } }) {
  if (agents.length === 0) return <NoDataFound message="No agents." />;
  return (
    <>
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
    {pager && <TablePager page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize} onPageChange={pager.onPageChange} />}
    </>
  );
}

export function AgentsPage() {
  const agents = useListAgents();
  const [search, setSearch] = useState("");
  const [bizPage, setBizPage] = useState(1);
  const [platPage, setPlatPage] = useState(1);
  const q = search.trim().toLowerCase();
  const business = useMemo(
    () => (agents.data?.items ?? []).filter((a) => a.kind === "business" && (!q || `${a.id} ${a.name} ${a.description} ${a.model} ${a.status}`.toLowerCase().includes(q))),
    [agents.data?.items, q],
  );
  const platform = useMemo(
    () => (agents.data?.items ?? []).filter((a) => a.kind === "platform" && (!q || `${a.id} ${a.name} ${a.description} ${a.model} ${a.status}`.toLowerCase().includes(q))),
    [agents.data?.items, q],
  );
  const bizPager = usePagination(business.length, 5, bizPage, setBizPage);
  const platPager = usePagination(platform.length, 5, platPage, setPlatPage);
  return (
    <PageLayout title="Agents" description="Business agents built by teams, and the platform's built-in agents.">
      <div className="grid gap-5">
      <div className="max-w-sm">
        <TextInput label="Search agents" value={search} onChange={(v) => { setSearch(v); setBizPage(1); setPlatPage(1); }} placeholder="Name, description, model or status" />
      </div>
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
        {() => (
          <div className="grid gap-6">
            <SectionCard title="Business agents" subtitle="Act on business data through assigned MCP tools." flush>
              <AgentTable label="Business agents" agents={business.slice(bizPager.start, bizPager.end)} pager={{ page: bizPager.page, totalPages: bizPager.totalPages, total: business.length, pageSize: 5, onPageChange: setBizPage }} />
            </SectionCard>
            <SectionCard title="Built-in platform agents" subtitle="Help build applications; they propose Blueprint changes for a human to approve." flush>
              <AgentTable label="Built-in platform agents" agents={platform.slice(platPager.start, platPager.end)} pager={{ page: platPager.page, totalPages: platPager.totalPages, total: platform.length, pageSize: 5, onPageChange: setPlatPage }} />
            </SectionCard>
          </div>
        )}
      </QueryState>
      </div>
    </PageLayout>
  );
}
