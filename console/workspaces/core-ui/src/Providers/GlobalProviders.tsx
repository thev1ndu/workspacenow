import type { ReactNode } from "react";
import { AuthProvider } from "@workspacenow/auth";
import { I18nProvider } from "@workspacenow/i18n";
import { ClientProvider } from "@workspacenow/api-client";
import { Toaster } from "@workspacenow/views";

export function GlobalProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <ClientProvider>
          {children}
          <Toaster />
        </ClientProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
