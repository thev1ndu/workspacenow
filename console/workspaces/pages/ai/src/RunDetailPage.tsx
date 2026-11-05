import { useParams } from "react-router-dom";
import { useGetAgent, useGetAgentRun } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { PageLayout, QueryState, SectionCard } from "@workspacenow/views";
import { RunTranscript } from "./subComponents/RunTranscript";

export function RunDetailPage() {
  const { runId } = useParams();
  const run = useGetAgentRun({ runId });
  const agent = useGetAgent({ agentId: run.data?.agentId });
  return (
    <PageLayout
      title={`Run ${runId ?? ""}`}
      description={agent.data ? `${agent.data.name}` : undefined}
      backHref={routes.ai.runs}
      backLabel="Agent runs"
      isLoading={run.isLoading}
    >
      <QueryState query={run}>
        {(data) => (
          <SectionCard>
            <RunTranscript run={data} agentName={agent.data?.name} />
          </SectionCard>
        )}
      </QueryState>
    </PageLayout>
  );
}
