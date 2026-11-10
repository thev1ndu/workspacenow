import { Flow, Bot, Settings, User } from "@carbon/react/icons";

import type { Actor } from "@workspacenow/types";

import styles from "./ActorLabel.module.scss";

const ICONS = { user: User, agent: Bot, workflow: Flow, system: Settings };

/** Who acted, marked by kind so agent and workflow actions stand out from people's. */
export function ActorLabel({ actor }: { actor: Actor }) {
  const Icon = ICONS[actor.kind];
  const tip = actor.onBehalfOf ? `${actor.kind} on behalf of ${actor.onBehalfOf}` : actor.kind;
  return (
    <span className={styles.actor} title={tip}>
      <Icon className={styles.icon} size={16} aria-hidden />
      <span className={styles.name}>{actor.name}</span>
    </span>
  );
}
