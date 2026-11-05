export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatRelative(iso?: string): string {
  if (!iso) return "—";
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 365) return `${days} d ago`;
  return formatDateTime(iso);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function formatCurrency(value: unknown): string {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `LKR ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(num)}`;
}

export function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s\-_.]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** "Nov 3, 3:30 PM": for dense tables of recent activity, where the year is noise. */
export function formatShortDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
