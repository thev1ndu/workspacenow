import type { ReactNode } from "react";

export interface DetailItem {
  label: string;
  value: ReactNode;
  /** Spans every column, for long values or chip lists. */
  fullWidth?: boolean;
}

// Columns grow to their content and share any shortfall, so a long URL is not squeezed to the width of a count.
const COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-[repeat(2,minmax(0,max-content))]",
  3: "sm:grid-cols-[repeat(3,minmax(0,max-content))]",
  4: "sm:grid-cols-[repeat(4,minmax(0,max-content))]",
};

/** Read-only label/value pairs, as on a resource's overview. */
export function DetailList({ items, columns = 1 }: { items: DetailItem[]; columns?: number }) {
  return (
    <dl className={`grid grid-cols-1 gap-x-12 gap-y-4 ${COLUMNS[columns] ?? COLUMNS[2]}`}>
      {items.map((item) => (
        <div key={item.label} className={`min-w-0 ${item.fullWidth ? "col-span-full" : ""}`}>
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className="mt-1 text-sm break-words text-foreground">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
