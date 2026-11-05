import type { ConditionOperator, Workflow, WorkflowStep } from "./domain";

/** What the workflow editor saves: everything about a workflow except what the platform owns. */
export type WorkflowDefinition = Pick<Workflow, "name" | "description" | "trigger" | "steps" | "start" | "triggerPosition" | "applicationId">;

/** The step a run starts at, or null for a workflow with no steps. */
export function startStep(workflow: Pick<Workflow, "start" | "steps">): string | null {
  if (workflow.start !== undefined) return workflow.start;
  return workflow.steps[0]?.id ?? null;
}

/** A step's default successor: its own `next`, or the step after it in `steps` when `next` is unset. */
export function nextStep(workflow: Pick<Workflow, "steps">, step: WorkflowStep): string | null {
  if (step.next !== undefined) return step.next;
  const index = workflow.steps.findIndex((s) => s.id === step.id);
  return workflow.steps[index + 1]?.id ?? null;
}

/** Every outgoing link of a step, labelled by the path it represents. */
export function stepLinks(workflow: Pick<Workflow, "steps">, step: WorkflowStep): Array<{ path: "next" | "then" | "otherwise" | "onReject"; to: string | null }> {
  if (step.kind === "condition") {
    return [
      { path: "then", to: step.then },
      { path: "otherwise", to: step.otherwise },
    ];
  }
  const links: Array<{ path: "next" | "onReject"; to: string | null }> = [{ path: "next", to: nextStep(workflow, step) }];
  if (step.kind === "approval" && step.onReject) links.push({ path: "onReject", to: step.onReject });
  return links;
}

/** Reads a dotted path such as "order.total" from a run's context. */
export function readPath(context: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => (value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined), context);
}

/** Whether a condition step holds for a value; numbers compare as numbers, everything else as text. */
export function conditionHolds(actual: unknown, operator: ConditionOperator, expected: string): boolean {
  if (operator === "exists") return actual !== undefined && actual !== null && actual !== "";
  const a = Number(actual);
  const b = Number(expected);
  const numeric = actual !== "" && expected !== "" && Number.isFinite(a) && Number.isFinite(b);
  switch (operator) {
    case "eq":
      return numeric ? a === b : String(actual ?? "") === expected;
    case "neq":
      return numeric ? a !== b : String(actual ?? "") !== expected;
    case "gt":
      return numeric && a > b;
    case "gte":
      return numeric && a >= b;
    case "lt":
      return numeric && a < b;
    case "lte":
      return numeric && a <= b;
    case "contains":
      return String(actual ?? "").toLowerCase().includes(expected.toLowerCase());
  }
}

export interface WorkflowReferences {
  agentIds: string[];
  businessOperations: string[];
  permissions: string[];
}

/**
 * Everything wrong with a workflow definition, in reading order; empty when it can be saved. The
 * editor shows these as the flow is drawn and the platform runs the same check before saving.
 */
export function validateWorkflow(workflow: Pick<Workflow, "name" | "trigger" | "steps" | "start">, refs: WorkflowReferences): string[] {
  const problems: string[] = [];
  if (!workflow.name.trim()) problems.push("The workflow needs a name");
  if (workflow.trigger.kind === "entity-event" && !workflow.trigger.event.trim()) problems.push("Trigger: choose the event that starts the workflow");
  if (workflow.trigger.kind === "schedule" && workflow.trigger.cron.trim().split(/\s+/).length !== 5) problems.push("Trigger: a schedule needs a five-field cron expression");
  if (workflow.steps.length === 0) problems.push("Add at least one step");

  const ids = new Set<string>();
  for (const step of workflow.steps) {
    if (ids.has(step.id)) problems.push(`${step.name || step.id}: duplicate step id`);
    ids.add(step.id);
  }
  const target = (where: string, to: string | null | undefined) => {
    if (to && !ids.has(to)) problems.push(`${where}: connects to a step that no longer exists`);
  };
  target("Trigger", startStep(workflow));

  for (const step of workflow.steps) {
    const where = step.name || "Unnamed step";
    if (!step.name.trim()) problems.push(`A ${step.kind} step needs a name`);
    for (const link of stepLinks(workflow, step)) target(where, link.to);
    switch (step.kind) {
      case "agent":
        if (!refs.agentIds.includes(step.agentId)) problems.push(`${where}: choose an agent`);
        if (!step.prompt.trim()) problems.push(`${where}: tell the agent what to do`);
        break;
      case "approval":
        if (!refs.permissions.includes(step.permission)) problems.push(`${where}: choose the permission an approver needs`);
        break;
      case "operation":
        if (!refs.businessOperations.includes(step.businessOperation)) problems.push(`${where}: choose a business operation`);
        break;
      case "notify":
        if (!step.channel.trim()) problems.push(`${where}: choose where to send the notification`);
        if (!step.message.trim()) problems.push(`${where}: write the message`);
        break;
      case "condition":
        if (!step.field.trim()) problems.push(`${where}: choose the value to check`);
        if (step.operator !== "exists" && !step.value.trim()) problems.push(`${where}: enter the value to compare with`);
        if (!step.then && !step.otherwise) problems.push(`${where}: connect at least one branch`);
        break;
      case "wait":
        if (!(step.minutes > 0)) problems.push(`${where}: wait for at least one minute`);
        break;
    }
  }

  // Every step must be reachable from the trigger, and no path may loop back on itself.
  const byId = new Map(workflow.steps.map((s) => [s.id, s]));
  const reached = new Set<string>();
  const onPath = new Set<string>();
  let looped = false;
  const walk = (id: string | null | undefined) => {
    if (!id || !byId.has(id)) return;
    if (onPath.has(id)) {
      looped = true;
      return;
    }
    if (reached.has(id)) return;
    reached.add(id);
    onPath.add(id);
    for (const link of stepLinks(workflow, byId.get(id)!)) walk(link.to);
    onPath.delete(id);
  };
  walk(startStep(workflow));
  if (looped) problems.push("The flow loops back on itself; every path must reach an end");
  for (const step of workflow.steps) if (!reached.has(step.id)) problems.push(`${step.name || "A step"}: not connected to the trigger`);
  return problems;
}
