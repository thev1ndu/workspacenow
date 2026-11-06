import type { ReactNode } from "react";
import { Card, Skeleton } from "@heroui/react";

// Placeholders shaped like the content they stand in for, so nothing jumps when data arrives.

const WIDTHS = [72, 48, 88, 60, 40, 80, 56];
const width = (i: number) => ({ width: `${WIDTHS[i % WIDTHS.length]}%` });
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Header and rows of a table, edge to edge like a flush SectionCard's table. */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  const grid = { gridTemplateColumns: `minmax(0,2fr) repeat(${columns - 1}, minmax(0,1fr))` };
  return (
    <div>
      <div className="grid gap-6 border-b border-separator px-5 py-3" style={grid}>
        {range(columns).map((c) => (
          <Skeleton key={c} className="h-3 w-16 max-w-full rounded-md" />
        ))}
      </div>
      {range(rows).map((r) => (
        <div key={r} className="grid items-center gap-6 border-b border-separator px-5 py-3.5 last:border-b-0" style={grid}>
          {range(columns).map((c) => (
            <Skeleton key={c} className="h-4 rounded-md" style={width(r + c)} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Rows with a leading icon, two lines of text and a trailing status chip. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul>
      {range(rows).map((r) => (
        <li key={r} className="flex items-center gap-3 border-b border-separator px-5 py-3 last:border-b-0">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Skeleton className="h-4 rounded-md" style={{ width: `${WIDTHS[r % 7] / 2 + 15}%` }} />
            <Skeleton className="h-3 rounded-md" style={{ width: `${WIDTHS[(r + 3) % 7] / 2 + 10}%` }} />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/** Tiles in a grid, each with an icon, a title and two lines of description. */
export function CardGridSkeleton({ count = 4, className = "sm:grid-cols-2 xl:grid-cols-4" }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {range(count).map((i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-separator p-4">
          <Skeleton className="mb-2 size-9 rounded-lg" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-4/5 rounded-md" />
          <div className="mt-2 flex items-center justify-between">
            <Skeleton className="h-3 w-1/3 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

const BARS = [38, 62, 45, 80, 55, 70, 42, 90, 65, 50, 74, 58, 84, 47];

/** Bars rising from a baseline, for bar, line and area charts. Pass the chart's height. */
export function ChartSkeleton({ className = "h-56" }: { className?: string }) {
  return (
    <div className={`flex items-end gap-2 border-b border-separator ${className}`}>
      {BARS.map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-md rounded-b-none" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/** A ring and its legend, for pie and donut charts. */
export function DonutSkeleton() {
  return (
    <div className="grid justify-items-center gap-5 py-2">
      <Skeleton className="size-36 rounded-full [mask:radial-gradient(circle,transparent_52%,#000_53%)]" />
      <div className="flex gap-4">
        {range(3).map((i) => (
          <Skeleton key={i} className="h-3 w-14 rounded-md" />
        ))}
      </div>
    </div>
  );
}

const DETAIL_COLUMNS: Record<number, string> = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 md:grid-cols-4" };

/** Label and value pairs, as a DetailList lays them out. */
export function DetailSkeleton({ items = 4, columns = 4 }: { items?: number; columns?: number }) {
  return (
    <div className={`grid grid-cols-1 gap-x-12 gap-y-4 ${DETAIL_COLUMNS[columns] ?? DETAIL_COLUMNS[4]}`}>
      {range(items).map((i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-4 rounded-md" style={width(i + 2)} />
        </div>
      ))}
    </div>
  );
}

/** A metric strip, as MetricGrid draws it. */
export function MetricGridSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className={`-mr-px -mb-px grid ${columns >= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
        {range(columns).map((i) => (
          <div key={i} className="grid gap-2.5 border-r border-b border-separator px-4 py-3.5">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-6 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** A SectionCard whose title is still loading. `flush` runs the body edge to edge, for tables and lists. */
export function SectionCardSkeleton({ children, flush }: { children: ReactNode; flush?: boolean }) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="grid gap-2 border-b border-separator px-5 py-4">
        <Skeleton className="h-4 w-36 rounded-md" />
        <Skeleton className="h-3 w-64 max-w-full rounded-md" />
      </div>
      <div className={flush ? "" : "p-5"}>{children}</div>
    </Card>
  );
}

/** A resource detail page: its summary card above a table. */
export function PageSkeleton() {
  return (
    <div className="grid gap-6">
      <SectionCardSkeleton>
        <DetailSkeleton />
      </SectionCardSkeleton>
      <SectionCardSkeleton flush>
        <TableSkeleton rows={4} />
      </SectionCardSkeleton>
    </div>
  );
}
