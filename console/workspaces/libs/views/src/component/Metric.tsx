import { createContext, useContext, type ReactNode } from "react";
import { Card } from "@heroui/react";
import { Link } from "react-router-dom";

const InGrid = createContext(false);

const COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
};

/**
 * Headline numbers as one strip: a single card divided by hairlines. Each cell draws its right and
 * bottom border and the card clips the outer ones, so an incomplete last row needs no filler.
 */
export function MetricGrid({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className={`-mr-px -mb-px grid ${COLUMNS[columns] ?? COLUMNS[4]}`}>
        <InGrid.Provider value>{children}</InGrid.Provider>
      </div>
    </Card>
  );
}

/**
 * A single headline number with its label; flat inside a MetricGrid, a small card on its own. With
 * `href` the whole tile opens it: an app route, or "#id" to jump to a section on the same page.
 */
export function Metric({ label, value, icon, hint, href }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; href?: string }) {
  const inGrid = useContext(InGrid);
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-xs text-muted [&_svg]:size-3.5 [&_svg]:shrink-0">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </>
  );
  if (href) {
    const tile = `block min-w-0 rounded-none px-4 py-3.5 no-underline transition-colors hover:bg-surface-secondary ${inGrid ? "border-r border-b border-separator" : ""}`;
    // The router does not scroll to in-page sections, so a "#id" target stays a plain anchor.
    const link = href.startsWith("#") ? (
      <a href={href} className={tile}>
        {body}
      </a>
    ) : (
      <Link to={href} className={tile}>
        {body}
      </Link>
    );
    return inGrid ? link : <Card className="gap-0 overflow-hidden p-0">{link}</Card>;
  }
  if (inGrid) return <div className="min-w-0 border-r border-b border-separator px-4 py-3.5">{body}</div>;
  return <Card className="gap-0 px-4 py-3.5">{body}</Card>;
}
