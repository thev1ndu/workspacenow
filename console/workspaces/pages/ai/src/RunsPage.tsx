import { useListAgentRuns, useListAgents } from "@workspacenow/api-client";
import { PageLayout, QueryState, SectionCard } from "@workspacenow/views";
import { RunsTable } from "./subComponents/RunsTable";

export function RunsPage() {
  const runs = useListAgentRuns();
  const agents = useListAgents();
  return (
    <PageLayout title="Agent runs" description="Every agent execution, manual or started by a workflow.">
      <SectionCard flush>
        <QueryState query={runs}>{(data) => <RunsTable runs={data.items} agents={agents.data?.items} />}</QueryState>
      </SectionCard>
    </PageLayout>
  );
}
