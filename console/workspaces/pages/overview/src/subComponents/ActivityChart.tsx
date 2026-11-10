import { ScaleTypes, StackedBarChart, isEmptySeries, type StackedBarChartOptions } from "@workspacenow/charts";
import { useActivity } from "@workspacenow/api-client";
import { ChartSkeleton, NoDataFound, QueryState, SectionCard } from "@workspacenow/views";

const options: StackedBarChartOptions = {
  axes: {
    bottom: { mapsTo: "date", scaleType: ScaleTypes.TIME },
    left: { mapsTo: "value", stacked: true },
  },
};

/** Governed operations per day, split by the entry point family that made them. */
export function ActivityChart() {
  const activity = useActivity({ days: 14 });
  return (
    <SectionCard title="Platform activity" subtitle="Governed operations per day, last 14 days">
      <QueryState query={activity} skeleton={<ChartSkeleton />}>
        {(data) => {
          const series = data.items.flatMap((p) => [
            { group: "API and app calls", date: p.date, value: p.apiCalls },
            { group: "Agent tool calls", date: p.date, value: p.agentToolCalls },
            { group: "Workflow steps", date: p.date, value: p.workflowSteps },
          ]);
          if (isEmptySeries(series)) return <NoDataFound message="No governed operations in the last 14 days." />;
          return <StackedBarChart data={series} options={options} title="Platform activity" />;
        }}
      </QueryState>
    </SectionCard>
  );
}
