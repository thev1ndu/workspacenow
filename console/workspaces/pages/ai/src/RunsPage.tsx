import { useState } from "react";
import { useListAgentRuns, useListAgents } from "@workspacenow/api-client";
import { PageLayout, QueryState, SectionCard, SelectInput, useDebouncedValue } from "@workspacenow/views";
import { RunsTable } from "./subComponents/RunsTable";

const PAGE_SIZE = 10;

export function RunsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const runs = useListAgentRuns({ q: q || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const agents = useListAgents();

  const items = runs.data?.items ?? [];
  const total = runs.data?.total ?? 0;

  return (
    <PageLayout title="Agent runs" description="Every agent execution, manual or started by a workflow.">
      <SectionCard flush>
        {runs.error ? (
          <QueryState query={runs}>{() => null}</QueryState>
        ) : (
          // The table stays mounted while a search is in flight, so typing keeps focus in the toolbar search.
          <RunsTable
            runs={status ? items.filter((r) => r.status === status) : items}
            agents={agents.data?.items}
            loading={runs.isLoading}
            isFiltered={!!status}
            search={{
              value: search,
              onChange: (value) => {
                setSearch(value);
                setPage(1);
              },
              placeholder: "Run id or prompt",
            }}
            toolbar={
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
            }
            pager={{
              page,
              totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
              total,
              pageSize: PAGE_SIZE,
              onPageChange: setPage,
            }}
          />
        )}
      </SectionCard>
    </PageLayout>
  );
}
