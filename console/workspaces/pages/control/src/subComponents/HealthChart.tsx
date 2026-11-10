import { Alignments, DonutChart, isEmptySeries, type ChartTabularData, type DonutChartOptions } from "@workspacenow/charts";
import { useListHealth } from "@workspacenow/api-client";
import { DonutSkeleton, NoDataFound, QueryState, SectionCard } from "@workspacenow/views";

const STATUSES = [
  { status: "healthy", group: "Healthy" },
  { status: "degraded", group: "Degraded" },
  { status: "down", group: "Down" },
] as const;

const OPTIONS: DonutChartOptions = {
  resizable: true,
  accessibility: { svgAriaLabel: "Resources by current health status" },
  donut: { alignment: Alignments.CENTER, center: { label: "Resources" } },
  legend: { alignment: Alignments.CENTER },
};

/** Resources by current health status, as a donut. */
export function HealthChart() {
  const health = useListHealth();
  return (
    <SectionCard title="Health" subtitle="Resources by current status">
      <QueryState query={health} skeleton={<DonutSkeleton />}>
        {(data) => {
          const slices: ChartTabularData = STATUSES.map(({ status, group }) => ({
            group,
            value: data.items.filter((s) => s.status === status).length,
          })).filter((slice) => slice.value > 0);
          if (isEmptySeries(slices)) return <NoDataFound message="No health signals yet." />;
          return <DonutChart data={slices} options={OPTIONS} />;
        }}
      </QueryState>
    </SectionCard>
  );
}
