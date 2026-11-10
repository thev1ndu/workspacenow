import { ScaleTypes, StackedBarChart, isEmptySeries, type ChartTabularData, type StackedBarChartOptions } from "@workspacenow/charts";
import { useEntryPointBreakdown } from "@workspacenow/api-client";
import { ChartSkeleton, NoDataFound, QueryState, SectionCard } from "@workspacenow/views";

const OPTIONS: StackedBarChartOptions = {
  resizable: true,
  accessibility: { svgAriaLabel: "Audited actions by entry point and outcome" },
  axes: {
    bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS },
    left: { mapsTo: "value", stacked: true },
  },
};

/** Every audited action, stacked by outcome, for each interface it came through. */
export function EntryPointOutcomesChart() {
  const breakdown = useEntryPointBreakdown();
  return (
    <SectionCard title="Outcomes by entry point" subtitle="Every audited action, by the interface it came through">
      <QueryState query={breakdown} skeleton={<ChartSkeleton />}>
        {(data) => {
          const points: ChartTabularData = data.items.flatMap((item) => [
            { group: "Allowed", key: item.entryPoint, value: item.allowed },
            { group: "Denied", key: item.entryPoint, value: item.denied },
            { group: "Failed", key: item.entryPoint, value: item.failed },
          ]);
          if (isEmptySeries(points)) return <NoDataFound message="No audited actions yet." />;
          return <StackedBarChart data={points} options={OPTIONS} />;
        }}
      </QueryState>
    </SectionCard>
  );
}
