import { CurrencyDollar, Chip, Bot, Play, Activity, WarningAlt } from "@carbon/react/icons";
import { InlineNotification, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";

import { useListAgentRuns, useListAgents, useListModelProviders } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { LinkButton, Metric, MetricGrid, PageLayout, QueryState, SectionCard, StatusChip, formatNumber } from "@workspacenow/views";
import { RunsTable } from "./subComponents/RunsTable";
import { TokenUsageChart } from "./subComponents/TokenUsageChart";

export function AiOverview() {
  const agents = useListAgents();
  const runs = useListAgentRuns();
  const providers = useListModelProviders();

  const runItems = runs.data?.items ?? [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const runsToday = runItems.filter((r) => new Date(r.startedAt) >= startOfToday).length;
  const failedRuns = runItems.filter((r) => r.status === "failed").length;
  const tokens = providers.data?.items.reduce((sum, p) => sum + p.tokensThisMonth, 0) ?? 0;
  const cost = providers.data?.items.reduce((sum, p) => sum + p.costThisMonthUsd, 0) ?? 0;
  const deniedCalls = runItems.flatMap((r) => r.steps).filter((s) => s.kind === "tool" && s.call.outcome === "denied").length;

  return (
    <PageLayout title="AI" description="Agents, models and governed agent execution.">
      <div className="grid gap-6">
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          subtitle="AI proposes; the platform's authorization decides. Agents act through MCP tools with their own service identity, and every call runs the same governed business operation as the UI and APIs."
        />

        <MetricGrid columns={6}>
          <Metric label="Business agents" value={agents.data?.items.filter((a) => a.kind === "business").length ?? "—"} icon={<Bot />} href={routes.ai.agents} />
          <Metric label="Agent runs" value={runs.data?.total ?? "—"} hint={`${runsToday} today`} icon={<Play />} href={routes.ai.runs} />
          <Metric label="Tokens this month" value={formatNumber(tokens)} icon={<Chip />} href={routes.ai.models} />
          <Metric label="Model cost this month" value={`$${cost.toFixed(2)}`} icon={<CurrencyDollar />} href={routes.ai.models} />
          <Metric label="Denied tool calls" value={deniedCalls} hint="Review in the audit log" icon={<WarningAlt />} href={routes.control.audit} />
          <Metric label="Failed runs" value={failedRuns} icon={<Activity />} href={routes.ai.runs} />
        </MetricGrid>

        <div className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
          <SectionCard
            title="Recent agent runs"
            actions={
              <LinkButton size="sm" variant="ghost" href={routes.ai.runs}>
                All runs
              </LinkButton>
            }
            flush
          >
            <QueryState query={runs}>{(data) => <RunsTable runs={data.items.slice(0, 8)} agents={agents.data?.items} />}</QueryState>
          </SectionCard>

          <div className="grid gap-6">
            <TokenUsageChart />
            <SectionCard
              title="Model usage"
              actions={
                <LinkButton size="sm" variant="ghost" href={routes.ai.models}>
                  Models
                </LinkButton>
              }
              flush
            >
              <QueryState query={providers}>
                {(data) => (
                  <TableContainer aria-label="Model usage">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeader>Provider</TableHeader>
                          <TableHeader className="text-right">Tokens</TableHeader>
                          <TableHeader>Status</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.items.map((p) => (
                          <TableRow key={p.id} id={p.id}>
                            <TableCell>{p.name}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatNumber(p.tokensThisMonth)}</TableCell>
                            <TableCell>
                              <StatusChip status={p.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </QueryState>
            </SectionCard>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
