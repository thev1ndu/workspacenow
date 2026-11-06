import type { ActivityPoint, EntryPointBreakdown, TokenUsagePoint } from "@workspacenow/types";
import type { Platform } from "./platform";

/**
 * The seeded installation only has two days of recorded activity, so trend charts combine a
 * deterministic baseline (stable across reloads) with what the audit log actually recorded.
 */
function noise(seed: string): number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function lastDays(days: number): Date[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return d;
  });
}

function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}

export function activitySeries(platform: Platform, days: number): ActivityPoint[] {
  return lastDays(days).map((d) => {
    const key = dayKey(d);
    const records = platform.state.audit.filter((a) => a.time.slice(0, 10) === key);
    const weekday = isWeekend(d) ? 0.45 : 1;
    return {
      date: key,
      apiCalls: Math.round((180 + noise(`api${key}`) * 140) * weekday) + records.filter((r) => r.entryPoint === "api" || r.entryPoint === "studio").length,
      agentToolCalls: Math.round((24 + noise(`mcp${key}`) * 30) * weekday) + records.filter((r) => r.entryPoint === "mcp").length,
      workflowSteps: Math.round((14 + noise(`wf${key}`) * 18) * weekday) + records.filter((r) => r.entryPoint === "workflow").length,
      denied: Math.round(noise(`deny${key}`) * 5 * weekday) + records.filter((r) => r.outcome === "denied").length,
    };
  });
}

export function tokenSeries(platform: Platform, days: number): TokenUsagePoint[] {
  const models = [...new Set(platform.state.agents.map((a) => a.model))];
  return lastDays(days).map((d) => {
    const key = dayKey(d);
    const point: TokenUsagePoint = { date: key };
    const weekday = isWeekend(d) ? 0.4 : 1;
    for (const model of models) {
      const live = platform.state.agentRuns
        .filter((r) => r.startedAt.slice(0, 10) === key && platform.state.agents.find((a) => a.id === r.agentId)?.model === model)
        .reduce((sum, r) => sum + r.tokens, 0);
      const base = model.includes("large") ? 9000 : model.includes("small") ? 6000 : 22000;
      point[model.replace(/[^a-z0-9]/gi, "_")] = Math.round(base * (0.6 + noise(`${model}${key}`) * 0.8) * weekday) + live;
    }
    return point;
  });
}

export function entryPointBreakdown(platform: Platform): EntryPointBreakdown[] {
  const byEntry = new Map<string, EntryPointBreakdown>();
  for (const record of platform.state.audit) {
    const row = byEntry.get(record.entryPoint) ?? { entryPoint: record.entryPoint, allowed: 0, denied: 0, failed: 0 };
    row[record.outcome] += 1;
    byEntry.set(record.entryPoint, row);
  }
  return [...byEntry.values()].sort((a, b) => b.allowed + b.denied - (a.allowed + a.denied));
}
