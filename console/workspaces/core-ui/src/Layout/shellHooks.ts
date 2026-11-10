import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";

/** Carbon's `lg` breakpoint: the side navigation is persistent from here up and a drawer below. */
export const LG_QUERY = "(min-width: 66rem)";

/** True while the viewport matches a media query. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Closes an open header panel on Escape or a press outside it and its toggle. */
export function useDismiss(open: boolean, onClose: () => void, inside: Array<RefObject<HTMLElement | null>>): void {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (inside.some((ref) => ref.current?.contains(target))) return;
      close.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // The refs are stable objects; only open changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

/** Reads a boolean flag from localStorage; storage can be blocked, so a failure reads as false. */
export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

/** Remembers a boolean flag; the choice still applies for this session if storage is blocked. */
export function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // The choice still applies for this session.
  }
}
