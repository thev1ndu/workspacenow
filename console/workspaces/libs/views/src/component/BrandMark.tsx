import styles from "./BrandMark.module.scss";

const SIZE = { sm: styles.sm, md: styles.md };

/** The WorkspaceNow mark: a plain glyph on Carbon's inverse background, no gradients. */
export function BrandMark({ size = "md" }: { size?: keyof typeof SIZE }) {
  return (
    <span className={`${styles.mark} ${SIZE[size]}`} aria-label="WorkspaceNow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter" aria-hidden>
        <path d="M4 7l3.4 10L12 9.5 16.6 17 20 7" />
      </svg>
    </span>
  );
}
