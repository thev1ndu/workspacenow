import { useListExecutions } from "@workspacenow/api-client";
import { PageLayout, QueryState } from "@workspacenow/views";
import { ExecutionsTable } from "./subComponents/ExecutionsTable";

export function ExecutionsPage() {
  const executions = useListExecutions();
  return (
    <PageLayout title="Executions" description="Every workflow run, newest first.">
      <QueryState query={executions}>{(data) => <ExecutionsTable executions={data.items} />}</QueryState>
    </PageLayout>
  );
}
