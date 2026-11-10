import { StackedAreaChart, ScaleTypes, isEmptySeries, type StackedAreaChartOptions } from "@workspacenow/charts";
import { useTokenUsage } from "@workspacenow/api-client";
import type { TokenUsagePoint } from "@workspacenow/types";
import { ChartSkeleton, NoDataFound, QueryState, SectionCard } from "@workspacenow/views";

const options: StackedAreaChartOptions = {
  axes: {
    bottom: { mapsTo: "date", scaleType: ScaleTypes.TIME },
    left: { mapsTo: "value", stacked: true },
  },
  curve: "curveMonotoneX",
};

/** Long-format series for Carbon charts: one row per model and day. Model keys are the row fields other than the date. */
const toSeries = (items: TokenUsagePoint[]) =>
  items.flatMap((row) =>
    Object.entries(row)
      .filter(([key]) => key !== "date")
      .map(([group, value]) => ({ group, date: row.date, value: Number(value) })),
  );

/** Tokens consumed per day, stacked by model. Series keys are model ids with non-alphanumerics replaced by "_". */
export function TokenUsageChart() {
  const usage = useTokenUsage({ days: 14 });
  return (
    <SectionCard title="Token usage" subtitle="Tokens per day by model, last 14 days">
      <QueryState query={usage} skeleton={<ChartSkeleton />}>
        {(data) => {
          const series = toSeries(data.items);
          if (isEmptySeries(series)) return <NoDataFound message="No model usage yet." />;
          return <StackedAreaChart title="Token usage" data={series} options={options} />;
        }}
      </QueryState>
    </SectionCard>
  );
}
