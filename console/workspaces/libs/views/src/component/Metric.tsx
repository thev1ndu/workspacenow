import { Card } from "@heroui/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
};

/** Grid class for a KPI row of `columns` cards. */
export function metricGridColumns(columns: number): string {
  return `grid gap-4 ${COLUMNS[columns] ?? COLUMNS[4]}`;
}

/**
 * Headline numbers as a responsive grid of individual KPI cards (not one divided strip).
 */
export function MetricGrid({ columns, children }: { columns: number; children: ReactNode }) {
  return <div className={metricGridColumns(columns)}>{children}</div>;
}

/**
 * One KPI card: icon + label on top, big value below, optional hint. With `href` the whole card
 * opens it: an app route, or "#id" to jump to a section on the same page.
 */
export function Metric({ label, value, icon, hint, href }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-xs text-muted [&_svg]:size-3.5 [&_svg]:shrink-0">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </>
  );
  if (href) {
    // The router does not scroll to in-page sections, so a "#id" target stays a plain anchor.
    const link = href.startsWith("#") ? (
      <a href={href} className="block min-w-0 px-4 py-3.5 no-underline">
        {body}
      </a>
    ) : (
      <Link to={href} className="block min-w-0 px-4 py-3.5 no-underline">
        {body}
      </Link>
    );
    return <Card className="gap-0 overflow-hidden p-0 transition-colors hover:bg-surface-secondary">{link}</Card>;
  }
  return <Card className="gap-0 px-4 py-3.5">{body}</Card>;
}
