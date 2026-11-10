import { ScaleTypes, StackedBarChart, isEmptySeries, type StackedBarChartOptions } from "@workspacenow/charts";
import { useLogMetrics } from "@workspacenow/api-client";
import { ChartSkeleton, NoDataFound, QueryState, SectionCard } from "@workspacenow/views";

const options: StackedBarChartOptions = {
  axes: {
    bottom: { mapsTo: "date", scaleType: ScaleTypes.TIME },
    left: { mapsTo: "value", stacked: true },
  },
};

/** Log volume per severity per day from the OTLP log store (wsn-observer), last 14 days. */
export function LogMetricsChart() {
  const logs = useLogMetrics({ days: 14 });
  return (
    <SectionCard title="Log volume" subtitle="OTLP logs ingested by wsn-observer, per severity per day">
      <QueryState query={logs} skeleton={<ChartSkeleton />}>
        {(data) => {
          const series = data.items.flatMap((p) => [
            { group: "Info", date: p.date, value: p.levels.info ?? 0 },
            { group: "Warn", date: p.date, value: p.levels.warn ?? 0 },
            { group: "Error", date: p.date, value: p.levels.error ?? 0 },
          ]);
          if (isEmptySeries(series)) return <NoDataFound message="No logs ingested in the last 14 days." />;
          return <StackedBarChart data={series} options={options} title="Log volume" />;
        }}
      </QueryState>
    </SectionCard>
  );
}
