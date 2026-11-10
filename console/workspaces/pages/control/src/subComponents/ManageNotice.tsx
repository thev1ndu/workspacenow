import { CodeSnippet, InlineNotification } from "@carbon/react";

import styles from "../control.module.scss";

/** Tells a reader without control.manage that saving will be denied and audited. */
export function ManageNotice({ padded }: { padded?: boolean }) {
  return (
    <div className={padded ? styles.notice : undefined}>
      <InlineNotification kind="info" lowContrast hideCloseButton title="Read-only access" subtitle="">
        Saving needs <CodeSnippet type="inline" hideCopyButton>control.manage</CodeSnippet>. You can still try; the platform will deny and audit it.
      </InlineNotification>
    </div>
  );
}
