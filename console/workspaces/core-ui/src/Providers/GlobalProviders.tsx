import type { ReactNode } from "react";
import { GlobalTheme } from "@carbon/react";
import { AuthProvider } from "@workspacenow/auth";
import { I18nProvider } from "@workspacenow/i18n";
import { ClientProvider } from "@workspacenow/api-client";
import { Toaster, useCarbonTheme } from "@workspacenow/views";

/** Carbon's GlobalTheme for the whole app. useCarbonTheme also puts the theme class on <html>, so it stays mounted for every page, signed in or not. */
function ThemeRoot({ children }: { children: ReactNode }) {
  const { theme } = useCarbonTheme();
  return <GlobalTheme theme={theme}>{children}</GlobalTheme>;
}

export function GlobalProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeRoot>
      <I18nProvider>
        <AuthProvider>
          <ClientProvider>
            {children}
            <Toaster />
          </ClientProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeRoot>
  );
}
