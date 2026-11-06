import { EvilAreaChart, type ChartConfig } from "@workspacenow/charts";
import { useTokenUsage } from "@workspacenow/api-client";
import { NoDataFound, QueryState, SectionCard, ChartSkeleton } from "@workspacenow/views";

const PALETTE = ["var(--accent)", "var(--success)", "var(--warning)", "var(--danger)", "var(--muted)"];

const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Tokens consumed per day, stacked by model. Series keys are model ids with non-alphanumerics replaced by "_". */
export function TokenUsageChart() {
  const usage = useTokenUsage({ days: 14 });
  return (
    <SectionCard title="Token usage" subtitle="Tokens per day by model, last 14 days">
      <QueryState query={usage} skeleton={<ChartSkeleton />}>
        {(data) => {
          const keys = Object.keys(data.items[0] ?? {}).filter((k) => k !== "date");
          if (keys.length === 0) return <NoDataFound message="No model usage yet." />;
          const config: ChartConfig = Object.fromEntries(
            keys.map((key, i) => [key, { label: key, colors: { light: [PALETTE[i % PALETTE.length]], dark: [PALETTE[i % PALETTE.length]] } }]),
          );
          return (
            <EvilAreaChart config={config} data={data.items} className="aspect-auto h-56 flex-none" curveType="monotone" stackType="stacked">
              <EvilAreaChart.Grid />
              <EvilAreaChart.XAxis dataKey="date" tickFormatter={dayLabel} />
              <EvilAreaChart.YAxis width={44} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <EvilAreaChart.Tooltip />
              <EvilAreaChart.Legend align="left" isClickable />
              {keys.map((key) => (
                <EvilAreaChart.Area key={key} dataKey={key} variant="gradient" strokeVariant="solid" />
              ))}
            </EvilAreaChart>
          );
        }}
      </QueryState>
    </SectionCard>
  );
}
