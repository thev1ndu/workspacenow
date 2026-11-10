import { Pause, Edit, Play, Rocket } from "@carbon/react/icons";
import { Button, Column, Grid, Stack, Tag } from "@carbon/react";

import { useNavigate, useParams } from "react-router-dom";
import { useCan, useGetWorkflow, useListApplications, useListExecutions, useSimulateWorkflow, useStartWorkflow, useUpdateWorkflow } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { DetailList, LinkButton, PageLayout, QueryState, SectionCard, StatusChip } from "@workspacenow/views";
import { ExecutionsTable } from "./subComponents/ExecutionsTable";
import { WorkflowGraph } from "./subComponents/WorkflowGraph";
import { describeTrigger } from "./utils";

import styles from "./Flow.module.scss";

export function WorkflowDetailPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const workflow = useGetWorkflow({ workflowId });
  const executions = useListExecutions({ workflowId });
  const { data: applications } = useListApplications();
  const updateWorkflow = useUpdateWorkflow();
  const startWorkflow = useStartWorkflow();
  const simulate = useSimulateWorkflow();
  const canDesign = useCan("flow.manage");

  const wf = workflow.data;
  return (
    <PageLayout
      title={wf?.name ?? "Workflow"}
      description={wf?.description}
      backHref={routes.flow.workflows}
      backLabel="Workflows"
      isLoading={workflow.isLoading}
      actions={
        wf && (
          <>
            {canDesign && (
              <LinkButton variant="secondary" href={buildPath(routes.flow.workflowEdit, { workflowId: wf.id })} renderIcon={Edit}>
                Edit flow
              </LinkButton>
            )}
            {wf.trigger.kind === "manual" && (
              <Button
                renderIcon={Play}
                disabled={wf.status !== "active" || startWorkflow.isPending}
                onClick={() =>
                  startWorkflow.mutate(
                    { workflowId: wf.id, input: {} },
                    { onSuccess: (execution) => navigate(buildPath(routes.flow.execution, { executionId: execution.id })) },
                  )
                }
              >
                Run now
              </Button>
            )}
            <Button
              kind="tertiary"
              renderIcon={Rocket}
              disabled={simulate.isPending}
              onClick={() => simulate.mutate({ workflowId: wf.id, event: {} })}
            >
              Simulate
            </Button>
            <Button
              kind="secondary"
              renderIcon={wf.status === "active" ? Pause : Play}
              disabled={updateWorkflow.isPending}
              onClick={() => updateWorkflow.mutate({ workflowId: wf.id, status: wf.status === "active" ? "paused" : "active" })}
            >
              {wf.status === "active" ? "Pause" : "Resume"}
            </Button>
          </>
        )
      }
    >
      <QueryState query={workflow}>
        {(data) => (
          <Grid narrow className={styles.grid}>
            <Column sm={4} md={8} lg={10}>
              <SectionCard title="Flow" subtitle="What starts the workflow and every path it can take">
                <WorkflowGraph definition={data} />
              </SectionCard>
            </Column>
            <Column sm={4} md={8} lg={6}>
              <Stack gap={5}>
                <SectionCard title="Details">
                  <DetailList
                    items={[
                      { label: "Status", value: <StatusChip status={data.status} /> },
                      { label: "Version", value: `v${data.version}` },
                      { label: "Trigger", value: describeTrigger(data.trigger) },
                      {
                        label: "Application",
                        value: applications?.items.find((a) => a.id === data.applicationId)?.name ?? "-",
                      },
                    ]}
                  />
                </SectionCard>
                <SectionCard title="Service identity" subtitle="Steps run with only these permissions, never the caller's.">
                  <div className={styles.tags}>
                    {data.permissions.map((p) => (
                      <Tag key={p} size="sm" type="gray">
                        <span className={styles.mono}>{p}</span>
                      </Tag>
                    ))}
                  </div>
                </SectionCard>
              </Stack>
            </Column>
            {simulate.data && (
              <Column sm={4} md={8} lg={16}>
                <SectionCard title="Dry-run simulation" subtitle={simulate.data.summary}>
                  <DetailList
                    items={simulate.data.steps.map((s) => ({
                      label: s.name,
                      value: `${s.outcome}: ${s.detail}`,
                    }))}
                  />
                </SectionCard>
              </Column>
            )}
            <Column sm={4} md={8} lg={16}>
              <SectionCard title="Execution history" flush>
                <QueryState query={executions}>{(list) => <ExecutionsTable executions={list.items} hideWorkflow />}</QueryState>
              </SectionCard>
            </Column>
          </Grid>
        )}
      </QueryState>
    </PageLayout>
  );
}
