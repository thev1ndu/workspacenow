import { useState } from "react";
import { Button, InlineNotification, Tag } from "@carbon/react";
import { Check, Xmark } from "@workspacenow/icons";
import { useCan, useDecideApproval } from "@workspacenow/api-client";
import { buildPath, routes, type Approval } from "@workspacenow/types";
import { StatusChip, TextInput, TextLink, formatDateTime, formatRelative } from "@workspacenow/views";

export function ApprovalCard({ approval }: { approval: Approval }) {
  const [comment, setComment] = useState("");
  const allowed = useCan(approval.permission);
  const decide = useDecideApproval();
  const pending = approval.status === "pending";

  const submit = (decision: "approved" | "rejected") => decide.mutate({ approvalId: approval.id, decision, comment });

  return (
    <div className="gap-4 rounded-xl border border-separator bg-surface p-5">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{approval.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            Requested {formatRelative(approval.requestedAt)} · {formatDateTime(approval.requestedAt)}
          </p>
        </div>
        <StatusChip status={approval.status} />
      </div>

      <p className="text-sm text-foreground">{approval.summary}</p>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Tag size="sm" type="gray">
          <span className="font-mono">Requires {approval.permission}</span>
        </Tag>
        {approval.subject && (
          <Tag size="sm" type="gray">
            {approval.subject.entity} {approval.subject.recordId}
          </Tag>
        )}
        <TextLink to={buildPath(routes.flow.execution, { executionId: approval.executionId })}>Execution</TextLink>
        <TextLink to={buildPath(routes.control.trace, { traceId: approval.traceId })}>Trace</TextLink>
      </div>

      {pending ? (
        <div className="grid gap-3">
          {!allowed && (
            <InlineNotification kind="warning" lowContrast hideCloseButton>
              You don't hold <code className="font-mono text-xs">{approval.permission}</code>, so the platform will deny and audit this decision.
              Switch to Ruwan Jayasinghe (Procurement Manager) from the account menu to approve it.
            </InlineNotification>
          )}
          <TextInput label="Comment" value={comment} onChange={setComment} placeholder="Comment (optional)" />
          <div className="flex gap-2">
            <Button disabled={decide.isPending} onClick={() => submit("approved")}>
              <Check className="size-4" aria-hidden />
              Approve
            </Button>
            <Button kind="secondary" disabled={decide.isPending} onClick={() => submit("rejected")}>
              <Xmark className="size-4" aria-hidden />
              Reject
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">
          {approval.status === "approved" ? "Approved" : "Rejected"} by {approval.decidedBy} {formatRelative(approval.decidedAt)}
          {approval.comment ? ` · "${approval.comment}"` : ""}
        </p>
      )}
    </div>
  );
}
