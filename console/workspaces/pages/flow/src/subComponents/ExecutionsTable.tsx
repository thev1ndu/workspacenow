import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";
import { useListWorkflows } from "@workspacenow/api-client";
import { buildPath, routes, type WorkflowExecution } from "@workspacenow/types";
import { NoDataFound, StatusChip, TextLink, formatRelative } from "@workspacenow/views";
import { formatDuration, workflowName } from "../utils";

export function ExecutionsTable({ executions, hideWorkflow }: { executions: WorkflowExecution[]; hideWorkflow?: boolean }) {
  const { data: workflows } = useListWorkflows();
  if (executions.length === 0) return <NoDataFound message="No executions yet." />;
  return (
    <TableContainer aria-label="Workflow executions">
      <Table className="min-w-[640px]">
        <TableHead>
          <TableRow>
            <TableHeader>Execution</TableHeader>
            {!hideWorkflow && <TableHeader>Workflow</TableHeader>}
            <TableHeader>Status</TableHeader>
            <TableHeader>Trace</TableHeader>
            <TableHeader>Started</TableHeader>
            <TableHeader>Duration</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {executions.map((execution) => (
            <TableRow key={execution.id} id={execution.id}>
              <TableCell>
                <span className="font-mono text-[13px]">
                  <TextLink to={buildPath(routes.flow.execution, { executionId: execution.id })}>{execution.id}</TextLink>
                </span>
              </TableCell>
              {!hideWorkflow && (
                <TableCell>
                  <TextLink to={buildPath(routes.flow.workflow, { workflowId: execution.workflowId })}>
                    {workflowName(workflows?.items, execution.workflowId)}
                  </TextLink>
                </TableCell>
              )}
              <TableCell>
                <StatusChip status={execution.status} />
              </TableCell>
              <TableCell>
                <span className="font-mono text-[13px]">
                  <TextLink to={buildPath(routes.control.trace, { traceId: execution.traceId })}>{execution.traceId}</TextLink>
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted">{formatRelative(execution.startedAt)}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">
                {execution.status === "waiting" || execution.status === "running"
                  ? "In progress"
                  : formatDuration(execution.startedAt, execution.endedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
