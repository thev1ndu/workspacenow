import { EvilBarChart, type ChartConfig } from "@workspacenow/charts";
import { useEntryPointBreakdown } from "@workspacenow/api-client";
import { QueryState, SectionCard } from "@workspacenow/views";

const outcomeConfig = {
  allowed: { label: "Allowed", colors: { light: ["var(--success)"], dark: ["var(--success)"] } },
  denied: { label: "Denied", colors: { light: ["var(--danger)"], dark: ["var(--danger)"] } },
  failed: { label: "Failed", colors: { light: ["var(--warning)"], dark: ["var(--warning)"] } },
} satisfies ChartConfig;

/** Every audited action, stacked by outcome, for each interface it came through. */
export function EntryPointOutcomesChart() {
  const breakdown = useEntryPointBreakdown();
  return (
    <SectionCard title="Outcomes by entry point" subtitle="Every audited action, by the interface it came through">
      <QueryState query={breakdown}>
        {(data) => (
          <EvilBarChart config={outcomeConfig} data={data.items} className="aspect-auto h-56 flex-none" stackType="stacked" barRadius={3}>
            <EvilBarChart.Grid vertical={false} />
            <EvilBarChart.XAxis dataKey="entryPoint" />
            <EvilBarChart.YAxis width={36} />
            <EvilBarChart.Tooltip />
            <EvilBarChart.Legend align="left" isClickable />
            <EvilBarChart.Bar dataKey="allowed" />
            <EvilBarChart.Bar dataKey="denied" />
            <EvilBarChart.Bar dataKey="failed" />
          </EvilBarChart>
        )}
      </QueryState>
    </SectionCard>
  );
}
