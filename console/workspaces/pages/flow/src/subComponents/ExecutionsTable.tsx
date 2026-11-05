import { Table } from "@heroui/react";
import { useListWorkflows } from "@workspacenow/api-client";
import { buildPath, routes, type WorkflowExecution } from "@workspacenow/types";
import { NoDataFound, StatusChip, TextLink, formatRelative } from "@workspacenow/views";
import { formatDuration, workflowName } from "../utils";

export function ExecutionsTable({ executions, hideWorkflow }: { executions: WorkflowExecution[]; hideWorkflow?: boolean }) {
  const { data: workflows } = useListWorkflows();
  if (executions.length === 0) return <NoDataFound message="No executions yet." />;
  return (
    <Table variant="secondary">
      <Table.ScrollContainer>
        <Table.Content aria-label="Workflow executions" className="min-w-[640px]">
          <Table.Header>
            <Table.Column isRowHeader>Execution</Table.Column>
            {!hideWorkflow && <Table.Column>Workflow</Table.Column>}
            <Table.Column>Status</Table.Column>
            <Table.Column>Trace</Table.Column>
            <Table.Column>Started</Table.Column>
            <Table.Column>Duration</Table.Column>
          </Table.Header>
          <Table.Body>
            {executions.map((execution) => (
              <Table.Row key={execution.id} id={execution.id}>
                <Table.Cell>
                  <span className="font-mono text-[13px]">
                    <TextLink to={buildPath(routes.flow.execution, { executionId: execution.id })}>{execution.id}</TextLink>
                  </span>
                </Table.Cell>
                {!hideWorkflow && (
                  <Table.Cell>
                    <TextLink to={buildPath(routes.flow.workflow, { workflowId: execution.workflowId })}>
                      {workflowName(workflows?.items, execution.workflowId)}
                    </TextLink>
                  </Table.Cell>
                )}
                <Table.Cell>
                  <StatusChip status={execution.status} />
                </Table.Cell>
                <Table.Cell>
                  <span className="font-mono text-[13px]">
                    <TextLink to={buildPath(routes.control.trace, { traceId: execution.traceId })}>{execution.traceId}</TextLink>
                  </span>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap text-muted">{formatRelative(execution.startedAt)}</Table.Cell>
                <Table.Cell className="whitespace-nowrap tabular-nums">
                  {execution.status === "waiting" || execution.status === "running"
                    ? "In progress"
                    : formatDuration(execution.startedAt, execution.endedAt)}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
