import { Tabs } from "@heroui/react";
import { useParams } from "react-router-dom";
import { useGetAgent, useListAgentRuns } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { PageLayout, QueryState, SectionCard, StatusChip } from "@workspacenow/views";
import { AgentAccess } from "./subComponents/AgentAccess";
import { AgentConfiguration } from "./subComponents/AgentConfiguration";
import { AgentPlayground } from "./subComponents/AgentPlayground";
import { RunsTable } from "./subComponents/RunsTable";

export function AgentDetailPage() {
  const { agentId } = useParams();
  const agent = useGetAgent({ agentId });
  const runs = useListAgentRuns({ agentId });

  return (
    <PageLayout
      title={agent.data?.name ?? "Agent"}
      description={agent.data?.description}
      backHref={routes.ai.agents}
      backLabel="Agents"
      isLoading={agent.isLoading}
      actions={agent.data && <StatusChip status={agent.data.status} />}
    >
      <QueryState query={agent}>
        {(data) => (
          <Tabs variant="secondary" defaultSelectedKey="playground">
            <Tabs.ListContainer>
              <Tabs.List aria-label="Agent sections">
                <Tabs.Tab id="playground">
                  Playground
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="configuration">
                  Configuration
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="access">
                  Tools and permissions
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="runs">
                  Runs{runs.data ? ` (${runs.data.total})` : ""}
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="playground" className="pt-6">
              <AgentPlayground agent={data} />
            </Tabs.Panel>
            {/* Keyed by version so a saved change resets the form to the stored agent. */}
            <Tabs.Panel id="configuration" className="pt-6">
              <AgentConfiguration key={data.version} agent={data} />
            </Tabs.Panel>
            <Tabs.Panel id="access" className="pt-6">
              <AgentAccess key={data.version} agent={data} />
            </Tabs.Panel>
            <Tabs.Panel id="runs" className="pt-6">
              <SectionCard flush>
                <QueryState query={runs}>{(r) => <RunsTable runs={r.items} showAgent={false} />}</QueryState>
              </SectionCard>
            </Tabs.Panel>
          </Tabs>
        )}
      </QueryState>
    </PageLayout>
  );
}
