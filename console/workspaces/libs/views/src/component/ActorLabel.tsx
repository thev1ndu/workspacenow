import { Flow, Bot, Settings, User } from "@carbon/react/icons";

import type { Actor } from "@workspacenow/types";

const ICONS = { user: User, agent: Bot, workflow: Flow, system: Settings };

/** Who acted, marked by kind so agent and workflow actions stand out from people's. */
export function ActorLabel({ actor }: { actor: Actor }) {
  const Icon = ICONS[actor.kind];
  const tip = actor.onBehalfOf ? `${actor.kind} on behalf of ${actor.onBehalfOf}` : actor.kind;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm" title={tip}>
      <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
      <span className="truncate">{actor.name}</span>
    </span>
  );
}
