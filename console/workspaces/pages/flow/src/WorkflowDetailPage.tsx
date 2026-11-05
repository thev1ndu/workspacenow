import { Button, Chip } from "@heroui/react";
import { Pause, Pencil, Play } from "@workspacenow/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useCan, useGetWorkflow, useListApplications, useListExecutions, useStartWorkflow, useUpdateWorkflow } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { DetailList, LinkButton, PageLayout, QueryState, SectionCard, StatusChip } from "@workspacenow/views";
import { ExecutionsTable } from "./subComponents/ExecutionsTable";
import { WorkflowGraph } from "./subComponents/WorkflowGraph";
import { describeTrigger } from "./utils";

export function WorkflowDetailPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const workflow = useGetWorkflow({ workflowId });
  const executions = useListExecutions({ workflowId });
  const { data: applications } = useListApplications();
  const updateWorkflow = useUpdateWorkflow();
  const startWorkflow = useStartWorkflow();
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
              <LinkButton variant="secondary" href={buildPath(routes.flow.workflowEdit, { workflowId: wf.id })}>
                <Pencil className="size-4" aria-hidden />
                Edit flow
              </LinkButton>
            )}
            {wf.trigger.kind === "manual" && (
              <Button
                isDisabled={wf.status !== "active"}
                isPending={startWorkflow.isPending}
                onPress={() =>
                  startWorkflow.mutate(
                    { workflowId: wf.id, input: {} },
                    { onSuccess: (execution) => navigate(buildPath(routes.flow.execution, { executionId: execution.id })) },
                  )
                }
              >
                <Play className="size-4" aria-hidden />
                Run now
              </Button>
            )}
            <Button
              variant="secondary"
              isPending={updateWorkflow.isPending}
              onPress={() => updateWorkflow.mutate({ workflowId: wf.id, status: wf.status === "active" ? "paused" : "active" })}
            >
              {wf.status === "active" ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              {wf.status === "active" ? "Pause" : "Resume"}
            </Button>
          </>
        )
      }
    >
      <QueryState query={workflow}>
        {(data) => (
          <div className="grid gap-6">
            <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
              <SectionCard title="Flow" subtitle="What starts the workflow and every path it can take">
                <WorkflowGraph definition={data} />
              </SectionCard>
              <div className="grid gap-6">
                <SectionCard title="Details">
                  <DetailList
                    items={[
                      { label: "Status", value: <StatusChip status={data.status} /> },
                      { label: "Version", value: `v${data.version}` },
                      { label: "Trigger", value: describeTrigger(data.trigger) },
                      {
                        label: "Application",
                        value: applications?.items.find((a) => a.id === data.applicationId)?.name ?? "—",
                      },
                    ]}
                  />
                </SectionCard>
                <SectionCard title="Service identity" subtitle="Steps run with only these permissions, never the caller's.">
                  <div className="flex flex-wrap gap-1.5">
                    {data.permissions.map((p) => (
                      <Chip key={p} size="sm" variant="secondary">
                        <span className="font-mono">{p}</span>
                      </Chip>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </div>
            <SectionCard title="Execution history" flush>
              <QueryState query={executions}>{(list) => <ExecutionsTable executions={list.items} hideWorkflow />}</QueryState>
            </SectionCard>
          </div>
        )}
      </QueryState>
    </PageLayout>
  );
}
