import { Flow, CheckmarkFilled, WarningFilled, Hourglass, Play } from "@carbon/react/icons";
import { InlineNotification, Stack } from "@carbon/react";

import { AreaChart, ScaleTypes, isEmptySeries, type AreaChartOptions } from "@workspacenow/charts";
import { useActivity, useListApprovals, useListExecutions, useListWorkflows } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { ChartSkeleton, LinkButton, Metric, MetricGrid, NoDataFound, PageLayout, QueryState, SectionCard } from "@workspacenow/views";
import { ExecutionsTable } from "./subComponents/ExecutionsTable";

const activityOptions: AreaChartOptions = {
  curve: "curveMonotoneX",
  axes: {
    bottom: { mapsTo: "date", scaleType: ScaleTypes.TIME },
    left: { mapsTo: "value" },
  },
};

export function FlowOverview() {
  const workflows = useListWorkflows();
  const executions = useListExecutions();
  const approvals = useListApprovals({ status: "pending" });
  const activity = useActivity({ days: 14 });

  const items = executions.data?.items ?? [];
  const count = (status: string) => items.filter((e) => e.status === status).length;

  return (
    <PageLayout title="Flow" description="Durable workflows that connect entities, APIs, agents and people.">
      <Stack gap={6}>
        <MetricGrid columns={5}>
          <Metric
            label="Active workflows"
            value={workflows.data?.items.filter((w) => w.status === "active").length ?? "-"}
            icon={<Flow />}
          />
          <Metric label="Running" value={count("running")} icon={<Play />} />
          <Metric label="Waiting" value={count("waiting")} icon={<Hourglass />} />
          <Metric label="Failed" value={count("failed")} icon={<WarningFilled />} />
          <Metric label="Pending approvals" value={approvals.data?.total ?? "-"} icon={<CheckmarkFilled />} />
        </MetricGrid>

        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          subtitle="Workflow execution is deterministic and durable: state survives restarts, and each step runs under the workflow's own service identity. AI helps design workflows and can be a step, but it never decides the control flow."
        />

        <SectionCard title="Workflow activity" subtitle="Steps executed and actions denied per day, last 14 days">
          <QueryState query={activity} skeleton={<ChartSkeleton />}>
            {(data) => {
              const series = data.items.flatMap((p) => [
                { group: "Workflow steps", date: p.date, value: p.workflowSteps },
                { group: "Denied actions", date: p.date, value: p.denied },
              ]);
              if (isEmptySeries(series)) return <NoDataFound message="No workflow activity in the last 14 days." />;
              return <AreaChart data={series} options={activityOptions} title="Workflow activity" />;
            }}
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
          <QueryState query={executions}>{(data) => <ExecutionsTable executions={data.items.slice(0, 8)} searchable={false} paginate={false} />}</QueryState>
        </SectionCard>
      </Stack>
    </PageLayout>
  );
}
