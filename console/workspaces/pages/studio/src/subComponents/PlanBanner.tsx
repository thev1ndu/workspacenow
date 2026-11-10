import type { ReactNode } from "react";
import { Tag, Tile } from "@carbon/react";

import styles from "./PlanBanner.module.scss";

/** The strip above the plan editor: what is being edited, a plain-language note and the primary actions. */
export function PlanBanner({ badge, name, description, actions }: { badge: string; name: string; description: ReactNode; actions: ReactNode }) {
  return (
    <Tile>
      <div className={styles.banner}>
        <div className={styles.text}>
          <div className={styles.title}>
            <Tag size="sm" type="gray">
              {badge}
            </Tag>
            <span className={styles.name}>{name || "Untitled application"}</span>
          </div>
          <p className={styles.description}>{description}</p>
        </div>
        <div className={styles.actions}>{actions}</div>
      </div>
    </Tile>
  );
}
