import { useListExecutions } from "@workspacenow/api-client";
import { PageLayout, QueryState, SectionCard } from "@workspacenow/views";
import { ExecutionsTable } from "./subComponents/ExecutionsTable";

export function ExecutionsPage() {
  const executions = useListExecutions();
  return (
    <PageLayout title="Executions" description="Every workflow run, newest first.">
      <SectionCard flush>
        <QueryState query={executions}>{(data) => <ExecutionsTable executions={data.items} />}</QueryState>
      </SectionCard>
    </PageLayout>
  );
}
