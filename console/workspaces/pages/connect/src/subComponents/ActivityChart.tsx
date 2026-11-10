import { LineChart, ScaleTypes, isEmptySeries, type LineChartOptions } from "@workspacenow/charts";
import { useActivity } from "@workspacenow/api-client";
import type { ActivityPoint } from "@workspacenow/types";
import { ChartSkeleton, NoDataFound, QueryState, SectionCard } from "@workspacenow/views";

const options: LineChartOptions = {
  axes: {
    bottom: { mapsTo: "date", scaleType: ScaleTypes.TIME },
    left: { mapsTo: "value" },
  },
  curve: "curveMonotoneX",
};

/** Long-format series for Carbon charts: one row per group and day. */
const toSeries = (items: ActivityPoint[]) =>
  items.flatMap((point) => [
    { group: "API and app calls", date: point.date, value: point.apiCalls },
    { group: "MCP tool calls", date: point.date, value: point.agentToolCalls },
  ]);

/** Calls reaching business operations through REST and MCP, per day. */
export function ActivityChart() {
  const activity = useActivity({ days: 14 });
  return (
    <SectionCard title="Traffic" subtitle="Calls through APIs and MCP tools per day, last 14 days">
      <QueryState query={activity} skeleton={<ChartSkeleton />}>
        {(data) => {
          const series = toSeries(data.items);
          if (isEmptySeries(series)) return <NoDataFound message="No traffic yet." />;
          return <LineChart title="Traffic" data={series} options={options} />;
        }}
      </QueryState>
    </SectionCard>
  );
}
