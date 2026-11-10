import type { ReactNode } from "react";

import styles from "./NoDataFound.module.scss";

export interface NoDataFoundProps {
  /** The helper text; with no `title` it is the only line. */
  message: string;
  /** Heading above the message, as in Carbon's empty-state pattern. */
  title?: string;
  action?: ReactNode;
  /** Optional Carbon icon element shown above the heading. */
  icon?: ReactNode;
}

/** Empty state in Carbon's pattern: a heading, helper text and an optional action. */
export function NoDataFound({ message, title, action, icon }: NoDataFoundProps) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.icon}>{icon}</div>}
      {title ? (
        <>
          <p className={styles.title}>{title}</p>
          <p className={styles.message}>{message}</p>
        </>
      ) : (
        <p className={styles.title}>{message}</p>
      )}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
