import { EvilBarChart, type ChartConfig } from "@workspacenow/charts";
import { useLogMetrics } from "@workspacenow/api-client";
import { QueryState, SectionCard, ChartSkeleton } from "@workspacenow/views";

const config = {
  info: { label: "Info", colors: { light: ["var(--accent)"], dark: ["var(--accent)"] } },
  warn: { label: "Warn", colors: { light: ["var(--warning)"], dark: ["var(--warning)"] } },
  error: { label: "Error", colors: { light: ["var(--danger)"], dark: ["var(--danger)"] } },
} satisfies ChartConfig;

const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Log volume per severity per day from the OTLP log store (wsn-observer), last 14 days. */
export function LogMetricsChart() {
  const logs = useLogMetrics({ days: 14 });
  return (
    <SectionCard title="Log volume" subtitle="OTLP logs ingested by wsn-observer, per severity per day">
      <QueryState query={logs} skeleton={<ChartSkeleton className="h-64" />}>
        {(data) => (
          <EvilBarChart
            config={config}
            data={data.items.map((p) => ({ date: p.date, info: p.levels.info ?? 0, warn: p.levels.warn ?? 0, error: p.levels.error ?? 0 }))}
            className="aspect-auto h-64 flex-none"
            stackType="stacked"
            barRadius={3}
          >
            <EvilBarChart.Grid vertical={false} />
            <EvilBarChart.XAxis dataKey="date" tickFormatter={dayLabel} />
            <EvilBarChart.YAxis width={36} />
            <EvilBarChart.Tooltip />
            <EvilBarChart.Legend align="left" variant="rounded-square" isClickable />
            <EvilBarChart.Bar dataKey="info" />
            <EvilBarChart.Bar dataKey="warn" />
            <EvilBarChart.Bar dataKey="error" />
          </EvilBarChart>
        )}
      </QueryState>
    </SectionCard>
  );
}
