import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";
import { useListAgents } from "@workspacenow/api-client";
import { buildPath, routes, type Agent } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TablePager, TextInput, TextLink, SectionCardSkeleton, TableSkeleton, usePagination } from "@workspacenow/views";

function AgentTable({ agents, label, pager }: { agents: Agent[]; label: string; pager?: { page: number; totalPages: number; total: number; pageSize: number; onPageChange: (p: number) => void } }) {
  if (agents.length === 0) return <NoDataFound message="No agents." />;
  return (
    <>
    <TableContainer aria-label={label}>
      <Table className="min-w-[760px]">
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Description</TableHeader>
            <TableHeader>Model</TableHeader>
            <TableHeader className="text-right">Tools</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.id} id={agent.id}>
              <TableCell className="whitespace-nowrap">
                <TextLink to={buildPath(routes.ai.agent, { agentId: agent.id })}>{agent.name}</TextLink>
              </TableCell>
              <TableCell className="text-muted">{agent.description}</TableCell>
              <TableCell className="font-mono text-xs whitespace-nowrap">{agent.model}</TableCell>
              <TableCell className="text-right tabular-nums">{agent.tools.length}</TableCell>
              <TableCell>
                <StatusChip status={agent.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
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
