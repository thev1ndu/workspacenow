import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Hand-rolled i18n: dictionaries keyed by the English source string, so t("Studio") localizes.
 * Locale comes from config.js (`locale`) or localStorage `workspacenow-locale`.
 */

export type Locale = "en" | "de";
export const LOCALES: Array<{ id: Locale; label: string }> = [
  { id: "en", label: "English" },
  { id: "de", label: "Deutsch" },
];

const KEY = "workspacenow-locale";

const de: Record<string, string> = {
  Home: "Start",
  Studio: "Studio",
  Connect: "Verbinden",
  Data: "Daten",
  AI: "KI",
  Flow: "Ablauf",
  Control: "Steuerung",
  Search: "Suche",
  Applications: "Anwendungen",
  Sidekick: "Sidekick",
  Preferences: "Einstellungen",
  Appearance: "Darstellung",
  Language: "Sprache",
  Light: "Hell",
  Dark: "Dunkel",
  System: "System",
  "Sign in": "Anmelden",
  "Sign in with your identity provider": "Mit Identitätsanbieter anmelden",
  "Choose a demo persona": "Demo-Persona wählen",
  Notifications: "Benachrichtigungen",
  "App notifications": "App-Benachrichtigungen",
  "No notifications yet": "Noch keine Benachrichtigungen",
  "Mark all read": "Alle als gelesen markieren",
  Open: "Öffnen",
  Close: "Schließen",
  Save: "Speichern",
  Cancel: "Abbrechen",
  Delete: "Löschen",
  Edit: "Bearbeiten",
  New: "Neu",
  Loading: "Laden …",
  "Signed in as": "Angemeldet als",
};

const dictionaries: Record<Locale, Record<string, string>> = { en: {}, de };

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "de" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  const configured = (globalThis as { __RUNTIME_CONFIG__?: { locale?: string } }).__RUNTIME_CONFIG__?.locale;
  return configured === "de" ? "de" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = useCallback((l: Locale) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
    setLocaleState(l);
    document.documentElement.lang = l;
  }, []);
  const t = useCallback((key: string) => dictionaries[locale][key] ?? key, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): (key: string) => string {
  const ctx = useContext(I18nContext);
  return ctx?.t ?? ((key: string) => key);
}

export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  const ctx = useContext(I18nContext);
  return ctx ?? { locale: "en", setLocale: () => undefined };
}
