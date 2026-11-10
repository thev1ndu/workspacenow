import { useState } from "react";
import { Tab, TabList, TabPanel, TabPanels, Tabs, Tag } from "@carbon/react";
import type { Approval } from "@workspacenow/types";
import { useListApprovals } from "@workspacenow/api-client";
import { NoDataFound, PageLayout, QueryState, CardGridSkeleton, TextInput } from "@workspacenow/views";
import { ApprovalCard } from "./subComponents/ApprovalCard";

type Filter = "pending" | "decided";

function ApprovalList({ items, filter, search }: { items: Approval[]; filter: Filter; search: string }) {
  const q = search.trim().toLowerCase();
  const shown = items.filter((a) => (filter === "pending" ? a.status === "pending" : a.status !== "pending")).filter(
    (a) => !q || `${a.id} ${a.title} ${a.summary} ${a.subject?.entity ?? ""} ${a.subject?.recordId ?? ""} ${a.permission}`.toLowerCase().includes(q),
  );
  if (shown.length === 0) {
    return <NoDataFound message={filter === "pending" ? "Nothing is waiting for approval." : "No decisions yet."} />;
  }
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {shown.map((approval) => (
        <ApprovalCard key={approval.id} approval={approval} />
      ))}
    </div>
  );
}

export function ApprovalsPage() {
  const [tab, setTab] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const approvals = useListApprovals();
  const pendingCount = approvals.data?.items.filter((a) => a.status === "pending").length ?? 0;

  return (
    <PageLayout title="Approvals" description="Human decisions that workflows are waiting on. Each decision runs as the deciding user.">
      <div className="mb-5 max-w-sm">
        <TextInput label="Search approvals" value={search} onChange={setSearch} placeholder="Title, resource or requester" />
      </div>
      <div className="w-full">
      <Tabs selectedIndex={tab === "pending" ? 0 : 1} onChange={({ selectedIndex }) => setTab(selectedIndex === 0 ? "pending" : "decided")}>
        <TabList aria-label="Approval status" className="mb-5">
          <Tab>
            Pending
            <Tag size="sm" type={pendingCount > 0 ? "warm-gray" : "gray"} className="tabular-nums">
              {pendingCount}
            </Tag>
          </Tab>
          <Tab>Decided</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <QueryState query={approvals} skeleton={<CardGridSkeleton count={2} className="lg:grid-cols-2" />}>{(data) => <ApprovalList items={data.items} filter="pending" search={search} />}</QueryState>
          </TabPanel>
          <TabPanel>
            <QueryState query={approvals} skeleton={<CardGridSkeleton count={2} className="lg:grid-cols-2" />}>{(data) => <ApprovalList items={data.items} filter="decided" search={search} />}</QueryState>
          </TabPanel>
        </TabPanels>
      </Tabs>
      </div>
    </PageLayout>
  );
}
