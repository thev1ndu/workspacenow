import { Add } from "@carbon/react/icons";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";

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
            <Add className="size-4" aria-hidden />
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
              <TableContainer aria-label="Workflows">
                <Table className="min-w-[720px]">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Trigger</TableHeader>
                      <TableHeader>Steps</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Version</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((workflow) => (
                      <TableRow key={workflow.id} id={workflow.id}>
                        <TableCell>
                          <TextLink to={buildPath(routes.flow.workflow, { workflowId: workflow.id })}>{workflow.name}</TextLink>
                          <p className="mt-0.5 max-w-md text-xs text-muted">{workflow.description}</p>
                        </TableCell>
                        <TableCell>
                          <TriggerLabel trigger={workflow.trigger} />
                        </TableCell>
                        <TableCell className="tabular-nums">{workflow.steps.length}</TableCell>
                        <TableCell>
                          <StatusChip status={workflow.status} />
                        </TableCell>
                        <TableCell className="tabular-nums">v{workflow.version}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          }
        </QueryState>
      </SectionCard>
    </PageLayout>
  );
}
