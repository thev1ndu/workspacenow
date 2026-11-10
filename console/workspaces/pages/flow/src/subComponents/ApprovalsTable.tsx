import { useState } from "react";
import { Button } from "@carbon/react";
import { Checkmark, Close } from "@carbon/react/icons";

import { buildPath, routes, type Approval } from "@workspacenow/types";
import { StatusChip, TextLink, formatDateTime, formatRelative } from "@workspacenow/views";
import { DecisionModal, type Decision } from "./DecisionModal";
import { PagedTable, type PagedTableColumn } from "./PagedTable";

import styles from "../Flow.module.scss";

export type ApprovalFilter = "pending" | "decided";

/** Pending approvals with approve and reject actions, or the decided ones with who decided and why. */
export function ApprovalsTable({ approvals, filter }: { approvals: Approval[]; filter: ApprovalFilter }) {
  const [deciding, setDeciding] = useState<{ approval: Approval; decision: Decision } | null>(null);
  const pending = filter === "pending";
  const items = approvals.filter((a) => (pending ? a.status === "pending" : a.status !== "pending"));

  const columns: PagedTableColumn<Approval>[] = [
    {
      key: "request",
      header: "Request",
      render: (a) => (
        <div className={styles.cellStack}>
          <strong>{a.title}</strong>
          <span className={styles.cellHelper}>{a.summary}</span>
        </div>
      ),
    },
    { key: "resource", header: "Resource", render: (a) => (a.subject ? `${a.subject.entity} ${a.subject.recordId}` : "-") },
    { key: "permission", header: "Requires", render: (a) => <span className={styles.mono}>{a.permission}</span> },
    {
      key: "requested",
      header: "Requested",
      nowrap: true,
      render: (a) => (
        <div className={styles.cellStack}>
          <span>{formatRelative(a.requestedAt)}</span>
          <span className={styles.muted}>{formatDateTime(a.requestedAt)}</span>
        </div>
      ),
    },
    {
      key: "links",
      header: "Links",
      nowrap: true,
      render: (a) => (
        <div className={styles.cellStack}>
          <TextLink to={buildPath(routes.flow.execution, { executionId: a.executionId })}>Execution</TextLink>
          <TextLink to={buildPath(routes.control.trace, { traceId: a.traceId })}>Trace</TextLink>
        </div>
      ),
    },
    pending
      ? {
          key: "decision",
          header: "Decision",
          nowrap: true,
          render: (a) => (
            <div className={styles.tags}>
              <Button size="sm" renderIcon={Checkmark} onClick={() => setDeciding({ approval: a, decision: "approved" })}>
                Approve
              </Button>
              <Button size="sm" kind="danger--tertiary" renderIcon={Close} onClick={() => setDeciding({ approval: a, decision: "rejected" })}>
                Reject
              </Button>
            </div>
          ),
        }
      : {
          key: "decision",
          header: "Decision",
          render: (a) => (
            <div className={styles.cellStack}>
              <StatusChip status={a.status} />
              <span className={styles.muted}>
                By {a.decidedBy} {formatRelative(a.decidedAt)}
              </span>
              {a.comment && <span className={styles.cellHelper}>&ldquo;{a.comment}&rdquo;</span>}
            </div>
          ),
        },
  ];

  return (
    <>
      <PagedTable
        label={pending ? "Pending approvals" : "Decided approvals"}
        items={items}
        columns={columns}
        searchText={(a) => `${a.id} ${a.title} ${a.summary} ${a.subject?.entity ?? ""} ${a.subject?.recordId ?? ""} ${a.permission}`}
        searchPlaceholder="Title, resource or requester"
        emptyMessage={pending ? "Nothing is waiting for approval." : "No decisions yet."}
      />
      {deciding && <DecisionModal approval={deciding.approval} decision={deciding.decision} onClose={() => setDeciding(null)} />}
    </>
  );
}
