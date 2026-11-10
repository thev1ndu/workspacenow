import type { CSSProperties, ReactNode } from "react";
import { DataTableSkeleton, SkeletonPlaceholder, SkeletonText, Tile } from "@carbon/react";

import { detailColumns } from "./DetailList";
import { metricGridColumns } from "./Metric";

import styles from "./Skeletons.module.scss";

// Placeholders shaped like the content they stand in for, so nothing jumps when data arrives.

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const join = (...names: Array<string | undefined>) => names.filter(Boolean).join(" ");

/** Header and rows of a table, edge to edge like a flush SectionCard's table. */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return <DataTableSkeleton columnCount={columns} rowCount={rows} showHeader={false} showToolbar={false} />;
}

/** Rows with a leading icon, two lines of text and a trailing status chip. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className={styles.list}>
      {range(rows).map((r) => (
        <li key={r} className={styles.listRow}>
          <SkeletonPlaceholder className={styles.icon} />
          <div className={styles.listText}>
            <SkeletonText width={`${40 + ((r * 13) % 30)}%`} />
            <SkeletonText width={`${25 + ((r * 17) % 30)}%`} />
          </div>
          <SkeletonPlaceholder className={styles.chip} />
        </li>
      ))}
    </ul>
  );
}

/** Tiles in a grid, each with an icon, a title and two lines of description. */
export function CardGridSkeleton({ count = 4, columns = 4, className }: { count?: number; columns?: number; className?: string }) {
  const vars = { "--cards-md": Math.min(columns, 2), "--cards-xl": columns } as CSSProperties;
  return (
    <div className={join(styles.cards, className)} style={vars}>
      {range(count).map((i) => (
        <Tile key={i} className={styles.card}>
          <SkeletonPlaceholder className={styles.icon} />
          <SkeletonText heading width="66%" />
          <SkeletonText paragraph lineCount={2} />
          <div className={styles.cardFoot}>
            <SkeletonText width="33%" />
            <SkeletonPlaceholder className={styles.chip} />
          </div>
        </Tile>
      ))}
    </div>
  );
}

/** A block the size of a chart, for bar, line and area charts; `height` defaults to the charts' 16rem. */
export function ChartSkeleton({ height, className }: { height?: string; className?: string }) {
  return <SkeletonPlaceholder className={join(styles.chart, className)} style={height ? { blockSize: height } : undefined} />;
}

/** A ring and its legend, for pie and donut charts. */
export function DonutSkeleton() {
  return (
    <div className={styles.donut}>
      <SkeletonPlaceholder className={styles.ring} />
      <div className={styles.legend}>
        {range(3).map((i) => (
          <SkeletonText key={i} className={styles.legendItem} />
        ))}
      </div>
    </div>
  );
}

/** Label and value pairs, as a DetailList lays them out. */
export function DetailSkeleton({ items = 4, columns = 4 }: { items?: number; columns?: number }) {
  return (
    <div className={detailColumns(columns)}>
      {range(items).map((i) => (
        <div key={i} className={styles.detailItem}>
          <SkeletonText width="4rem" />
          <SkeletonText width={`${50 + ((i * 11) % 40)}%`} />
        </div>
      ))}
    </div>
  );
}

/** A metric strip, as MetricGrid draws it. */
export function MetricGridSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className={metricGridColumns(columns)}>
      {range(columns).map((i) => (
        <Tile key={i} className={styles.metricTile}>
          <SkeletonText width="5rem" />
          <SkeletonText heading width="3rem" />
        </Tile>
      ))}
    </div>
  );
}

/** A SectionCard whose title is still loading. `flush` runs the body edge to edge, for tables and lists. */
export function SectionCardSkeleton({ children, flush, className }: { children: ReactNode; flush?: boolean; className?: string }) {
  return (
    <div className={join(styles.cardSkeleton, className)}>
      <div className={styles.cardSkeletonHead}>
        <SkeletonText heading width="9rem" />
        <SkeletonText width="16rem" />
      </div>
      <div className={flush ? undefined : styles.cardSkeletonBody}>{children}</div>
    </div>
  );
}

/** A resource detail page: its summary card above a table. */
export function PageSkeleton() {
  return (
    <div className={styles.stack}>
      <SectionCardSkeleton>
        <DetailSkeleton />
      </SectionCardSkeleton>
      <SectionCardSkeleton flush>
        <TableSkeleton rows={4} />
      </SectionCardSkeleton>
    </div>
  );
}
