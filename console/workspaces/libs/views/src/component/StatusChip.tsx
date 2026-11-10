import { Tag } from "@carbon/react";

type TagType = "green" | "blue" | "purple" | "magenta" | "warm-gray" | "red" | "gray";

// Carbon has no yellow tag: in-flight work is blue, waiting is purple, degraded is magenta, inactive is warm gray.
const TAG_TYPES: Record<string, TagType> = {
  active: "green",
  allowed: "green",
  approved: "green",
  completed: "green",
  connected: "green",
  healthy: "green",
  released: "green",
  issued: "green",
  delivered: "green",
  checked_in: "green",
  valid: "blue",
  ordered: "blue",
  running: "blue",
  preview: "blue",
  waiting: "purple",
  pending: "purple",
  "pending-approval": "purple",
  degraded: "magenta",
  suspended: "warm-gray",
  disabled: "warm-gray",
  cancelled: "warm-gray",
  failed: "red",
  failing: "red",
  denied: "red",
  rejected: "red",
  down: "red",
  unreachable: "red",
  disconnected: "red",
};

function label(status: string): string {
  const text = status.replace(/[-_]/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Lifecycle and outcome states, as a Carbon tag whose colour carries the meaning. */
export function StatusChip({ status, label: text }: { status: string; label?: string }) {
  return (
    <Tag size="sm" type={TAG_TYPES[status] ?? "gray"}>
      {text ?? label(status)}
    </Tag>
  );
}
