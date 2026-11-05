import { EvilBarChart, type ChartConfig } from "@workspacenow/charts";
import { useActivity } from "@workspacenow/api-client";
import { QueryState, SectionCard } from "@workspacenow/views";

const config = {
  apiCalls: { label: "API and app calls", colors: { light: ["var(--accent)"], dark: ["var(--accent)"] } },
  agentToolCalls: { label: "Agent tool calls", colors: { light: ["var(--success)"], dark: ["var(--success)"] } },
  workflowSteps: { label: "Workflow steps", colors: { light: ["var(--warning)"], dark: ["var(--warning)"] } },
} satisfies ChartConfig;

const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Governed operations per day, split by the entry point family that made them. */
export function ActivityChart() {
  const activity = useActivity({ days: 14 });
  return (
    <SectionCard title="Platform activity" subtitle="Governed operations per day, last 14 days">
      <QueryState query={activity}>
        {(data) => (
          <EvilBarChart config={config} data={data.items} className="aspect-auto h-64 flex-none" stackType="stacked" barRadius={3}>
            <EvilBarChart.Grid vertical={false} />
            <EvilBarChart.XAxis dataKey="date" tickFormatter={dayLabel} />
            <EvilBarChart.YAxis width={36} />
            <EvilBarChart.Tooltip />
            <EvilBarChart.Legend align="left" variant="rounded-square" isClickable />
            <EvilBarChart.Bar dataKey="apiCalls" />
            <EvilBarChart.Bar dataKey="agentToolCalls" />
            <EvilBarChart.Bar dataKey="workflowSteps" />
          </EvilBarChart>
        )}
      </QueryState>
    </SectionCard>
  );
}
