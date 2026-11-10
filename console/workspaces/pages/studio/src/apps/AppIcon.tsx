import type { Application } from "@workspacenow/types";

import styles from "./AppIcon.module.scss";

type Size = "xs" | "sm" | "md" | "lg";

/** An application's mark: an identicon generated from its name, the same everywhere it appears. */
export function AppIcon({ app, size = "md" }: { app: Pick<Application, "name">; size?: Size }) {
  return (
    <img
      alt=""
      aria-hidden
      loading="lazy"
      src={`https://api.dicebear.com/10.x/identicon/svg?seed=${encodeURIComponent(app.name)}`}
      className={`${styles.icon} ${styles[size]}`}
    />
  );
}
