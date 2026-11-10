import { useListWorkflows } from "@workspacenow/api-client";
import { buildPath, routes, type WorkflowExecution } from "@workspacenow/types";
import { StatusChip, TextLink, formatRelative } from "@workspacenow/views";
import { formatDuration, workflowName } from "../utils";
import { PagedTable, type PagedTableColumn } from "./PagedTable";

import styles from "../Flow.module.scss";

export interface ExecutionsTableProps {
  executions: WorkflowExecution[];
  hideWorkflow?: boolean;
  /** Search toolbar; default true. */
  searchable?: boolean;
  /** Pager; default true. Turn off for a short, fixed excerpt. */
  paginate?: boolean;
}

export function ExecutionsTable({ executions, hideWorkflow, searchable = true, paginate = true }: ExecutionsTableProps) {
  const { data: workflows } = useListWorkflows();
  const name = (e: WorkflowExecution) => workflowName(workflows?.items, e.workflowId);

  const columns: PagedTableColumn<WorkflowExecution>[] = [
    {
      key: "execution",
      header: "Execution",
      nowrap: true,
      render: (e) => (
        <span className={styles.mono}>
          <TextLink to={buildPath(routes.flow.execution, { executionId: e.id })}>{e.id}</TextLink>
        </span>
      ),
    },
    ...(hideWorkflow
      ? []
      : [
          {
            key: "workflow",
            header: "Workflow",
            render: (e: WorkflowExecution) => <TextLink to={buildPath(routes.flow.workflow, { workflowId: e.workflowId })}>{name(e)}</TextLink>,
          },
        ]),
    { key: "status", header: "Status", render: (e) => <StatusChip status={e.status} /> },
    {
      key: "trace",
      header: "Trace",
      nowrap: true,
      render: (e) => (
        <span className={styles.mono}>
          <TextLink to={buildPath(routes.control.trace, { traceId: e.traceId })}>{e.traceId}</TextLink>
        </span>
      ),
    },
    { key: "started", header: "Started", nowrap: true, render: (e) => formatRelative(e.startedAt) },
    {
      key: "duration",
      header: "Duration",
      nowrap: true,
      render: (e) => (e.status === "waiting" || e.status === "running" ? "In progress" : formatDuration(e.startedAt, e.endedAt)),
    },
  ];

  return (
    <PagedTable
      label="Workflow executions"
      items={executions}
      columns={columns}
      searchText={(e) => `${e.id} ${name(e)} ${e.status} ${e.traceId}`}
      searchPlaceholder="Search executions"
      emptyMessage="No executions yet."
      searchable={searchable}
      paginate={paginate}
    />
  );
}
