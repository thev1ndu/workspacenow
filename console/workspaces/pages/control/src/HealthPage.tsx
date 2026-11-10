import { Stack, Tag } from "@carbon/react";
import { useListErrorGroups, useListObservedServices } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { useState } from "react";
import { PageLayout, QueryState, SectionCard, TextLink, formatRelative, useDebouncedValue } from "@workspacenow/views";

import styles from "./control.module.scss";
import { ControlTable } from "./subComponents/ControlTable";

const PAGE_SIZE = 15;

type ServiceRow = NonNullable<ReturnType<typeof useListObservedServices>["data"]>["items"][number];
type ErrorRow = NonNullable<ReturnType<typeof useListErrorGroups>["data"]>["items"][number];

const serviceId = (s: ServiceRow) => s.service;
const errorId = (g: ErrorRow) => g.fingerprint;

function errorRateChip(rate: number) {
  if (rate >= 0.05) return <Tag size="sm" type="red">{(rate * 100).toFixed(1)}%</Tag>;
  if (rate > 0) return <Tag size="sm" type="warm-gray">{(rate * 100).toFixed(1)}%</Tag>;
  return <Tag size="sm" type="gray">0%</Tag>;
}

const serviceColumns = [
  { key: "service", header: "Service", cell: (s: ServiceRow) => <span className={styles.monoLarge}>{s.service}</span> },
  { key: "spans", header: "Spans", cell: (s: ServiceRow) => <span className={styles.tabular}>{s.spans}</span> },
  { key: "errors", header: "Errors", cell: (s: ServiceRow) => <span className={styles.tabular}>{s.errors}</span> },
  { key: "rate", header: "Error rate", cell: (s: ServiceRow) => errorRateChip(s.errorRate) },
  { key: "logs", header: "Logs", cell: (s: ServiceRow) => <span className={styles.tabular}>{s.logs}</span> },
  { key: "lastSeen", header: "Last seen", cell: (s: ServiceRow) => <span className={`${styles.nowrap} ${styles.muted}`}>{s.lastSeen ? formatRelative(s.lastSeen) : "-"}</span> },
];

const errorColumns = [
  {
    key: "error",
    header: "Error",
    cell: (g: ErrorRow) => (
      <>
        <p className={styles.name}>{g.message}</p>
        <p className={`${styles.mono} ${styles.muted}`}>{g.spanName}</p>
      </>
    ),
  },
  { key: "service", header: "Service", cell: (g: ErrorRow) => <span className={styles.mono}>{g.service}</span> },
  {
    key: "count",
    header: "Count",
    cell: (g: ErrorRow) => (
      <Tag size="sm" type="red">
        {g.count}
      </Tag>
    ),
  },
  { key: "lastSeen", header: "Last seen", cell: (g: ErrorRow) => <span className={`${styles.nowrap} ${styles.muted}`}>{formatRelative(g.lastSeen)}</span> },
  {
    key: "traces",
    header: "Traces",
    cell: (g: ErrorRow) => (
      <div className={styles.tags}>
        {g.traceIds.map((t) => (
          <span key={t} className={styles.mono}>
            <TextLink to={buildPath(routes.control.trace, { traceId: t })}>{t.slice(0, 8)}</TextLink>
          </span>
        ))}
      </div>
    ),
  },
];

export function HealthPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const errors = useListErrorGroups({ q: q || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const services = useListObservedServices();
  return (
    <PageLayout
      title="Health & errors"
      description="Per-service telemetry health and grouped error spans from the observer. Every error links back to its trace."
    >
      <Stack gap={6}>
        <SectionCard title="Services" flush>
          <QueryState query={services}>
            {(data) => (
              <ControlTable
                label="Observed services"
                rows={data.items}
                rowId={serviceId}
                columns={serviceColumns}
                emptyMessage="No telemetry yet. The observer has not received spans."
                searchText={(s) => s.service}
                searchLabel="Search services"
              />
            )}
          </QueryState>
        </SectionCard>
        <SectionCard title="Error groups" flush>
          <ControlTable
            label="Error groups"
            rows={errors.data?.items ?? []}
            rowId={errorId}
            columns={errorColumns}
            emptyMessage="No error spans recorded."
            loading={errors.isLoading}
            error={errors.error}
            server={{
              search,
              onSearchChange: (v) => {
                setSearch(v);
                setPage(1);
              },
              page,
              pageSize: PAGE_SIZE,
              total: errors.data?.total ?? 0,
              onPageChange: setPage,
            }}
            searchLabel="Search errors by message or span name"
          />
        </SectionCard>
      </Stack>
    </PageLayout>
  );
}
