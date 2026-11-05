import type { ReactNode } from "react";
import { Alert } from "@heroui/react";

/** A one-line alert above the plan editor, for permissions, validation and save errors. */
export function Notice({ status, children }: { status?: "default" | "danger"; children: ReactNode }) {
  return (
    <Alert status={status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
