import { Tag } from "@carbon/react";
import type { EntityScope } from "@workspacenow/types";
import { SCOPE_LABEL } from "../constants";

// Carbon Tag types: no accent tone, so accent maps to blue (see the migration cheatsheet).
const COLOR = { application: "blue", organization: "green", external: "gray" } as const;

export function ScopeChip({ scope }: { scope: EntityScope }) {
  return (
    <Tag size="sm" type={COLOR[scope]}>
      {SCOPE_LABEL[scope]}
    </Tag>
  );
}
