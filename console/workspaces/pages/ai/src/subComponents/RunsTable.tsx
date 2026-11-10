import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";
import { buildPath, routes, type Agent, type AgentRun } from "@workspacenow/types";
import { NoDataFound, StatusChip, TextLink, formatNumber, formatRelative } from "@workspacenow/views";

export function RunsTable({ runs, agents, showAgent = true }: { runs: AgentRun[]; agents?: Agent[]; showAgent?: boolean }) {
  if (runs.length === 0) return <NoDataFound message="No runs yet." />;
  return (
    <TableContainer aria-label="Agent runs">
      <Table className="min-w-[640px]">
        <TableHead>
          <TableRow>
            <TableHeader>Run</TableHeader>
            {showAgent && <TableHeader>Agent</TableHeader>}
            <TableHeader>Prompt</TableHeader>
            <TableHeader>Trigger</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader className="text-right">Tool calls</TableHeader>
            <TableHeader className="text-right">Denied</TableHeader>
            <TableHeader className="text-right">Tokens</TableHeader>
            <TableHeader>When</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.map((run) => {
            const calls = run.steps.filter((s) => s.kind === "tool");
            const denied = calls.filter((s) => s.kind === "tool" && s.call.outcome === "denied").length;
            return (
              <TableRow key={run.id} id={run.id}>
                <TableCell className="whitespace-nowrap font-mono text-xs">
                  <TextLink to={buildPath(routes.ai.run, { runId: run.id })}>{run.id}</TextLink>
                </TableCell>
                {showAgent && <TableCell className="whitespace-nowrap">{agents?.find((a) => a.id === run.agentId)?.name ?? run.agentId}</TableCell>}
                {/* The prompt takes whatever width is left and truncates, so it never widens the table. */}
                <TableCell className="w-full min-w-40">
                  <p className="w-0 min-w-full truncate" title={run.prompt}>
                    {run.prompt}
                  </p>
                </TableCell>
                <TableCell>{run.trigger === "workflow" ? "Workflow" : "Manual"}</TableCell>
                <TableCell>
                  <StatusChip status={run.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{calls.length}</TableCell>
                <TableCell className={`text-right tabular-nums ${denied ? "font-semibold text-danger" : ""}`}>{denied}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(run.tokens)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted">{formatRelative(run.startedAt)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
