import { Alert, Table } from "@heroui/react";
import { CircleDollar, Cpu, FaceRobot, ShieldExclamation } from "@workspacenow/icons";
import { useListAgentRuns, useListAgents, useListModelProviders } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { LinkButton, Metric, MetricGrid, PageLayout, QueryState, SectionCard, StatusChip, formatNumber } from "@workspacenow/views";
import { RunsTable } from "./subComponents/RunsTable";
import { TokenUsageChart } from "./subComponents/TokenUsageChart";

export function AiOverview() {
  const agents = useListAgents();
  const runs = useListAgentRuns();
  const providers = useListModelProviders();

  const tokens = providers.data?.items.reduce((sum, p) => sum + p.tokensThisMonth, 0) ?? 0;
  const cost = providers.data?.items.reduce((sum, p) => sum + p.costThisMonthUsd, 0) ?? 0;
  const deniedCalls = runs.data?.items.flatMap((r) => r.steps).filter((s) => s.kind === "tool" && s.call.outcome === "denied").length ?? 0;

  return (
    <PageLayout title="AI" description="Agents, models and governed agent execution.">
      <div className="grid gap-6">
        <Alert>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              AI proposes; the platform's authorization decides. Agents act through MCP tools with their own service identity, and every call
              runs the same governed business operation as the UI and APIs.
            </Alert.Description>
          </Alert.Content>
        </Alert>

        <MetricGrid columns={4}>
          <Metric label="Business agents" value={agents.data?.items.filter((a) => a.kind === "business").length ?? "—"} icon={<FaceRobot />} />
          <Metric label="Tokens this month" value={formatNumber(tokens)} icon={<Cpu />} />
          <Metric label="Model cost this month" value={`$${cost.toFixed(2)}`} icon={<CircleDollar />} />
          <Metric label="Denied tool calls" value={deniedCalls} icon={<ShieldExclamation />} />
        </MetricGrid>

        <TokenUsageChart />

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
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Model usage">
                      <Table.Header>
                        <Table.Column isRowHeader>Provider</Table.Column>
                        <Table.Column className="text-right">Tokens</Table.Column>
                        <Table.Column>Status</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((p) => (
                          <Table.Row key={p.id} id={p.id}>
                            <Table.Cell>{p.name}</Table.Cell>
                            <Table.Cell className="text-right tabular-nums">{formatNumber(p.tokensThisMonth)}</Table.Cell>
                            <Table.Cell>
                              <StatusChip status={p.status} />
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )}
            </QueryState>
          </SectionCard>
        </div>
      </div>
    </PageLayout>
  );
}
