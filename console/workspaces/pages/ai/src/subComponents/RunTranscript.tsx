import { Accordion, AccordionItem } from "@carbon/react";
import { Comment, Wrench } from "@workspacenow/icons";
import { buildPath, routes, type AgentRun, type ToolCall } from "@workspacenow/types";
import { JsonView, LinkButton, StatusChip, formatDateTime, formatNumber } from "@workspacenow/views";

function ToolCallCard({ call }: { call: ToolCall }) {
  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-separator bg-surface p-4 ${call.outcome === "denied" ? "ring-1 ring-danger/40" : ""}`}>
      <div className="flex items-center gap-2">
        <Wrench className="size-3.5 text-muted" aria-hidden />
        <span className="flex-1 font-mono text-sm font-medium">{call.tool}</span>
        <StatusChip status={call.outcome === "error" ? "failed" : call.outcome} label={call.outcome === "error" ? "Error" : undefined} />
      </div>
      <div>
        <p className="mb-1.5 text-xs text-muted">Input</p>
        <JsonView value={call.input} />
      </div>
      {call.reason && <p className={`text-sm ${call.outcome === "denied" ? "text-danger" : "text-warning"}`}>{call.reason}</p>}
      {call.output !== undefined && (
        <Accordion>
          <AccordionItem title="Output">
            <div className="pt-2">
              <JsonView value={call.output} />
            </div>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

/** One agent run: reasoning, every tool call and the platform's decision on it, and the answer. */
export function RunTranscript({ run, agentName }: { run: AgentRun; agentName?: string }) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={run.status} />
        <span className="text-sm text-muted">
          {agentName ? `${agentName} · ` : ""}
          {run.trigger === "workflow" ? "Workflow" : "Manual"} · {formatDateTime(run.startedAt)} · {(run.durationMs / 1000).toFixed(1)} s ·{" "}
          {formatNumber(run.tokens)} tokens
        </span>
        <span className="flex-1" />
        <LinkButton size="sm" variant="ghost" href={buildPath(routes.control.trace, { traceId: run.traceId })}>
          View trace
        </LinkButton>
      </div>
      <div className="rounded-xl bg-surface-secondary px-4 py-3 text-sm">
        <span className="font-medium">Prompt</span> <span className="text-muted">·</span> {run.prompt}
      </div>
      {run.steps.map((step, index) =>
        step.kind === "thought" ? (
          <p key={index} className="pl-1 text-sm text-muted italic">
            {step.text}
          </p>
        ) : (
          <ToolCallCard key={index} call={step.call} />
        ),
      )}
      <div className="flex gap-3 rounded-xl border border-separator bg-surface px-4 py-3">
        <Comment className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
        <p className="text-sm">{run.answer}</p>
      </div>
    </div>
  );
}
