import { Chip } from "@heroui/react";
import type { HttpMethod } from "@workspacenow/types";

const COLORS: Record<HttpMethod, "accent" | "success" | "warning" | "danger"> = {
  GET: "accent",
  POST: "success",
  PATCH: "warning",
  PUT: "warning",
  DELETE: "danger",
};

export function MethodChip({ method }: { method: HttpMethod }) {
  return (
    <Chip size="sm" variant="soft" color={COLORS[method]} className="w-16 justify-center font-mono font-semibold">
      {method}
    </Chip>
  );
}
