import type { ReactNode } from "react";
import { Archive } from "@workspacenow/icons";

/** Empty state: an icon, a message and an optional action. */
export function NoDataFound({ message, action, icon }: { message: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="text-muted [&_svg]:size-6">{icon ?? <Archive />}</div>
      <p className="text-sm text-muted">{message}</p>
      {action}
    </div>
  );
}
