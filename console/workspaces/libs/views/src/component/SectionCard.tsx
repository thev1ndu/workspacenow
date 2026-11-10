import type { ReactNode } from "react";

export interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Content runs edge to edge, for tables and lists. */
  flush?: boolean;
  className?: string;
  /** Extra classes for the content area, e.g. to make it a flex column that fills the card. */
  contentClassName?: string;
}

/** A titled block on the layer surface; `flush` runs the body edge to edge, for tables and lists. */
export function SectionCard({ title, subtitle, actions, children, flush, className, contentClassName }: SectionCardProps) {
  return (
    <div className={`overflow-hidden rounded-xl border border-separator bg-surface ${className ?? ""}`}>
      {(title || actions) && (
        <div className="flex flex-row items-start justify-between gap-4 border-b border-separator px-5 py-4">
          <div className="min-w-0">
            {title && <div className="text-sm font-semibold text-foreground">{title}</div>}
            {subtitle && <div className="mt-0.5 text-xs text-muted">{subtitle}</div>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`${flush ? "overflow-x-auto" : "p-5"} ${contentClassName ?? ""}`}>{children}</div>
    </div>
  );
}
