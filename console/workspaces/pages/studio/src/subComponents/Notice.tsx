import type { ReactNode } from "react";
import { InlineNotification } from "@carbon/react";

import styles from "./Notice.module.scss";

/** A one-line alert above the plan editor, for permissions, validation and save errors. */
export function Notice({ status, children }: { status?: "default" | "danger"; children: ReactNode }) {
  return (
    <InlineNotification kind={status === "danger" ? "error" : "info"} lowContrast hideCloseButton>
      {children}
    </InlineNotification>
  );
}

/** Lists what blocks a plan from being saved, capped so a long list does not push the editor off screen. */
export function ProblemNotice({ heading, problems }: { heading: string; problems: string[] }) {
  if (problems.length === 0) return null;
  return (
    <InlineNotification kind="warning" lowContrast hideCloseButton title={heading}>
      <ul className={styles.problems}>
        {problems.slice(0, 6).map((p) => (
          <li key={p}>{p}</li>
        ))}
        {problems.length > 6 && <li>and {problems.length - 6} more</li>}
      </ul>
    </InlineNotification>
  );
}
