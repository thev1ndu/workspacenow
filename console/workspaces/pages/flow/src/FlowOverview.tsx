import { Alert } from "@heroui/react";
import { BranchesRight, CircleCheck, CircleExclamation, Hourglass, Play } from "@workspacenow/icons";
import { EvilAreaChart, type ChartConfig } from "@workspacenow/charts";
import { useActivity, useListApprovals, useListExecutions, useListWorkflows } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { LinkButton, Metric, MetricGrid, PageLayout, QueryState, SectionCard, ChartSkeleton } from "@workspacenow/views";
import { ExecutionsTable } from "./subComponents/ExecutionsTable";

const activityConfig = {
  workflowSteps: { label: "Workflow steps", colors: { light: ["var(--accent)"], dark: ["var(--accent)"] } },
  denied: { label: "Denied actions", colors: { light: ["var(--danger)"], dark: ["var(--danger)"] } },
} satisfies ChartConfig;

const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function FlowOverview() {
  const workflows = useListWorkflows();
  const executions = useListExecutions();
  const approvals = useListApprovals({ status: "pending" });
  const activity = useActivity({ days: 14 });

  const items = executions.data?.items ?? [];
  const count = (status: string) => items.filter((e) => e.status === status).length;

  return (
    <PageLayout title="Flow" description="Durable workflows that connect entities, APIs, agents and people.">
      <div className="grid gap-6">
        <MetricGrid columns={5}>
          <Metric
            label="Active workflows"
            value={workflows.data?.items.filter((w) => w.status === "active").length ?? "—"}
            icon={<BranchesRight />}
          />
          <Metric label="Running" value={count("running")} icon={<Play />} />
          <Metric label="Waiting" value={count("waiting")} icon={<Hourglass />} />
          <Metric label="Failed" value={count("failed")} icon={<CircleExclamation />} />
          <Metric label="Pending approvals" value={approvals.data?.total ?? "—"} icon={<CircleCheck />} />
        </MetricGrid>

        <Alert>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              Workflow execution is deterministic and durable: state survives restarts, and each step runs under the workflow's own service
              identity. AI helps design workflows and can be a step, but it never decides the control flow.
            </Alert.Description>
          </Alert.Content>
        </Alert>

        <SectionCard title="Workflow activity" subtitle="Steps executed and actions denied per day, last 14 days">
          <QueryState query={activity} skeleton={<ChartSkeleton />}>
            {(data) => (
              <EvilAreaChart config={activityConfig} data={data.items} className="aspect-auto h-56 flex-none" curveType="monotone">
                <EvilAreaChart.Grid />
                <EvilAreaChart.XAxis dataKey="date" tickFormatter={dayLabel} />
                <EvilAreaChart.YAxis width={36} />
                <EvilAreaChart.Tooltip />
                <EvilAreaChart.Legend align="left" isClickable />
                <EvilAreaChart.Area dataKey="workflowSteps" variant="gradient" strokeVariant="solid" />
                <EvilAreaChart.Area dataKey="denied" variant="gradient" strokeVariant="solid" />
              </EvilAreaChart>
            )}
          </QueryState>
        </SectionCard>

        <SectionCard
          title="Recent executions"
          actions={
            <LinkButton size="sm" variant="ghost" href={routes.flow.executions}>
              All executions
            </LinkButton>
          }
          flush
        >
          <QueryState query={executions}>{(data) => <ExecutionsTable executions={data.items.slice(0, 8)} />}</QueryState>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
