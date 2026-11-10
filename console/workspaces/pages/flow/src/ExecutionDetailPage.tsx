import { CheckmarkFilled, CircleDash, ErrorFilled, Time, Bot, Document, History } from "@carbon/react/icons";

import { useParams } from "react-router-dom";
import { useGetExecution, useGetWorkflow } from "@workspacenow/api-client";
import { buildPath, routes, type StepStatus } from "@workspacenow/types";
import { DetailList, JsonView, LinkButton, PageLayout, QueryState, SectionCard, StatusChip, TextLink, formatDateTime } from "@workspacenow/views";
import { WorkflowGraph } from "./subComponents/WorkflowGraph";
import { formatDuration } from "./utils";

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "completed") return <CheckmarkFilled className="size-4 text-foreground" aria-hidden />;
  if (status === "failed") return <ErrorFilled className="size-4 text-danger" aria-hidden />;
  if (status === "waiting" || status === "running") return <Time className="size-4 text-warning" aria-hidden />;
  return <CircleDash className="size-4 text-muted" aria-hidden />;
}

export function ExecutionDetailPage() {
  const { executionId } = useParams();
  const execution = useGetExecution({ executionId });
  const workflow = useGetWorkflow({ workflowId: execution.data?.workflowId });

  const exec = execution.data;
  const agentRunId = typeof exec?.context.agentRunId === "string" ? exec.context.agentRunId : undefined;
  const purchaseRequestId = typeof exec?.context.purchaseRequestId === "string" ? exec.context.purchaseRequestId : undefined;

  return (
    <PageLayout
      title={`Execution ${executionId ?? ""}`}
      description={workflow.data?.name}
      backHref={routes.flow.executions}
      backLabel="Executions"
      isLoading={execution.isLoading}
      actions={
        exec && (
          <>
            {agentRunId && (
              <LinkButton size="sm" variant="secondary" href={buildPath(routes.ai.run, { runId: agentRunId })}>
                <Bot className="size-4" aria-hidden />
                Agent run
              </LinkButton>
            )}
            {purchaseRequestId && (
              <LinkButton size="sm" variant="secondary" href={buildPath(routes.data.records, { entityName: "PurchaseRequest" })}>
                <Document className="size-4" aria-hidden />
                Purchase request {purchaseRequestId}
              </LinkButton>
            )}
            <LinkButton size="sm" variant="primary" href={buildPath(routes.control.trace, { traceId: exec.traceId })}>
              <History className="size-4" aria-hidden />
              Trace
            </LinkButton>
          </>
        )
      }
    >
      <QueryState query={execution}>
        {(data) => (
          <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
            {workflow.data && (
              <SectionCard title="Path" subtitle="The steps this run took; greyed steps were on branches it did not take" className="lg:col-span-2">
                <WorkflowGraph definition={workflow.data} statuses={new Map(data.steps.map((s) => [s.stepId, s.status]))} height={420} />
              </SectionCard>
            )}
            <SectionCard title="Steps">
              <ol className="relative grid gap-5 border-l border-separator pl-5">
                {data.steps.map((state) => {
                  const step = workflow.data?.steps.find((s) => s.id === state.stepId);
                  return (
                    <li key={state.stepId} className="relative">
                      <span className="absolute top-0.5 -left-[29px] flex size-4 items-center justify-center rounded-full bg-surface">
                        <StepIcon status={state.status} />
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{step?.name ?? state.stepId}</span>
                        <StatusChip status={state.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {state.startedAt ? `Started ${formatDateTime(state.startedAt)}` : "Not started"}
                        {state.endedAt ? ` · took ${formatDuration(state.startedAt, state.endedAt)}` : ""}
                      </p>
                      {state.detail && <p className="mt-1 text-sm text-foreground">{state.detail}</p>}
                      {state.status === "waiting" && (
                        <LinkButton size="sm" variant="secondary" href={routes.flow.approvals} className="mt-2">
                          Open approvals
                        </LinkButton>
                      )}
                    </li>
                  );
                })}
              </ol>
            </SectionCard>
            <div className="grid gap-6">
              <SectionCard title="Details">
                <DetailList
                  items={[
                    { label: "Status", value: <StatusChip status={data.status} /> },
                    {
                      label: "Workflow",
                      value: (
                        <TextLink to={buildPath(routes.flow.workflow, { workflowId: data.workflowId })}>
                          {workflow.data?.name ?? data.workflowId}
                        </TextLink>
                      ),
                    },
                    { label: "Trace", value: <code className="font-mono text-[13px]">{data.traceId}</code> },
                    { label: "Started", value: formatDateTime(data.startedAt) },
                    { label: "Ended", value: formatDateTime(data.endedAt) },
                    { label: "Duration", value: data.endedAt ? formatDuration(data.startedAt, data.endedAt) : "In progress" },
                  ]}
                />
              </SectionCard>
              <SectionCard title="Context" subtitle="Durable state carried between steps">
                <JsonView value={data.context} />
              </SectionCard>
            </div>
          </div>
        )}
      </QueryState>
    </PageLayout>
  );
}
