import { Time, Bot, Settings, Flow, Send, User, Flash } from "@carbon/react/icons";
import type { ComponentType, ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { StepStatus, WorkflowStep, WorkflowStepKind } from "@workspacenow/types";
import { StatusChip } from "@workspacenow/views";
import { TriggerLabel } from "./TriggerLabel";
import type { FlowNode, StepNodeData, TriggerNodeData } from "./graphModel";

import styles from "./FlowNodes.module.scss";

export const STEP_KINDS: Array<{ kind: WorkflowStepKind; label: string; hint: string; icon: ComponentType<{ size?: number }> }> = [
  { kind: "agent", label: "Agent", hint: "An AI agent works the task", icon: Bot },
  { kind: "approval", label: "Approval", hint: "A person approves or rejects", icon: User },
  { kind: "operation", label: "Operation", hint: "Run a business operation", icon: Settings },
  { kind: "notify", label: "Notify", hint: "Send a message", icon: Send },
  { kind: "condition", label: "Condition", hint: "Branch on a value", icon: Flow },
  { kind: "wait", label: "Wait", hint: "Pause for a while", icon: Time },
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

const STATUS_CLASS: Partial<Record<StepStatus, string>> = {
  completed: styles.completed,
  running: styles.running,
  waiting: styles.waiting,
  failed: styles.failed,
  skipped: styles.skipped,
};

function Shell({ selected, status, children }: { selected: boolean; status?: StepStatus; children: ReactNode }) {
  const classes = [styles.node, selected ? styles.selected : status ? STATUS_CLASS[status] : undefined].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}

function TriggerNode({ data, selected }: NodeProps<FlowNode & { data: TriggerNodeData }>) {
  return (
    <Shell selected={selected}>
      <div className={styles.kind}>
        <Flash size={16} aria-hidden />
        Trigger
      </div>
      <div className={styles.trigger}>
        <TriggerLabel trigger={data.trigger} showIcon={false} />
      </div>
      <Handle type="source" position={Position.Bottom} id="next" className={styles.handle} />
    </Shell>
  );
}

function StepNode({ data, selected }: NodeProps<FlowNode & { data: StepNodeData }>) {
  const { step, status } = data;
  const { icon: Icon, label } = KIND[step.kind];
  return (
    <Shell selected={selected} status={status}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div className={styles.head}>
        <span className={styles.kind}>
          <Icon size={16} />
          {label}
        </span>
        {status && <StatusChip status={status} />}
      </div>
      <p className={styles.name}>{step.name || "Unnamed step"}</p>
      <p className={styles.summary}>{stepSummary(step)}</p>
      {step.kind === "condition" ? (
        <>
          <Handle type="source" position={Position.Bottom} id="then" style={{ left: "28%" }} className={`${styles.handle} ${styles.handleYes}`} />
          <Handle type="source" position={Position.Bottom} id="otherwise" style={{ left: "72%" }} className={`${styles.handle} ${styles.handleNo}`} />
          <div className={styles.branches} aria-hidden>
            <span>Yes</span>
            <span>No</span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} id="next" className={styles.handle} />
      )}
      {step.kind === "approval" && <Handle type="source" position={Position.Right} id="onReject" className={`${styles.handle} ${styles.handleNo}`} />}
    </Shell>
  );
}

export const nodeTypes = { trigger: TriggerNode, step: StepNode };
