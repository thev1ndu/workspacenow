import type { ReactNode } from "react";
import { InlineNotification } from "@carbon/react";

/** A one-line alert above the plan editor, for permissions, validation and save errors. */
export function Notice({ status, children }: { status?: "default" | "danger"; children: ReactNode }) {
  return (
    <InlineNotification kind={status === "danger" ? "error" : "info"} lowContrast hideCloseButton>
      {children}
    </InlineNotification>
  );
}
