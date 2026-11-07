import type { ReactNode } from "react";
import { Card } from "@heroui/react";

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

export function SectionCard({ title, subtitle, actions, children, flush, className, contentClassName }: SectionCardProps) {
  return (
    <Card className={`gap-0 overflow-hidden p-0 ${className ?? ""}`}>
      {(title || actions) && (
        <Card.Header className="flex flex-row items-start justify-between gap-4 border-b border-separator px-5 py-4">
          <div className="min-w-0">
            {title && <Card.Title className="text-sm font-semibold">{title}</Card.Title>}
            {subtitle && <Card.Description className="mt-0.5 text-xs">{subtitle}</Card.Description>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </Card.Header>
      )}
      <Card.Content className={`${flush ? "overflow-x-auto p-0" : "p-5"} ${contentClassName ?? ""}`}>{children}</Card.Content>
    </Card>
  );
}
