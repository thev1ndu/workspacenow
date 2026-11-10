import { Calendar, Draggable, Flash } from "@carbon/react/icons";

import type { WorkflowTrigger } from "@workspacenow/types";

/** A trigger in words: event names in monospace, schedules as cron. */
export function TriggerLabel({ trigger, showIcon = true }: { trigger: WorkflowTrigger; showIcon?: boolean }) {
  const Icon = trigger.kind === "entity-event" ? Flash : trigger.kind === "schedule" ? Calendar : Draggable;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {showIcon && <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />}
      {trigger.kind === "entity-event" && (
        <span>
          On <code className="font-mono text-[13px]">{trigger.event}</code>
        </span>
      )}
      {trigger.kind === "schedule" && (
        <span>
          Schedule <code className="font-mono text-[13px]">{trigger.cron}</code>
        </span>
      )}
      {trigger.kind === "manual" && <span>Manual</span>}
    </span>
  );
}
