import type { ReactNode } from "react";

import styles from "./DetailList.module.scss";

export interface DetailItem {
  label: string;
  value: ReactNode;
  /** Spans every column, for long values or chip lists. */
  fullWidth?: boolean;
}

const COLUMNS: Record<number, string> = { 1: "", 2: styles.cols2, 3: styles.cols3, 4: styles.cols4 };

/** Grid classes for `columns` columns, shared with DetailSkeleton. */
export function detailColumns(columns: number): string {
  return [styles.list, COLUMNS[columns] ?? COLUMNS[2]].filter(Boolean).join(" ");
}

/** Read-only label/value pairs, as on a resource's overview. */
export function DetailList({ items, columns = 1 }: { items: DetailItem[]; columns?: number }) {
  return (
    <dl className={detailColumns(columns)}>
      {items.map((item) => (
        <div key={item.label} className={[styles.item, item.fullWidth ? styles.full : ""].filter(Boolean).join(" ")}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}
