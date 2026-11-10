export const SEEN_KEY = "workspacenow-notifications-seen";

/** The newest event time the user has already seen, or "" when nothing is remembered. */
export function readSeen(key = SEEN_KEY): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/** Remembers the newest seen event; unread state then lasts only for this session if storage is blocked. */
export function writeSeen(key: string, time: string): void {
  try {
    localStorage.setItem(key, time);
  } catch {
    // Unread state then lasts only for this session.
  }
}
