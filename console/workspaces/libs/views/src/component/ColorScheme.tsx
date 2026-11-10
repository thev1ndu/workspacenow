import { useCallback, useEffect, useSyncExternalStore } from "react";

/** The four Carbon themes: White and Gray 10 are light, Gray 90 and Gray 100 are dark. */
export type CarbonTheme = "white" | "g10" | "g90" | "g100";

export const CARBON_THEMES: { id: CarbonTheme; label: string }[] = [
  { id: "white", label: "White" },
  { id: "g10", label: "Gray 10" },
  { id: "g90", label: "Gray 90" },
  { id: "g100", label: "Gray 100" },
];

export type ThemePreference = CarbonTheme | "system";

/** Light, dark or following the system: the coarse choice older code made. */
export type ColorMode = "light" | "dark" | "system";

// The key the boot script in apps/web-ui/index.html reads, so the theme applies before first paint.
export const THEME_STORAGE_KEY = "workspacenow-carbon-theme";

const IDS = CARBON_THEMES.map((t) => t.id);
const DARK: CarbonTheme[] = ["g90", "g100"];
const QUERY = "(prefers-color-scheme: dark)";

function isPreference(value: unknown): value is ThemePreference {
  return value === "system" || IDS.includes(value as CarbonTheme);
}

function readStored(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

function writeStored(value: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // The choice still applies for this session.
  }
}

// One store shared by every hook instance, so the layout and the preferences dialog never disagree.
let preference: ThemePreference = readStored();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setPreferenceValue(next: ThemePreference) {
  if (next === preference) return;
  preference = next;
  writeStored(next);
  emit();
}

function onStorage(event: StorageEvent) {
  if (event.key !== THEME_STORAGE_KEY) return;
  const next = readStored();
  if (next === preference) return;
  preference = next;
  emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function subscribeSystem(listener: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

const getPreference = () => preference;
const getSystemDark = () => window.matchMedia(QUERY).matches;

/** Puts the Carbon theme class (cds--white, cds--g10, cds--g90, cds--g100) on <html>, plus light/dark for code that only needs the scheme. */
function apply(theme: CarbonTheme): void {
  const root = document.documentElement;
  const dark = DARK.includes(theme);
  root.classList.remove(...IDS.map((id) => `cds--${id}`), "light", "dark");
  root.classList.add(`cds--${theme}`, dark ? "dark" : "light");
  root.dataset.carbonTheme = theme;
  root.style.colorScheme = dark ? "dark" : "light";
}

export interface CarbonThemeState {
  /** The theme in effect: the saved choice, or white/g100 when following the system. */
  theme: CarbonTheme;
  /** What the viewer picked, which may be "system". */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  isDark: boolean;
}

/** The viewer's Carbon theme, remembered per browser. "system" follows prefers-color-scheme: white for light, g100 for dark. */
export function useCarbonTheme(): CarbonThemeState {
  const chosen = useSyncExternalStore(subscribe, getPreference);
  const systemDark = useSyncExternalStore(subscribeSystem, getSystemDark);
  const theme: CarbonTheme = chosen === "system" ? (systemDark ? "g100" : "white") : chosen;
  useEffect(() => apply(theme), [theme]);
  const setPreference = useCallback((next: ThemePreference) => setPreferenceValue(next), []);
  return { theme, preference: chosen, setPreference, isDark: DARK.includes(theme) };
}

/** Compatibility alias over useCarbonTheme; mode/setMode map the old light, dark and system choice onto Carbon themes. */
export function useAppearance() {
  const state = useCarbonTheme();
  const { preference: chosen, isDark, theme, setPreference } = state;
  const mode: ColorMode = chosen === "system" ? "system" : isDark ? "dark" : "light";
  const setMode = useCallback((next: ColorMode) => setPreference(next === "system" ? "system" : next === "dark" ? "g100" : "white"), [setPreference]);
  return { ...state, mode, setMode, palette: theme, setPalette: setPreference };
}
