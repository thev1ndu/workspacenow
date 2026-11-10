import type { ReactNode } from "react";
import { Heading, Layer, Section, Tile } from "@carbon/react";

import styles from "./SectionCard.module.scss";

export interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Content runs edge to edge, for tables and lists. */
  flush?: boolean;
  className?: string;
  /** Extra class for the content area. */
  contentClassName?: string;
}

/** A titled Carbon tile; `flush` runs the body edge to edge, for tables and lists. Content sits one layer up so fields keep their contrast. */
export function SectionCard({ title, subtitle, actions, children, flush, className, contentClassName }: SectionCardProps) {
  return (
    <Tile className={[styles.card, className].filter(Boolean).join(" ")}>
      <Section>
        {(title || actions) && (
          <div className={styles.header}>
            <div className={styles.heading}>
              {title && <Heading className={styles.title}>{title}</Heading>}
              {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
            </div>
            {actions && <div className={styles.actions}>{actions}</div>}
          </div>
        )}
        <Layer className={[flush ? styles.flush : styles.body, contentClassName].filter(Boolean).join(" ")}>{children}</Layer>
      </Section>
    </Tile>
  );
}
