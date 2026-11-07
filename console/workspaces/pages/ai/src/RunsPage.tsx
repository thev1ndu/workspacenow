import { useState } from "react";
import { useListAgentRuns, useListAgents } from "@workspacenow/api-client";
import { PageLayout, QueryState, SectionCard, SelectInput, TablePager, TextInput, useDebouncedValue } from "@workspacenow/views";
import { RunsTable } from "./subComponents/RunsTable";

const PAGE_SIZE = 10;

export function RunsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const runs = useListAgentRuns({ q: q || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const agents = useListAgents();

  return (
    <PageLayout title="Agent runs" description="Every agent execution, manual or started by a workflow.">
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <TextInput label="Search runs" value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Run id or prompt" />
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
            {(data) => (
              <>
                <RunsTable runs={status ? data.items.filter((r) => r.status === status) : data.items} agents={agents.data?.items} />
                <TablePager
                  page={page}
                  totalPages={Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
                  total={data.total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </>
            )}
          </QueryState>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
