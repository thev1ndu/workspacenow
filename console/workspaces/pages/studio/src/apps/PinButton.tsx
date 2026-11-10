import { Button } from "@carbon/react";
import { Pin, PinFill } from "@workspacenow/icons";
import { useListPinnedApplications, useSetApplicationPinned } from "@workspacenow/api-client";
import type { Application } from "@workspacenow/types";

/** The signed-in user's pinned application ids, in pin order. */
export function usePinnedApplicationIds(): string[] {
  return useListPinnedApplications().data?.items ?? [];
}

/** Pins an application to the user's Home and sidebar, or unpins it. */
/** Applications with the user's pinned ones first, in pin order, then the rest by name. */
export function pinnedFirst<T extends Pick<Application, "id" | "name">>(apps: T[], pinnedIds: string[]): T[] {
  const rank = (id: string) => (pinnedIds.includes(id) ? pinnedIds.indexOf(id) : pinnedIds.length);
  return [...apps].sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
}

export function PinButton({ app, variant = "ghost" }: { app: Pick<Application, "id" | "name">; variant?: "ghost" | "secondary" }) {
  const pinned = usePinnedApplicationIds().includes(app.id);
  const setPinned = useSetApplicationPinned();
  const label = pinned ? `Unpin ${app.name}` : `Pin ${app.name} to Home`;

  return (
    <Button
      hasIconOnly
      iconDescription={pinned ? "Unpin" : "Pin to Home"}
      size="sm"
      kind={variant}
      aria-label={label}
      aria-pressed={pinned}
      disabled={setPinned.isPending}
      onClick={() => setPinned.mutate({ appId: app.id, name: app.name, pinned: !pinned })}
    >
      {pinned ? <PinFill className="size-4 text-accent" /> : <Pin className="size-4" />}
    </Button>
  );
}
