import type { ReactNode } from "react";
import { Link, Tile } from "@carbon/react";
import { Link as RouterLink } from "react-router-dom";
import { buildPath, routes, type Application } from "@workspacenow/types";
import { StatusChip } from "@workspacenow/views";
import { AppIcon } from "./AppIcon";
import { PinButton } from "./PinButton";

import styles from "./AppTile.module.scss";

/** An application as a tile that opens it, with a pin button and a line of `meta` under its description. */
export function AppTile({ app, meta }: { app: Application; meta: ReactNode }) {
  return (
    <li className={styles.item}>
      <Tile className={styles.tile}>
        <div className={styles.top}>
          <AppIcon app={app} />
          <div className={styles.pin}>
            <PinButton app={app} />
          </div>
        </div>
        <div className={styles.body}>
          <Link as={RouterLink} to={buildPath(routes.app, { appId: app.id })} className={styles.link}>
            {app.name}
          </Link>
          <p className={styles.description}>{app.description}</p>
        </div>
        <div className={styles.foot}>
          <span className={styles.meta}>{meta}</span>
          <StatusChip status={app.lifecycle} />
        </div>
      </Tile>
    </li>
  );
}
