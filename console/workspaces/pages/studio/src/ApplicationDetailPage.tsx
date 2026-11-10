import { ArrowUpRight, Edit } from "@carbon/react/icons";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";

import { useParams } from "react-router-dom";
import { useCan, useGetApplication } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, PageLayout, QueryState } from "@workspacenow/views";
import { AppApisTab, AppDataTab, AppOverviewTab, AppWorkflowsTab } from "./subComponents/ApplicationTabs";
import { PinButton } from "./apps/PinButton";
import shared from "./shared.module.scss";
import { DeploymentsTab, ReleasesTab } from "./subComponents/ReleaseTabs";
import { BuilderTools } from "./subComponents/BuilderTools";

const TABS = ["Overview", "Build", "Data", "APIs", "Workflows", "Releases", "Deployments"] as const;

export function ApplicationDetailPage() {
  const { appId } = useParams();
  const application = useGetApplication({ appId });
  const canBuild = useCan("studio.manage");

  return (
    <PageLayout
      title={application.data?.name ?? "Application"}
      description={application.data?.description}
      backHref={routes.studio.applications}
      backLabel="Applications"
      isLoading={application.isLoading}
      actions={
        application.data && (
          <>
            <PinButton app={application.data} variant="secondary" />
            {canBuild && (
              <LinkButton variant="secondary" href={buildPath(routes.studio.applicationEdit, { appId: application.data.id })} renderIcon={Edit}>
                Edit
              </LinkButton>
            )}
            <LinkButton variant="primary" href={buildPath(routes.app, { appId: application.data.id })} renderIcon={ArrowUpRight}>
              Open app
            </LinkButton>
          </>
        )
      }
    >
      <QueryState query={application}>
        {(app) => (
          <Tabs defaultSelectedIndex={0}>
            <TabList aria-label="Application sections">
              {TABS.map((t) => (
                <Tab key={t}>{t}</Tab>
              ))}
            </TabList>
            <TabPanels>
              <TabPanel className={shared.panel}>
                <AppOverviewTab app={app} />
              </TabPanel>
              <TabPanel className={shared.panel}>
                <BuilderTools app={app} />
              </TabPanel>
              <TabPanel className={shared.panel}>
                <AppDataTab app={app} />
              </TabPanel>
              <TabPanel className={shared.panel}>
                <AppApisTab app={app} />
              </TabPanel>
              <TabPanel className={shared.panel}>
                <AppWorkflowsTab app={app} />
              </TabPanel>
              <TabPanel className={shared.panel}>
                <ReleasesTab app={app} />
              </TabPanel>
              <TabPanel className={shared.panel}>
                <DeploymentsTab app={app} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}
      </QueryState>
    </PageLayout>
  );
}
