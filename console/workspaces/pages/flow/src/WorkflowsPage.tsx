import { Add } from "@carbon/react/icons";

import { useCan, useListWorkflows } from "@workspacenow/api-client";
import { buildPath, routes, type Workflow } from "@workspacenow/types";
import { LinkButton, PageLayout, QueryState, StatusChip, TextLink } from "@workspacenow/views";
import { PagedTable, type PagedTableColumn } from "./subComponents/PagedTable";
import { TriggerLabel } from "./subComponents/TriggerLabel";

import styles from "./Flow.module.scss";

const columns: PagedTableColumn<Workflow>[] = [
  {
    key: "name",
    header: "Name",
    render: (w) => (
      <div className={styles.cellStack}>
        <TextLink to={buildPath(routes.flow.workflow, { workflowId: w.id })}>{w.name}</TextLink>
        <span className={styles.cellHelper}>{w.description}</span>
      </div>
    ),
  },
  { key: "trigger", header: "Trigger", render: (w) => <TriggerLabel trigger={w.trigger} /> },
  { key: "steps", header: "Steps", render: (w) => w.steps.length },
  { key: "status", header: "Status", render: (w) => <StatusChip status={w.status} /> },
  { key: "version", header: "Version", render: (w) => `v${w.version}` },
];

export function WorkflowsPage() {
  const workflows = useListWorkflows();
  const canDesign = useCan("flow.manage");
  return (
    <PageLayout
      title="Workflows"
      description="Business processes and the events, schedules or people that start them."
      actions={
        canDesign && (
          <LinkButton variant="primary" href={routes.flow.workflowNew} renderIcon={Add}>
            New workflow
          </LinkButton>
        )
      }
    >
      <QueryState query={workflows}>
        {(data) => (
          <PagedTable
            label="Workflows"
            items={data.items}
            columns={columns}
            searchText={(w) => `${w.name} ${w.description} ${w.status} ${w.trigger.kind}`}
            searchPlaceholder="Search workflows"
            emptyMessage="No workflows yet."
          />
        )}
      </QueryState>
    </PageLayout>
  );
}
