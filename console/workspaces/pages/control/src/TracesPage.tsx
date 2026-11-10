import { Tag } from "@carbon/react";
import { useListTraces } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { useState } from "react";
import { PageLayout, SectionCard, TextLink, formatRelative, useDebouncedValue } from "@workspacenow/views";

import styles from "./control.module.scss";
import { ControlTable } from "./subComponents/ControlTable";
import { formatSpan } from "./utils";

const PAGE_SIZE = 15;

type TraceRow = NonNullable<ReturnType<typeof useListTraces>["data"]>["items"][number];

const rowId = (trace: TraceRow) => trace.traceId;

const columns = [
  {
    key: "trace",
    header: "Trace",
    cell: (trace: TraceRow) => (
      <>
        <TextLink to={buildPath(routes.control.trace, { traceId: trace.traceId })}>{trace.title}</TextLink>
        <p className={`${styles.mono} ${styles.muted}`}>{trace.traceId}</p>
      </>
    ),
  },
  {
    key: "actors",
    header: "Actors",
    cell: (trace: TraceRow) => (
      <div className={styles.tags}>
        {trace.actors.map((a) => (
          <Tag key={a} size="sm" type="gray">
            {a}
          </Tag>
        ))}
      </div>
    ),
  },
  { key: "spans", header: "Spans", cell: (trace: TraceRow) => <span className={styles.tabular}>{trace.spanCount}</span> },
  {
    key: "denied",
    header: "Denied",
    cell: (trace: TraceRow) =>
      trace.denied > 0 ? (
        <Tag size="sm" type="red">
          {trace.denied}
        </Tag>
      ) : (
        <span className={`${styles.muted} ${styles.tabular}`}>0</span>
      ),
  },
  { key: "started", header: "Started", cell: (trace: TraceRow) => <span className={`${styles.nowrap} ${styles.muted}`}>{formatRelative(trace.startedAt)}</span> },
  { key: "duration", header: "Duration", cell: (trace: TraceRow) => <span className={styles.tabular}>{formatSpan(trace.startedAt, trace.endedAt)}</span> },
];

export function TracesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const traces = useListTraces({ q: q || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  return (
    <PageLayout title="Traces" description="One trace follows a request across Studio, APIs, MCP tools, agents and workflows.">
      <SectionCard flush>
        <ControlTable
          label="Traces"
          rows={traces.data?.items ?? []}
          rowId={rowId}
          columns={columns}
          emptyMessage="No traces yet."
          loading={traces.isLoading}
          error={traces.error}
          searchLabel="Search by trace id, title or actor"
          server={{
            search,
            onSearchChange: (v) => {
              setSearch(v);
              setPage(1);
            },
            page,
            pageSize: PAGE_SIZE,
            total: traces.data?.total ?? 0,
            onPageChange: setPage,
          }}
        />
      </SectionCard>
    </PageLayout>
  );
}
