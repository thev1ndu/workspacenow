import type { ReactNode } from "react";
import { AuthProvider } from "@workspacenow/auth";
import { ClientProvider } from "@workspacenow/api-client";
import { Toaster } from "@workspacenow/views";

export function GlobalProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ClientProvider>
        {children}
        <Toaster />
      </ClientProvider>
    </AuthProvider>
  );
}
