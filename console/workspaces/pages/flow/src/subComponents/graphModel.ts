import { MarkerType, type Edge, type Node } from "@xyflow/react";
import {
  startStep,
  stepLinks,
  nextStep,
  type CanvasPosition,
  type StepStatus,
  type Workflow,
  type WorkflowDefinition,
  type WorkflowStep,
  type WorkflowStepKind,
} from "@workspacenow/types";

/** The trigger's node id; never a step id, since step ids are generated as "s-…". */
export const TRIGGER_ID = "trigger";

export type LinkPath = "next" | "then" | "otherwise" | "onReject";

export type TriggerNodeData = { kind: "trigger"; trigger: Workflow["trigger"] };
export type StepNodeData = { kind: "step"; step: WorkflowStep; status?: StepStatus };
export type FlowNode = Node<TriggerNodeData, "trigger"> | Node<StepNodeData, "step">;

const ROW = 150;
const COLUMN = 280;

/**
 * Where nodes without a saved position go: the trigger on top, then each step one row below the
 * deepest step that leads to it, siblings side by side. Unconnected steps form a last row.
 */
function autoLayout(definition: WorkflowDefinition): Map<string, CanvasPosition> {
  const depth = new Map<string, number>([[TRIGGER_ID, 0]]);
  const byId = new Map(definition.steps.map((s) => [s.id, s]));
  const queue: Array<[string, number]> = [];
  const first = startStep(definition);
  if (first) queue.push([first, 1]);
  while (queue.length > 0) {
    const [id, d] = queue.shift()!;
    // Flows cannot loop once saved, but a draft can; the depth cap keeps layout finite either way.
    if ((depth.get(id) ?? -1) >= d || d > definition.steps.length + 1) continue;
    depth.set(id, d);
    const step = byId.get(id);
    if (step) for (const link of stepLinks(definition, step)) if (link.to) queue.push([link.to, d + 1]);
  }
  const deepest = Math.max(0, ...depth.values());
  for (const step of definition.steps) if (!depth.has(step.id)) depth.set(step.id, deepest + 1);

  const rows = new Map<number, string[]>();
  for (const [id, d] of depth) rows.set(d, [...(rows.get(d) ?? []), id]);
  const positions = new Map<string, CanvasPosition>();
  for (const [d, ids] of rows) ids.forEach((id, i) => positions.set(id, { x: (i - (ids.length - 1) / 2) * COLUMN, y: d * ROW }));
  return positions;
}

const LABELS: Partial<Record<LinkPath, string>> = { then: "Yes", otherwise: "No", onReject: "Rejected" };

/** The canvas for a definition: a trigger node, one node per step and one edge per link. */
export function toGraph(definition: WorkflowDefinition, statuses?: Map<string, StepStatus>): { nodes: FlowNode[]; edges: Edge[] } {
  const auto = autoLayout(definition);
  const nodes: FlowNode[] = [
    { id: TRIGGER_ID, type: "trigger", position: definition.triggerPosition ?? auto.get(TRIGGER_ID)!, data: { kind: "trigger", trigger: definition.trigger }, deletable: false },
    ...definition.steps.map(
      (step): FlowNode => ({ id: step.id, type: "step", position: step.position ?? auto.get(step.id)!, data: { kind: "step", step, status: statuses?.get(step.id) } }),
    ),
  ];
  const edges: Edge[] = [];
  const first = startStep(definition);
  // Right-angle connectors with arrowheads read as a direction even when a step sits above the one before it.
  const edge = { type: "smoothstep", pathOptions: { borderRadius: 14, offset: 24 }, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 } };
  if (first) edges.push({ ...edge, id: `${TRIGGER_ID}:next`, source: TRIGGER_ID, sourceHandle: "next", target: first });
  for (const step of definition.steps) {
    for (const link of stepLinks(definition, step)) {
      if (!link.to) continue;
      const taken = statuses && statuses.get(step.id) === "completed" && statuses.get(link.to) !== undefined && statuses.get(link.to) !== "skipped" && statuses.get(link.to) !== "pending";
      edges.push({ ...edge, id: `${step.id}:${link.path}`, source: step.id, sourceHandle: link.path, target: link.to, label: LABELS[link.path], animated: !!taken, className: taken ? "edge-taken" : undefined });
    }
  }
  return { nodes, edges };
}

/** The definition with every link spelled out, so editing never depends on the order of `steps`. */
export function explicit(definition: WorkflowDefinition): WorkflowDefinition {
  return {
    ...definition,
    start: startStep(definition),
    steps: definition.steps.map((step) => (step.kind === "condition" ? step : { ...step, next: nextStep(definition, step) })),
  };
}

function setLink(step: WorkflowStep, path: LinkPath, to: string | null): WorkflowStep {
  if (step.kind === "condition") return path === "then" ? { ...step, then: to } : path === "otherwise" ? { ...step, otherwise: to } : step;
  if (path === "onReject") return step.kind === "approval" ? { ...step, onReject: to } : step;
  return { ...step, next: to };
}

/** Points a node's handle at a step; connecting a handle again replaces its previous link. */
export function connect(definition: WorkflowDefinition, source: string, path: LinkPath, target: string): WorkflowDefinition {
  if (source === target) return definition;
  if (source === TRIGGER_ID) return { ...definition, start: target };
  return { ...definition, steps: definition.steps.map((s) => (s.id === source ? setLink(s, path, target) : s)) };
}

/** Removes the link an edge draws (its id is "source:path"). */
export function disconnect(definition: WorkflowDefinition, edgeId: string): WorkflowDefinition {
  const [source, path] = edgeId.split(":") as [string, LinkPath];
  if (source === TRIGGER_ID) return { ...definition, start: null };
  return { ...definition, steps: definition.steps.map((s) => (s.id === source ? setLink(s, path, null) : s)) };
}

/** Deletes a step and every link into it. */
export function removeStep(definition: WorkflowDefinition, id: string): WorkflowDefinition {
  const unlink = (to: string | null | undefined) => (to === id ? null : to);
  return {
    ...definition,
    start: unlink(definition.start),
    steps: definition.steps
      .filter((s) => s.id !== id)
      .map((s) =>
        s.kind === "condition"
          ? { ...s, then: unlink(s.then) ?? null, otherwise: unlink(s.otherwise) ?? null }
          : s.kind === "approval"
            ? { ...s, next: unlink(s.next), onReject: unlink(s.onReject) }
            : { ...s, next: unlink(s.next) },
      ),
  };
}

/** Forgets every saved position so the whole flow is laid out again, top to bottom. */
export function tidy(definition: WorkflowDefinition): WorkflowDefinition {
  return { ...definition, triggerPosition: undefined, steps: definition.steps.map((s) => ({ ...s, position: undefined })) };
}

export function moveNode(definition: WorkflowDefinition, id: string, position: CanvasPosition): WorkflowDefinition {
  if (id === TRIGGER_ID) return { ...definition, triggerPosition: position };
  return { ...definition, steps: definition.steps.map((s) => (s.id === id ? { ...s, position } : s)) };
}

const DEFAULT_NAMES: Record<WorkflowStepKind, string> = {
  agent: "Ask an agent",
  approval: "Get approval",
  operation: "Run an operation",
  notify: "Send a notification",
  condition: "Check a condition",
  wait: "Wait",
};

/** A new, unconnected step of a kind, ready to configure. */
export function newStep(definition: WorkflowDefinition, kind: WorkflowStepKind, position: CanvasPosition): WorkflowStep {
  let n = definition.steps.length + 1;
  while (definition.steps.some((s) => s.id === `s-${n}`)) n += 1;
  const base = { id: `s-${n}`, name: DEFAULT_NAMES[kind], next: null, position };
  switch (kind) {
    case "agent":
      return { ...base, kind, agentId: "", prompt: "" };
    case "approval":
      return { ...base, kind, permission: "flow.manage", description: "" };
    case "operation":
      return { ...base, kind, businessOperation: "" };
    case "notify":
      return { ...base, kind, channel: "email:", message: "" };
    case "condition":
      return { id: base.id, name: base.name, position, kind, field: "", operator: "eq", value: "", then: null, otherwise: null };
    case "wait":
      return { ...base, kind, minutes: 15 };
  }
}
