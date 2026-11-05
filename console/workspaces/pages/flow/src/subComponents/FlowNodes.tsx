import type { ComponentType, ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock, FaceRobot, Gear, NodesRight, PaperPlane, Person, Thunderbolt } from "@workspacenow/icons";
import type { StepStatus, WorkflowStep, WorkflowStepKind } from "@workspacenow/types";
import { StatusChip } from "@workspacenow/views";
import { TriggerLabel } from "./TriggerLabel";
import type { FlowNode, StepNodeData, TriggerNodeData } from "./graphModel";

export const STEP_KINDS: Array<{ kind: WorkflowStepKind; label: string; hint: string; icon: ComponentType<{ className?: string }> }> = [
  { kind: "agent", label: "Agent", hint: "An AI agent works the task", icon: FaceRobot },
  { kind: "approval", label: "Approval", hint: "A person approves or rejects", icon: Person },
  { kind: "operation", label: "Operation", hint: "Run a business operation", icon: Gear },
  { kind: "notify", label: "Notify", hint: "Send a message", icon: PaperPlane },
  { kind: "condition", label: "Condition", hint: "Branch on a value", icon: NodesRight },
  { kind: "wait", label: "Wait", hint: "Pause for a while", icon: Clock },
];

const KIND = Object.fromEntries(STEP_KINDS.map((k) => [k.kind, k])) as Record<WorkflowStepKind, (typeof STEP_KINDS)[number]>;

export const OPERATORS: Record<string, string> = { eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤", contains: "contains", exists: "is set" };

/** One line saying what a step will do, for the node face. */
export function stepSummary(step: WorkflowStep): string {
  switch (step.kind) {
    case "agent":
      return step.prompt || "No instructions yet";
    case "approval":
      return `Needs ${step.permission}`;
    case "operation":
      return step.businessOperation || "No operation chosen";
    case "notify":
      return step.channel || "No channel";
    case "condition":
      return step.field ? `${step.field} ${OPERATORS[step.operator]} ${step.operator === "exists" ? "" : step.value}`.trim() : "No condition yet";
    case "wait":
      return `${step.minutes} min`;
  }
}

const STATUS_RING: Partial<Record<StepStatus, string>> = {
  completed: "border-success",
  running: "border-accent",
  waiting: "border-warning",
  failed: "border-danger",
  skipped: "border-separator opacity-50",
};

const handleClass = "!size-2.5 !border-2 !border-surface !bg-muted";

function Shell({ selected, status, children }: { selected: boolean; status?: StepStatus; children: ReactNode }) {
  return (
    <div
      className={`w-60 rounded-xl border bg-surface px-3.5 py-3 shadow-sm transition-colors ${
        selected ? "border-accent ring-2 ring-accent/30" : status ? (STATUS_RING[status] ?? "border-separator") : "border-separator"
      }`}
    >
      {children}
    </div>
  );
}

function TriggerNode({ data, selected }: NodeProps<FlowNode & { data: TriggerNodeData }>) {
  return (
    <Shell selected={selected}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        <Thunderbolt className="size-3.5" aria-hidden />
        Trigger
      </div>
      <div className="mt-1 text-foreground">
        <TriggerLabel trigger={data.trigger} showIcon={false} />
      </div>
      <Handle type="source" position={Position.Bottom} id="next" className={handleClass} />
    </Shell>
  );
}

function StepNode({ data, selected }: NodeProps<FlowNode & { data: StepNodeData }>) {
  const { step, status } = data;
  const { icon: Icon, label } = KIND[step.kind];
  return (
    <Shell selected={selected} status={status}>
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-muted">
          <Icon className="size-3.5" />
          {label}
        </span>
        {status && <StatusChip status={status} />}
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{step.name || "Unnamed step"}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{stepSummary(step)}</p>
      {step.kind === "condition" ? (
        <>
          <Handle type="source" position={Position.Bottom} id="then" style={{ left: "28%" }} className={`${handleClass} !bg-success`} />
          <Handle type="source" position={Position.Bottom} id="otherwise" style={{ left: "72%" }} className={`${handleClass} !bg-danger`} />
          <div className="mt-2 flex justify-between px-6 text-[10px] font-medium text-muted" aria-hidden>
            <span>Yes</span>
            <span>No</span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} id="next" className={handleClass} />
      )}
      {step.kind === "approval" && <Handle type="source" position={Position.Right} id="onReject" className={`${handleClass} !bg-danger`} />}
    </Shell>
  );
}

export const nodeTypes = { trigger: TriggerNode, step: StepNode };
