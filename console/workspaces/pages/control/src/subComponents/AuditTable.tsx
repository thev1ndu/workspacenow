import { Tag } from "@carbon/react";
import { buildPath, routes, type AuditRecord } from "@workspacenow/types";
import { ActorLabel, StatusChip, TextLink, formatDateTime, formatShortDateTime } from "@workspacenow/views";

import styles from "../control.module.scss";
import { ControlTable, type ServerPaging } from "./ControlTable";

const rowId = (record: AuditRecord) => record.id;
const searchText = (r: AuditRecord) => [r.actor.name, r.entryPoint, r.action, r.resource, r.detail, r.outcome, r.traceId].join(" ");

interface AuditTableProps {
  records: AuditRecord[];
  showTrace?: boolean;
  /** Search and paging done by the API; without it the records are searched and paged here. */
  server?: ServerPaging;
  loading?: boolean;
  error?: unknown;
  /** Show every record without a search field or pager. */
  plain?: boolean;
}

export function AuditTable({ records, showTrace = true, server, loading, error, plain }: AuditTableProps) {
  const columns = [
    {
      key: "time",
      header: "Time",
      cell: (record: AuditRecord) => (
        <time className={`${styles.nowrap} ${styles.muted}`} dateTime={record.time} title={formatDateTime(record.time)}>
          {formatShortDateTime(record.time)}
        </time>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      cell: (record: AuditRecord) => (
        <>
          <ActorLabel actor={record.actor} />
          {record.actor.onBehalfOf && <p className={styles.caption}>on behalf of {record.actor.onBehalfOf}</p>}
        </>
      ),
    },
    {
      key: "entryPoint",
      header: "Entry point",
      cell: (record: AuditRecord) => (
        <Tag size="sm" type="gray">
          {record.entryPoint}
        </Tag>
      ),
    },
    {
      key: "action",
      header: "Action and resource",
      cell: (record: AuditRecord) => (
        <>
          <p className={styles.monoLarge}>{record.action}</p>
          <p className={`${styles.mono} ${styles.muted}`}>{record.resource}</p>
          {record.detail && <p className={`${styles.caption} ${record.outcome === "denied" ? styles.danger : ""}`}>{record.detail}</p>}
        </>
      ),
    },
    { key: "outcome", header: "Outcome", cell: (record: AuditRecord) => <StatusChip status={record.outcome} /> },
    ...(showTrace
      ? [
          {
            key: "trace",
            header: "Trace",
            cell: (record: AuditRecord) => (
              <span className={styles.monoLarge}>
                <TextLink to={buildPath(routes.control.trace, { traceId: record.traceId })}>{record.traceId}</TextLink>
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <ControlTable
      label="Audit records"
      rows={records}
      rowId={rowId}
      columns={columns}
      emptyMessage="No audit records match."
      loading={loading}
      error={error}
      server={server}
      searchText={server || plain ? undefined : searchText}
      searchLabel="Search audit records"
      paginate={!plain}
      rowTone={(record) => (record.outcome === "denied" ? "error" : undefined)}
    />
  );
}
