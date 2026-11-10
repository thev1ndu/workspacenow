import { Bot, CheckmarkFilled, CircleDash, Document, ErrorFilled, History, Time } from "@carbon/react/icons";
import { Column, Grid, StructuredListBody, StructuredListCell, StructuredListRow, StructuredListWrapper, Stack } from "@carbon/react";

import { useParams } from "react-router-dom";
import { useGetExecution, useGetWorkflow } from "@workspacenow/api-client";
import { buildPath, routes, type StepStatus } from "@workspacenow/types";
import { DetailList, JsonView, LinkButton, PageLayout, QueryState, SectionCard, StatusChip, TextLink, formatDateTime } from "@workspacenow/views";
import { WorkflowGraph } from "./subComponents/WorkflowGraph";
import { formatDuration } from "./utils";

import flowStyles from "./Flow.module.scss";
import styles from "./ExecutionDetailPage.module.scss";

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "completed") return <CheckmarkFilled className={`${styles.icon} ${styles.done}`} size={16} aria-hidden />;
  if (status === "failed") return <ErrorFilled className={`${styles.icon} ${styles.failed}`} size={16} aria-hidden />;
  if (status === "waiting" || status === "running") return <Time className={`${styles.icon} ${styles.active}`} size={16} aria-hidden />;
  return <CircleDash className={`${styles.icon} ${styles.idle}`} size={16} aria-hidden />;
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
              <LinkButton size="sm" variant="secondary" href={buildPath(routes.ai.run, { runId: agentRunId })} renderIcon={Bot}>
                Agent run
              </LinkButton>
            )}
            {purchaseRequestId && (
              <LinkButton size="sm" variant="secondary" href={buildPath(routes.data.records, { entityName: "PurchaseRequest" })} renderIcon={Document}>
                Purchase request {purchaseRequestId}
              </LinkButton>
            )}
            <LinkButton size="sm" variant="primary" href={buildPath(routes.control.trace, { traceId: exec.traceId })} renderIcon={History}>
              Trace
            </LinkButton>
          </>
        )
      }
    >
      <QueryState query={execution}>
        {(data) => (
          <Grid narrow className={flowStyles.grid}>
            {workflow.data && (
              <Column sm={4} md={8} lg={16}>
                <SectionCard title="Path" subtitle="The steps this run took; greyed steps were on branches it did not take">
                  <WorkflowGraph definition={workflow.data} statuses={new Map(data.steps.map((s) => [s.stepId, s.status]))} height={420} />
                </SectionCard>
              </Column>
            )}
            <Column sm={4} md={8} lg={10}>
              <SectionCard title="Steps" flush>
                <StructuredListWrapper isCondensed aria-label="Execution steps">
                  <StructuredListBody>
                    {data.steps.map((state) => {
                      const step = workflow.data?.steps.find((s) => s.id === state.stepId);
                      return (
                        <StructuredListRow key={state.stepId}>
                          <StructuredListCell>
                            <div className={styles.step}>
                              <StepIcon status={state.status} />
                              <div className={styles.stepBody}>
                                <span className={styles.name}>
                                  {step?.name ?? state.stepId}
                                  <StatusChip status={state.status} />
                                </span>
                                <span className={styles.timing}>
                                  {state.startedAt ? `Started ${formatDateTime(state.startedAt)}` : "Not started"}
                                  {state.endedAt ? ` · took ${formatDuration(state.startedAt, state.endedAt)}` : ""}
                                </span>
                                {state.detail && <span className={styles.detail}>{state.detail}</span>}
                                {state.status === "waiting" && (
                                  <div className={styles.action}>
                                    <LinkButton size="sm" variant="secondary" href={routes.flow.approvals}>
                                      Open approvals
                                    </LinkButton>
                                  </div>
                                )}
                              </div>
                            </div>
                          </StructuredListCell>
                        </StructuredListRow>
                      );
                    })}
                  </StructuredListBody>
                </StructuredListWrapper>
              </SectionCard>
            </Column>
            <Column sm={4} md={8} lg={6}>
              <Stack gap={5}>
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
                      { label: "Trace", value: <code className={styles.code}>{data.traceId}</code> },
                      { label: "Started", value: formatDateTime(data.startedAt) },
                      { label: "Ended", value: formatDateTime(data.endedAt) },
                      { label: "Duration", value: data.endedAt ? formatDuration(data.startedAt, data.endedAt) : "In progress" },
                    ]}
                  />
                </SectionCard>
                <SectionCard title="Context" subtitle="Durable state carried between steps">
                  <JsonView value={data.context} />
                </SectionCard>
              </Stack>
            </Column>
          </Grid>
        )}
      </QueryState>
    </PageLayout>
  );
}
