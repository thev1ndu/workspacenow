import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";
import { useParams } from "react-router-dom";
import { useGetAgent, useListAgentRuns } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { PageLayout, QueryState, SectionCard, StatusChip } from "@workspacenow/views";
import { AgentAccess } from "./subComponents/AgentAccess";
import { AgentConfiguration } from "./subComponents/AgentConfiguration";
import { AgentPlayground } from "./subComponents/AgentPlayground";
import { RunsTable } from "./subComponents/RunsTable";

import styles from "./AgentDetailPage.module.scss";

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
          <Tabs defaultSelectedIndex={0}>
            <TabList aria-label="Agent sections">
              <Tab>Playground</Tab>
              <Tab>Configuration</Tab>
              <Tab>Tools and permissions</Tab>
              <Tab>Runs{runs.data ? ` (${runs.data.total})` : ""}</Tab>
            </TabList>
            <TabPanels>
              <TabPanel className={styles.panel}>
                <AgentPlayground agent={data} />
              </TabPanel>
              {/* Keyed by version so a saved change resets the form to the stored agent. */}
              <TabPanel className={styles.panel}>
                <AgentConfiguration key={data.version} agent={data} />
              </TabPanel>
              <TabPanel className={styles.panel}>
                <AgentAccess key={data.version} agent={data} />
              </TabPanel>
              <TabPanel className={styles.panel}>
                <SectionCard flush>
                  <QueryState query={runs}>{(r) => <RunsTable paged runs={r.items} showAgent={false} />}</QueryState>
                </SectionCard>
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}
      </QueryState>
    </PageLayout>
  );
}
