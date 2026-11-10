import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Tile } from "@carbon/react";

import styles from "./Metric.module.scss";

const COLUMNS: Record<number, string> = { 2: "", 3: styles.cols3, 4: styles.cols4, 5: styles.cols5, 6: styles.cols6 };

/** Grid class for a KPI row of `columns` tiles. */
export function metricGridColumns(columns: number): string {
  return [styles.grid, COLUMNS[columns] ?? COLUMNS[4]].filter(Boolean).join(" ");
}

/** Headline numbers as a responsive grid of individual KPI tiles (not one divided strip). */
export function MetricGrid({ columns, children }: { columns: number; children: ReactNode }) {
  return <div className={metricGridColumns(columns)}>{children}</div>;
}

/**
 * One KPI tile: icon + label on top, big value below, optional hint. With `href` the whole tile
 * opens it: an app route, or "#id" to jump to a section on the same page.
 */
export function Metric({ label, value, icon, hint, href }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <div className={styles.label}>
        {icon}
        <span className={styles.labelText}>{label}</span>
      </div>
      <div className={styles.value}>{value}</div>
      {hint && <div className={styles.hint}>{hint}</div>}
    </>
  );
  if (!href) {
    return (
      <Tile className={styles.tile}>
        <div className={styles.tileBody}>{body}</div>
      </Tile>
    );
  }
  // The router does not scroll to in-page sections, so a "#id" target stays a plain anchor.
  const link = href.startsWith("#") ? (
    <a href={href} className={`${styles.tileBody} ${styles.link}`}>
      {body}
    </a>
  ) : (
    <Link to={href} className={`${styles.tileBody} ${styles.link}`}>
      {body}
    </Link>
  );
  return <Tile className={`${styles.tile} ${styles.clickable}`}>{link}</Tile>;
}
