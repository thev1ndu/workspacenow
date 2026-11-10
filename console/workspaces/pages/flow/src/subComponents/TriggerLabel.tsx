import { Calendar, Draggable, Flash } from "@carbon/react/icons";

import type { WorkflowTrigger } from "@workspacenow/types";

import styles from "./TriggerLabel.module.scss";

/** A trigger in words: event names in monospace, schedules as cron. */
export function TriggerLabel({ trigger, showIcon = true }: { trigger: WorkflowTrigger; showIcon?: boolean }) {
  const Icon = trigger.kind === "entity-event" ? Flash : trigger.kind === "schedule" ? Calendar : Draggable;
  return (
    <span className={styles.label}>
      {showIcon && <Icon className={styles.icon} size={16} aria-hidden />}
      {trigger.kind === "entity-event" && (
        <span>
          On <code className={styles.code}>{trigger.event}</code>
        </span>
      )}
      {trigger.kind === "schedule" && (
        <span>
          Schedule <code className={styles.code}>{trigger.cron}</code>
        </span>
      )}
      {trigger.kind === "manual" && <span>Manual</span>}
    </span>
  );
}
