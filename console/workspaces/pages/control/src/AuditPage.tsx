import { useState } from "react";
import { useListAudit, type AuditQuery } from "@workspacenow/api-client";
import { PageLayout, QueryState, SectionCard, SelectInput, TextInput } from "@workspacenow/views";
import { AuditTable } from "./subComponents/AuditTable";

export function AuditPage() {
  const [actorKind, setActorKind] = useState("");
  const [outcome, setOutcome] = useState("");
  const [search, setSearch] = useState("");
  const query: AuditQuery = {
    actorKind: (actorKind || undefined) as AuditQuery["actorKind"],
    outcome: (outcome || undefined) as AuditQuery["outcome"],
    q: search.trim() || undefined,
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
          <TextInput label="Search" value={search} onChange={setSearch} placeholder="Action, resource, actor or detail" />
        </div>
        <SectionCard title="Records" subtitle={audit.data ? `${audit.data.total} records` : undefined} flush>
          <QueryState query={audit}>{(data) => <AuditTable records={data.items.slice(0, 300)} />}</QueryState>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
