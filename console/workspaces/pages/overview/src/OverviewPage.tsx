import { Tag } from "@carbon/react";
import { TokenUsageChart } from "@workspacenow/ai";
import { useAuthHooks } from "@workspacenow/auth";
import { useSession } from "@workspacenow/api-client";
import { EntryPointOutcomesChart, HealthChart } from "@workspacenow/control";
import { globalConfig } from "@workspacenow/types";
import { PageLayout } from "@workspacenow/views";
import { ActivityChart } from "./subComponents/ActivityChart";
import { LogMetricsChart } from "./subComponents/LogMetricsChart";
import { AppsSection } from "./subComponents/AppsSection";
import { NeedsAttentionCard } from "./subComponents/NeedsAttentionCard";

export function OverviewPage() {
  const { userInfo } = useAuthHooks();
  const session = useSession();

  return (
    <PageLayout
      title={globalConfig.organizationName}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <span>Signed in as {userInfo?.name ?? ""}</span>
          {session.data?.roles.map((role) => (
            <Tag key={role} size="sm" type="blue">
              {role}
            </Tag>
          ))}
        </span>
      }
    >
      <div className="grid gap-6">
        <AppsSection />

        <div className="grid items-start gap-6 xl:grid-cols-[3fr_2fr]">
          <NeedsAttentionCard />
          <HealthChart />
        </div>

        <ActivityChart />

        <div className="grid items-start gap-6 xl:grid-cols-2">
          <EntryPointOutcomesChart />
          <TokenUsageChart />
        </div>

        <LogMetricsChart />

      </div>
    </PageLayout>
  );
}
