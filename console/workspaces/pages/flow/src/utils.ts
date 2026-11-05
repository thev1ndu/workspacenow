import type { Workflow, WorkflowTrigger } from "@workspacenow/types";

export function describeTrigger(trigger: WorkflowTrigger): string {
  switch (trigger.kind) {
    case "entity-event":
      return `When ${trigger.event} is published`;
    case "schedule":
      return `On schedule ${trigger.cron}`;
    case "manual":
      return "Started manually";
  }
}

export function formatDuration(start?: string, end?: string): string {
  if (!start) return "—";
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

export function workflowName(workflows: Workflow[] | undefined, id: string): string {
  return workflows?.find((w) => w.id === id)?.name ?? id;
}
