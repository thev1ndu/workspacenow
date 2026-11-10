import { Tag } from "@carbon/react";
import { buildPath, routes, type Agent, type AgentRun } from "@workspacenow/types";
import { StatusChip, TextLink, formatNumber, formatRelative } from "@workspacenow/views";
import { PagedTable, ResourceTable, type ResourceTableProps, type TableColumn } from "./ResourceTable";

import common from "../common.module.scss";

type RunsTableProps = {
  runs: AgentRun[];
  agents?: Agent[];
  showAgent?: boolean;
} & (
  | { /** Search and page over `runs` in the browser. */ paged: true; search?: never; toolbar?: never; pager?: never; isFiltered?: never; loading?: never }
  | ({ paged?: false } & Pick<ResourceTableProps<AgentRun>, "search" | "toolbar" | "pager" | "isFiltered" | "loading">)
);

const toolCalls = (run: AgentRun) => run.steps.filter((s) => s.kind === "tool");
const deniedCalls = (run: AgentRun) => toolCalls(run).filter((s) => s.kind === "tool" && s.call.outcome === "denied").length;

/** Agent runs as a Carbon DataTable; pass `paged` for client-side search and pagination, or search/pager props for server-side. */
export function RunsTable({ runs, agents, showAgent = true, paged, search, toolbar, pager, isFiltered, loading }: RunsTableProps) {
  const columns: TableColumn<AgentRun>[] = [
    {
      key: "run",
      header: "Run",
      nowrap: true,
      cell: (run) => (
        <span className={common.mono}>
          <TextLink to={buildPath(routes.ai.run, { runId: run.id })}>{run.id}</TextLink>
        </span>
      ),
    },
    ...(showAgent
      ? [{ key: "agent", header: "Agent", nowrap: true, cell: (run: AgentRun) => agents?.find((a) => a.id === run.agentId)?.name ?? run.agentId }]
      : []),
    {
      key: "prompt",
      header: "Prompt",
      cell: (run) => (
        <span className={common.truncate} title={run.prompt}>
          {run.prompt}
        </span>
      ),
    },
    { key: "trigger", header: "Trigger", cell: (run) => (run.trigger === "workflow" ? "Workflow" : "Manual") },
    { key: "status", header: "Status", cell: (run) => <StatusChip status={run.status} /> },
    { key: "calls", header: "Tool calls", end: true, cell: (run) => <span className={common.numeric}>{toolCalls(run).length}</span> },
    {
      key: "denied",
      header: "Denied",
      end: true,
      cell: (run) => {
        const denied = deniedCalls(run);
        return denied ? (
          <Tag size="sm" type="red">
            {denied}
          </Tag>
        ) : (
          <span className={common.numeric}>0</span>
        );
      },
    },
    { key: "tokens", header: "Tokens", end: true, cell: (run) => <span className={common.numeric}>{formatNumber(run.tokens)}</span> },
    { key: "when", header: "When", nowrap: true, cell: (run) => formatRelative(run.startedAt) },
  ];

  const base = { label: "Agent runs", rowKey: (run: AgentRun) => run.id, columns, emptyMessage: "No runs yet." };
  if (paged) {
    return (
      <PagedTable
        {...base}
        items={runs}
        searchPlaceholder="Search runs"
        searchText={(run) => `${run.id} ${run.prompt} ${run.status} ${run.trigger} ${agents?.find((a) => a.id === run.agentId)?.name ?? run.agentId}`}
      />
    );
  }
  return <ResourceTable {...base} items={runs} search={search} toolbar={toolbar} pager={pager} isFiltered={isFiltered} loading={loading} />;
}
