import type { ReactNode } from "react";
import { Link } from "@heroui/react";
import { buildPath, routes, type Application } from "@workspacenow/types";
import { StatusChip } from "@workspacenow/views";
import { AppIcon } from "./AppIcon";
import { PinButton } from "./PinButton";

/** An application as a tile that opens it, with a pin button and a line of `meta` under its description. */
export function AppTile({ app, meta }: { app: Application; meta: ReactNode }) {
  return (
    <li className="relative flex flex-col gap-3 rounded-xl border border-separator bg-surface p-4 transition-colors hover:border-default-hover hover:bg-surface-secondary">
      <div className="flex items-start justify-between gap-2">
        <AppIcon app={app} />
        <div className="relative z-10 -mt-1 -mr-1">
          <PinButton app={app} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        {/* The link's overlay makes the whole tile open the app; the pin button sits above it. */}
        <Link
          href={buildPath(routes.app, { appId: app.id })}
          className="text-sm font-medium text-foreground no-underline after:absolute after:inset-0 after:rounded-xl"
        >
          {app.name}
        </Link>
        <p className="mt-1 line-clamp-2 text-xs text-muted">{app.description}</p>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">{meta}</span>
        <StatusChip status={app.lifecycle} />
      </div>
    </li>
  );
}
