import { Tab, TabList, TabPanel, TabPanels, Tabs, Tag } from "@carbon/react";

import { useListApprovals } from "@workspacenow/api-client";
import { PageLayout, QueryState } from "@workspacenow/views";
import { ApprovalsTable } from "./subComponents/ApprovalsTable";

export function ApprovalsPage() {
  const approvals = useListApprovals();
  const pendingCount = approvals.data?.items.filter((a) => a.status === "pending").length ?? 0;

  return (
    <PageLayout title="Approvals" description="Human decisions that workflows are waiting on. Each decision runs as the deciding user.">
      <Tabs>
        <TabList aria-label="Approval status">
          <Tab>
            Pending{" "}
            <Tag size="sm" type={pendingCount > 0 ? "warm-gray" : "gray"}>
              {pendingCount}
            </Tag>
          </Tab>
          <Tab>Decided</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <QueryState query={approvals}>{(data) => <ApprovalsTable approvals={data.items} filter="pending" />}</QueryState>
          </TabPanel>
          <TabPanel>
            <QueryState query={approvals}>{(data) => <ApprovalsTable approvals={data.items} filter="decided" />}</QueryState>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </PageLayout>
  );
}
