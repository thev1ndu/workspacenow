import { Table } from "@heroui/react";
import { Plus } from "@workspacenow/icons";
import { useCan, useListWorkflows } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TextLink } from "@workspacenow/views";
import { TriggerLabel } from "./subComponents/TriggerLabel";

export function WorkflowsPage() {
  const workflows = useListWorkflows();
  const canDesign = useCan("flow.manage");
  return (
    <PageLayout
      title="Workflows"
      description="Business processes and the events, schedules or people that start them."
      actions={
        canDesign && (
          <LinkButton variant="primary" href={routes.flow.workflowNew}>
            <Plus className="size-4" aria-hidden />
            New workflow
          </LinkButton>
        )
      }
    >
      <SectionCard flush>
        <QueryState query={workflows}>
          {(data) =>
            data.items.length === 0 ? (
              <NoDataFound message="No workflows yet." />
            ) : (
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Workflows" className="min-w-[720px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Name</Table.Column>
                      <Table.Column>Trigger</Table.Column>
                      <Table.Column>Steps</Table.Column>
                      <Table.Column>Status</Table.Column>
                      <Table.Column>Version</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {data.items.map((workflow) => (
                        <Table.Row key={workflow.id} id={workflow.id}>
                          <Table.Cell>
                            <TextLink to={buildPath(routes.flow.workflow, { workflowId: workflow.id })}>{workflow.name}</TextLink>
                            <p className="mt-0.5 max-w-md text-xs text-muted">{workflow.description}</p>
                          </Table.Cell>
                          <Table.Cell>
                            <TriggerLabel trigger={workflow.trigger} />
                          </Table.Cell>
                          <Table.Cell className="tabular-nums">{workflow.steps.length}</Table.Cell>
                          <Table.Cell>
                            <StatusChip status={workflow.status} />
                          </Table.Cell>
                          <Table.Cell className="tabular-nums">v{workflow.version}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )
          }
        </QueryState>
      </SectionCard>
    </PageLayout>
  );
}
