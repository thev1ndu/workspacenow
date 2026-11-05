import { Tooltip } from "@heroui/react";
import { BranchesRight, FaceRobot, Gear, Person } from "@workspacenow/icons";
import type { Actor } from "@workspacenow/types";

const ICONS = { user: Person, agent: FaceRobot, workflow: BranchesRight, system: Gear };

/** Who acted, marked by kind so agent and workflow actions stand out from people's. */
export function ActorLabel({ actor }: { actor: Actor }) {
  const Icon = ICONS[actor.kind];
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger className="inline-flex min-w-0 items-center gap-1.5 text-sm">
        <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
        <span className="truncate">{actor.name}</span>
      </Tooltip.Trigger>
      <Tooltip.Content>{actor.onBehalfOf ? `${actor.kind} on behalf of ${actor.onBehalfOf}` : actor.kind}</Tooltip.Content>
    </Tooltip>
  );
}
