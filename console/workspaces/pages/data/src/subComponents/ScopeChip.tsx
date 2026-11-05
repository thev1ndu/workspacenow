import { Chip } from "@heroui/react";
import type { EntityScope } from "@workspacenow/types";
import { SCOPE_LABEL } from "../constants";

const COLOR = { application: "accent", organization: "success", external: "default" } as const;

export function ScopeChip({ scope }: { scope: EntityScope }) {
  return (
    <Chip size="sm" variant="soft" color={COLOR[scope]}>
      {SCOPE_LABEL[scope]}
    </Chip>
  );
}
