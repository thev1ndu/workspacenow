import { EvilBarChart, type ChartConfig } from "@workspacenow/charts";
import { useActivity } from "@workspacenow/api-client";
import { QueryState, SectionCard } from "@workspacenow/views";

const config = {
  apiCalls: { label: "API and app calls", colors: { light: ["var(--accent)"], dark: ["var(--accent)"] } },
  agentToolCalls: { label: "MCP tool calls", colors: { light: ["var(--success)"], dark: ["var(--success)"] } },
} satisfies ChartConfig;

const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Calls reaching business operations through REST and MCP, per day. */
export function ActivityChart() {
  const activity = useActivity({ days: 14 });
  return (
    <SectionCard title="Traffic" subtitle="Calls through APIs and MCP tools per day, last 14 days">
      <QueryState query={activity}>
        {(data) => (
          <EvilBarChart config={config} data={data.items} className="aspect-auto h-56 flex-none" barRadius={3}>
            <EvilBarChart.Grid vertical={false} />
            <EvilBarChart.XAxis dataKey="date" tickFormatter={dayLabel} />
            <EvilBarChart.YAxis width={36} />
            <EvilBarChart.Tooltip />
            <EvilBarChart.Legend align="left" isClickable />
            <EvilBarChart.Bar dataKey="apiCalls" />
            <EvilBarChart.Bar dataKey="agentToolCalls" />
          </EvilBarChart>
        )}
      </QueryState>
    </SectionCard>
  );
}
