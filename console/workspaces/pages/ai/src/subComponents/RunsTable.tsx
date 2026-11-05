import { Table } from "@heroui/react";
import { buildPath, routes, type Agent, type AgentRun } from "@workspacenow/types";
import { NoDataFound, StatusChip, TextLink, formatNumber, formatRelative } from "@workspacenow/views";

export function RunsTable({ runs, agents, showAgent = true }: { runs: AgentRun[]; agents?: Agent[]; showAgent?: boolean }) {
  if (runs.length === 0) return <NoDataFound message="No runs yet." />;
  return (
    <Table variant="secondary">
      <Table.ScrollContainer>
        <Table.Content aria-label="Agent runs" className="min-w-[640px]">
          <Table.Header>
            <Table.Column isRowHeader>Run</Table.Column>
            {showAgent && <Table.Column>Agent</Table.Column>}
            <Table.Column>Prompt</Table.Column>
            <Table.Column>Trigger</Table.Column>
            <Table.Column>Status</Table.Column>
            <Table.Column className="text-right">Tool calls</Table.Column>
            <Table.Column className="text-right">Denied</Table.Column>
            <Table.Column className="text-right">Tokens</Table.Column>
            <Table.Column>When</Table.Column>
          </Table.Header>
          <Table.Body>
            {runs.map((run) => {
              const calls = run.steps.filter((s) => s.kind === "tool");
              const denied = calls.filter((s) => s.kind === "tool" && s.call.outcome === "denied").length;
              return (
                <Table.Row key={run.id} id={run.id}>
                  <Table.Cell className="font-mono text-xs">
                    <TextLink to={buildPath(routes.ai.run, { runId: run.id })}>{run.id}</TextLink>
                  </Table.Cell>
                  {showAgent && <Table.Cell className="whitespace-nowrap">{agents?.find((a) => a.id === run.agentId)?.name ?? run.agentId}</Table.Cell>}
                  {/* The prompt takes whatever width is left and truncates, so it never widens the table. */}
                  <Table.Cell className="w-full min-w-40">
                    <p className="w-0 min-w-full truncate" title={run.prompt}>
                      {run.prompt}
                    </p>
                  </Table.Cell>
                  <Table.Cell>{run.trigger === "workflow" ? "Workflow" : "Manual"}</Table.Cell>
                  <Table.Cell>
                    <StatusChip status={run.status} />
                  </Table.Cell>
                  <Table.Cell className="text-right tabular-nums">{calls.length}</Table.Cell>
                  <Table.Cell className={`text-right tabular-nums ${denied ? "font-semibold text-danger" : ""}`}>{denied}</Table.Cell>
                  <Table.Cell className="text-right tabular-nums">{formatNumber(run.tokens)}</Table.Cell>
                  <Table.Cell className="whitespace-nowrap text-muted">{formatRelative(run.startedAt)}</Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
