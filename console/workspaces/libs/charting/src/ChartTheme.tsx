import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";

/** The four Carbon themes; the same ids as the views package's CarbonTheme. */
export type ChartThemeId = "white" | "g10" | "g90" | "g100";

const THEMES: ChartThemeId[] = ["white", "g10", "g90", "g100"];

const ChartThemeContext = createContext<ChartThemeId | undefined>(undefined);

/** Optional: pass the app's Carbon theme down so every chart follows it. Without it, charts read the theme class on <html>. */
export function ChartThemeProvider({ theme, children }: { theme: ChartThemeId; children: ReactNode }) {
  return createElement(ChartThemeContext.Provider, { value: theme }, children);
}

// The theme class the app puts on <html> (cds--white, cds--g10, cds--g90, cds--g100).
function readDocumentTheme(): ChartThemeId {
  if (typeof document === "undefined") return "white";
  const classes = document.documentElement.classList;
  return THEMES.find((t) => classes.contains(`cds--${t}`)) ?? "white";
}

/** The theme charts render with: the provider's value, else the theme class on <html>, kept in sync as it changes. */
export function useChartTheme(): ChartThemeId {
  const provided = useContext(ChartThemeContext);
  const [documentTheme, setDocumentTheme] = useState<ChartThemeId>(readDocumentTheme);
  useEffect(() => {
    if (provided) return;
    setDocumentTheme(readDocumentTheme());
    const observer = new MutationObserver(() => setDocumentTheme(readDocumentTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [provided]);
  return provided ?? documentTheme;
}
