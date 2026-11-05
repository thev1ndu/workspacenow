import { useState } from "react";
import { Alert, Button, Card, Chip, Input, TextField } from "@heroui/react";
import { Check, Xmark } from "@workspacenow/icons";
import { useCan, useDecideApproval } from "@workspacenow/api-client";
import { buildPath, routes, type Approval } from "@workspacenow/types";
import { StatusChip, TextLink, formatDateTime, formatRelative } from "@workspacenow/views";

export function ApprovalCard({ approval }: { approval: Approval }) {
  const [comment, setComment] = useState("");
  const allowed = useCan(approval.permission);
  const decide = useDecideApproval();
  const pending = approval.status === "pending";

  const submit = (decision: "approved" | "rejected") => decide.mutate({ approvalId: approval.id, decision, comment });

  return (
    <Card className="gap-4 p-5">
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
        <Chip size="sm" variant="secondary">
          <span className="font-mono">Requires {approval.permission}</span>
        </Chip>
        {approval.subject && (
          <Chip size="sm" variant="secondary">
            {approval.subject.entity} {approval.subject.recordId}
          </Chip>
        )}
        <TextLink to={buildPath(routes.flow.execution, { executionId: approval.executionId })}>Execution</TextLink>
        <TextLink to={buildPath(routes.control.trace, { traceId: approval.traceId })}>Trace</TextLink>
      </div>

      {pending ? (
        <div className="grid gap-3">
          {!allowed && (
            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  You don't hold <code className="font-mono text-xs">{approval.permission}</code>, so the platform will deny and audit this
                  decision. Switch to Ruwan Jayasinghe (Procurement Manager) from the account menu to approve it.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          <TextField aria-label="Comment" value={comment} onChange={setComment} className="w-full">
            <Input variant="secondary" placeholder="Comment (optional)" />
          </TextField>
          <div className="flex gap-2">
            <Button isPending={decide.isPending} onPress={() => submit("approved")}>
              <Check className="size-4" aria-hidden />
              Approve
            </Button>
            <Button variant="secondary" isDisabled={decide.isPending} onPress={() => submit("rejected")}>
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
    </Card>
  );
}
