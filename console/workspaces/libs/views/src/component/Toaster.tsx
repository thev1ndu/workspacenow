import { Toast, toast } from "@heroui/react";

export type Severity = "success" | "error" | "info" | "warning";

const VARIANTS = { success: "success", error: "danger", info: "default", warning: "warning" } as const;

/** Mount once at the root; every notification renders here. */
export function Toaster() {
  return <Toast.Provider placement="bottom end" />;
}

export function useSnackBar() {
  return {
    pushSnackBar: (message: string, severity: Severity = "info") => {
      toast(message, { variant: VARIANTS[severity] });
    },
  };
}
