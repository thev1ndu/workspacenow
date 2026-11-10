import { useState } from "react";
import { Column, Grid, Stack } from "@carbon/react";
import { useListAudit, type AuditQuery } from "@workspacenow/api-client";
import { PageLayout, SectionCard, SelectInput, useDebouncedValue } from "@workspacenow/views";

import { AuditTable } from "./subComponents/AuditTable";

const PAGE_SIZE = 25;

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
      <Stack gap={5}>
        <Grid fullWidth condensed>
          <Column sm={4} md={4} lg={4}>
            <SelectInput
              label="Actor"
              value={actorKind}
              onChange={(v) => {
                setActorKind(v);
                setPage(1);
              }}
              placeholder="All actors"
              options={[
                { value: "user", label: "People" },
                { value: "agent", label: "Agents" },
                { value: "workflow", label: "Workflows" },
                { value: "system", label: "System" },
              ]}
            />
          </Column>
          <Column sm={4} md={4} lg={4}>
            <SelectInput
              label="Outcome"
              value={outcome}
              onChange={(v) => {
                setOutcome(v);
                setPage(1);
              }}
              placeholder="All outcomes"
              options={[
                { value: "allowed", label: "Allowed" },
                { value: "denied", label: "Denied" },
                { value: "failed", label: "Failed" },
              ]}
            />
          </Column>
        </Grid>
        <SectionCard title="Records" subtitle={audit.data ? `${audit.data.total} records` : undefined} flush>
          <AuditTable
            records={audit.data?.items ?? []}
            loading={audit.isLoading}
            error={audit.error}
            server={{
              search,
              onSearchChange: (v) => {
                setSearch(v);
                setPage(1);
              },
              page,
              pageSize: PAGE_SIZE,
              total: audit.data?.total ?? 0,
              onPageChange: setPage,
            }}
          />
        </SectionCard>
      </Stack>
    </PageLayout>
  );
}
