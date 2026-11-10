import { Column, Grid, Stack, Tag } from "@carbon/react";
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

import styles from "./OverviewPage.module.scss";

export function OverviewPage() {
  const { userInfo } = useAuthHooks();
  const session = useSession();

  return (
    <PageLayout
      title={globalConfig.organizationName}
      description={
        <Stack orientation="horizontal" gap={3}>
          <span>Signed in as {userInfo?.name ?? ""}</span>
          {session.data?.roles.map((role) => (
            <Tag key={role} size="sm" type="blue">
              {role}
            </Tag>
          ))}
        </Stack>
      }
    >
      <Grid className={styles.grid} narrow>
        <Column sm={4} md={8} lg={16}>
          <AppsSection />
        </Column>

        <Column sm={4} md={8} lg={10}>
          <NeedsAttentionCard />
        </Column>
        <Column sm={4} md={8} lg={6}>
          <HealthChart />
        </Column>

        <Column sm={4} md={8} lg={16}>
          <ActivityChart />
        </Column>

        <Column sm={4} md={8} lg={8}>
          <EntryPointOutcomesChart />
        </Column>
        <Column sm={4} md={8} lg={8}>
          <TokenUsageChart />
        </Column>

        <Column sm={4} md={8} lg={16}>
          <LogMetricsChart />
        </Column>
      </Grid>
    </PageLayout>
  );
}
