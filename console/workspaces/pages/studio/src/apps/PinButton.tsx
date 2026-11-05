import { Button, Tooltip } from "@heroui/react";
import { Pin, PinFill } from "@workspacenow/icons";
import { useListPinnedApplications, useSetApplicationPinned } from "@workspacenow/api-client";
import type { Application } from "@workspacenow/types";

/** The signed-in user's pinned application ids, in pin order. */
export function usePinnedApplicationIds(): string[] {
  return useListPinnedApplications().data?.items ?? [];
}

/** Pins an application to the user's Home and sidebar, or unpins it. */
export function PinButton({ app, variant = "ghost" }: { app: Pick<Application, "id" | "name">; variant?: "ghost" | "secondary" }) {
  const pinned = usePinnedApplicationIds().includes(app.id);
  const setPinned = useSetApplicationPinned();
  const label = pinned ? `Unpin ${app.name}` : `Pin ${app.name} to Home`;

  return (
    <Tooltip delay={300}>
      <Button
        isIconOnly
        size="sm"
        variant={variant}
        aria-label={label}
        aria-pressed={pinned}
        isPending={setPinned.isPending}
        onPress={() => setPinned.mutate({ appId: app.id, name: app.name, pinned: !pinned })}
      >
        {pinned ? <PinFill className="size-4 text-accent" /> : <Pin className="size-4" />}
      </Button>
      <Tooltip.Content>{pinned ? "Unpin" : "Pin to Home"}</Tooltip.Content>
    </Tooltip>
  );
}
