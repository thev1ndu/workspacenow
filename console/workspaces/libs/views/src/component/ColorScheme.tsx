import { useCallback, useEffect, useState } from "react";

export type ColorMode = "light" | "dark" | "system";

/** Colour themes: an accent plus tinted neutrals, each with light and dark variants (apps/web-ui/src/themes.css). */
export const PALETTES = [
  { id: "blue", label: "Default blue", swatch: "oklch(0.62 0.195 254)" },
  { id: "orange", label: "Acrylic orange", swatch: "oklch(0.64 0.19 45)" },
  { id: "green", label: "Forest green", swatch: "oklch(0.58 0.15 155)" },
  { id: "teal", label: "Lagoon teal", swatch: "oklch(0.6 0.11 200)" },
  { id: "purple", label: "Royal purple", swatch: "oklch(0.56 0.2 295)" },
  { id: "rose", label: "Rose", swatch: "oklch(0.6 0.2 10)" },
  { id: "graphite", label: "Graphite", swatch: "oklch(0.35 0.01 260)" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

// The same keys the boot script in apps/web-ui/index.html reads, so the theme applies before first paint.
const MODE_KEY = "workspacenow-theme";
const PALETTE_KEY = "workspacenow-palette";

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return allowed.includes(saved as T) ? (saved as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The choice still applies for this session.
  }
}

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Applies a mode and palette to <html>: HeroUI's light/dark class and data-theme, plus our data-palette. */
function apply(mode: ColorMode, palette: PaletteId): void {
  const scheme = mode === "system" ? (systemDark() ? "dark" : "light") : mode;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(scheme);
  root.dataset.theme = scheme;
  if (palette === "blue") delete root.dataset.palette;
  else root.dataset.palette = palette;
}

/** The viewer's appearance: light, dark or following the system, and a colour theme. Remembered per browser. */
export function useAppearance() {
  const [mode, setModeState] = useState<ColorMode>(() => read(MODE_KEY, ["light", "dark", "system"], "system"));
  const [palette, setPaletteState] = useState<PaletteId>(() => read(PALETTE_KEY, PALETTES.map((p) => p.id), "blue"));

  useEffect(() => {
    apply(mode, palette);
    if (mode !== "system") return;
    // Follow the operating system while it changes. Read the saved choice rather than this hook's copy,
    // since the layout and the Preferences dialog each hold one and either may be the one listening.
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => apply(read(MODE_KEY, ["light", "dark", "system"], "system"), read(PALETTE_KEY, PALETTES.map((p) => p.id), "blue"));
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [mode, palette]);

  const setMode = useCallback((next: ColorMode) => {
    write(MODE_KEY, next);
    setModeState(next);
  }, []);
  const setPalette = useCallback((next: PaletteId) => {
    write(PALETTE_KEY, next);
    setPaletteState(next);
  }, []);

  return { mode, palette, setMode, setPalette };
}
