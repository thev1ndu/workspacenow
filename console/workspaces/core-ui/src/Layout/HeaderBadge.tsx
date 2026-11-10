import styles from "./Topbar.module.scss";

/** A small count on a header action; hidden from assistive tech because the action's label carries the number. */
export function HeaderBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className={styles.badge} aria-hidden>
      {count > 9 ? "9+" : count}
    </span>
  );
}
