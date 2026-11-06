import { EvilPieChart, type ChartConfig } from "@workspacenow/charts";
import { useListHealth } from "@workspacenow/api-client";
import { QueryState, SectionCard, DonutSkeleton } from "@workspacenow/views";

const healthConfig = {
  healthy: { label: "Healthy", colors: { light: ["var(--success)"], dark: ["var(--success)"] } },
  degraded: { label: "Degraded", colors: { light: ["var(--warning)"], dark: ["var(--warning)"] } },
  down: { label: "Down", colors: { light: ["var(--danger)"], dark: ["var(--danger)"] } },
} satisfies ChartConfig;

/** Resources by current health status, as a donut. */
export function HealthChart() {
  const health = useListHealth();
  return (
    <SectionCard title="Health" subtitle="Resources by current status">
      <QueryState query={health} skeleton={<DonutSkeleton />}>
        {(data) => {
          const slices = (["healthy", "degraded", "down"] as const)
            .map((status) => ({ status, count: data.items.filter((s) => s.status === status).length }))
            .filter((slice) => slice.count > 0);
          return (
            <EvilPieChart config={healthConfig} data={slices} dataKey="count" nameKey="status" className="aspect-auto h-56 flex-none">
              <EvilPieChart.Pie innerRadius="55%" />
              <EvilPieChart.Tooltip />
              <EvilPieChart.Legend />
            </EvilPieChart>
          );
        }}
      </QueryState>
    </SectionCard>
  );
}
