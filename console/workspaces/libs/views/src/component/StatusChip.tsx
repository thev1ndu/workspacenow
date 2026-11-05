import { Chip } from "@heroui/react";

type Tone = "default" | "accent" | "success" | "warning" | "danger";

const TONES: Record<string, Tone> = {
  active: "success",
  allowed: "success",
  approved: "success",
  completed: "success",
  connected: "success",
  healthy: "success",
  released: "success",
  issued: "success",
  delivered: "success",
  checked_in: "success",
  valid: "accent",
  ordered: "accent",
  running: "accent",
  preview: "accent",
  waiting: "warning",
  pending: "warning",
  "pending-approval": "warning",
  degraded: "warning",
  suspended: "warning",
  failed: "danger",
  failing: "danger",
  denied: "danger",
  rejected: "danger",
  down: "danger",
  disabled: "danger",
  unreachable: "danger",
  disconnected: "danger",
  cancelled: "danger",
};

function label(status: string): string {
  const text = status.replace(/[-_]/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Lifecycle and outcome states, always as a soft chip so colour carries meaning without shouting. */
export function StatusChip({ status, label: text }: { status: string; label?: string }) {
  return (
    <Chip size="sm" variant="soft" color={TONES[status] ?? "default"}>
      {text ?? label(status)}
    </Chip>
  );
}
