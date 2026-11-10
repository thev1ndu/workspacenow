import styles from "./Brand.module.scss";

/** The WorkspaceNow wordmark, set in IBM Plex Sans like the rest of the console. Not selectable: it is a logo, not text to copy. */
export function Brand() {
  return <span className={styles.brand}>WorkspaceNow</span>;
}
