import { useState } from "react";
import { InlineNotification, Modal } from "@carbon/react";

import { useCan, useDecideApproval } from "@workspacenow/api-client";
import type { Approval } from "@workspacenow/types";
import { TextInput, errorMessage, formatRelative } from "@workspacenow/views";

import styles from "./DecisionModal.module.scss";

export type Decision = "approved" | "rejected";

/** The dialog an approver decides in: the request, a warning when they lack the permission, and an optional comment. */
export function DecisionModal({ approval, decision, onClose }: { approval: Approval; decision: Decision; onClose: () => void }) {
  const [comment, setComment] = useState("");
  const allowed = useCan(approval.permission);
  const decide = useDecideApproval();
  const approving = decision === "approved";

  const submit = () => decide.mutate({ approvalId: approval.id, decision, comment }, { onSuccess: onClose });

  return (
    <Modal
      open
      size="sm"
      danger={!approving}
      modalHeading={approving ? "Approve request" : "Reject request"}
      modalLabel={approval.title}
      primaryButtonText={approving ? "Approve" : "Reject"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={decide.isPending}
      onRequestSubmit={submit}
      onRequestClose={onClose}
    >
      <p className={styles.summary}>{approval.summary}</p>
      <p className={styles.meta}>Requested {formatRelative(approval.requestedAt)}. The decision runs as you and is audited.</p>
      {!allowed && (
        <InlineNotification
          className={styles.notice}
          kind="warning"
          lowContrast
          hideCloseButton
          title="Missing permission"
        >
          You don&apos;t hold <code className={styles.code}>{approval.permission}</code>, so the platform will deny and audit this decision. Switch to Ruwan Jayasinghe (Procurement Manager) from the account menu to decide it.
        </InlineNotification>
      )}
      {!!decide.error && <InlineNotification className={styles.notice} kind="error" lowContrast hideCloseButton title="Couldn't record the decision" subtitle={errorMessage(decide.error)} />}
      <TextInput label="Comment" multiline rows={3} value={comment} onChange={setComment} placeholder="Comment (optional)" />
    </Modal>
  );
}
