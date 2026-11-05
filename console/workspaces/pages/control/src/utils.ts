export function formatSpan(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 120) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 120) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

/** Offset from the start of a trace, e.g. "+1m 05s". */
export function formatOffset(start: string, at: string): string {
  const total = Math.max(0, Math.round((new Date(at).getTime() - new Date(start).getTime()) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `+${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `+${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `+${seconds}s`;
}
