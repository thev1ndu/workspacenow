import { useMemo, useState } from "react";
import { useListAgentRuns, useListAgents } from "@workspacenow/api-client";
import { PageLayout, QueryState, SectionCard, SelectInput, TablePager, TextInput, usePagedSearch } from "@workspacenow/views";
import { RunsTable } from "./subComponents/RunsTable";

export function RunsPage() {
  const runs = useListAgentRuns();
  const agents = useListAgents();
  const [status, setStatus] = useState("");

  const byStatus = useMemo(() => {
    const items = runs.data?.items ?? [];
    if (!status) return items;
    return items.filter((r) => r.status === status);
  }, [runs.data?.items, status]);

  const paged = usePagedSearch(byStatus, 10, (run) => {
    const agent = agents.data?.items.find((a) => a.id === run.agentId);
    return [run.id, run.prompt, run.status, run.trigger, agent?.name ?? run.agentId].join(" ");
  });

  return (
    <PageLayout title="Agent runs" description="Every agent execution, manual or started by a workflow.">
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <TextInput label="Search runs" value={paged.search} onChange={paged.setSearch} placeholder="Run id, prompt, agent, status or trigger" />
          <SelectInput
            label="Status"
            value={status}
            onChange={setStatus}
            placeholder="All statuses"
            options={[
              { value: "completed", label: "Completed" },
              { value: "failed", label: "Failed" },
            ]}
          />
        </div>
        <SectionCard flush>
          <QueryState query={runs}>
            {() => (
              <>
                <RunsTable runs={paged.pageItems} agents={agents.data?.items} />
                <TablePager page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={paged.pageSize} onPageChange={paged.setPage} />
              </>
            )}
          </QueryState>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
