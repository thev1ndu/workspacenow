import { useSyncExternalStore } from "react";
import { ToastNotification } from "@carbon/react";

export type Severity = "success" | "error" | "info" | "warning";

const KINDS: Record<Severity, "success" | "error" | "info" | "warning"> = {
  success: "success",
  error: "error",
  info: "info",
  warning: "warning",
};

interface ToastItem {
  id: number;
  message: string;
  severity: Severity;
}

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function pushToast(message: string, severity: Severity) {
  const id = nextId++;
  toasts = [...toasts, { id, message, severity }];
  emit();
  setTimeout(() => dismiss(id), 6000);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Mount once at the root; every notification renders here as a Carbon toast. */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts);
  return (
    <div style={{ position: "fixed", bottom: "1rem", right: "1rem", zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "24rem" }}>
      {items.map((t) => (
        <ToastNotification key={t.id} kind={KINDS[t.severity]} lowContrast title={t.message} onClose={() => dismiss(t.id)} timeout={6000} />
      ))}
    </div>
  );
}

export function useSnackBar() {
  return {
    pushSnackBar: (message: string, severity: Severity = "info") => {
      pushToast(message, severity);
    },
  };
}
