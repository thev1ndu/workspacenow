import { useState } from "react";
import { useListAudit, type AuditQuery } from "@workspacenow/api-client";

const PAGE_SIZE = 25;
import { PageLayout, QueryState, SectionCard, SelectInput, TablePager, TextInput, useDebouncedValue } from "@workspacenow/views";
import { AuditTable } from "./subComponents/AuditTable";

export function AuditPage() {
  const [actorKind, setActorKind] = useState("");
  const [outcome, setOutcome] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const query: AuditQuery = {
    actorKind: (actorKind || undefined) as AuditQuery["actorKind"],
    outcome: (outcome || undefined) as AuditQuery["outcome"],
    q: q || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
  const audit = useListAudit(query);

  return (
    <PageLayout title="Audit log" description="Every governed action from every entry point: who, through what, on what, and whether it was allowed.">
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_2fr]">
          <SelectInput
            label="Actor"
            value={actorKind}
            onChange={setActorKind}
            placeholder="All actors"
            options={[
              { value: "user", label: "People" },
              { value: "agent", label: "Agents" },
              { value: "workflow", label: "Workflows" },
              { value: "system", label: "System" },
            ]}
          />
          <SelectInput
            label="Outcome"
            value={outcome}
            onChange={setOutcome}
            placeholder="All outcomes"
            options={[
              { value: "allowed", label: "Allowed" },
              { value: "denied", label: "Denied" },
              { value: "failed", label: "Failed" },
            ]}
          />
          <TextInput label="Search" value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Action, resource, actor or detail" />
        </div>
        <SectionCard title="Records" subtitle={audit.data ? `${audit.data.total} records` : undefined} flush>
          <QueryState query={audit}>
            {(data) => (
              <>
                <AuditTable records={data.items} />
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
