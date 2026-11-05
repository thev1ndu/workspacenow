import { Tabs } from "@heroui/react";
import { ArrowUpRightFromSquare, Pencil } from "@workspacenow/icons";
import { useParams } from "react-router-dom";
import { useCan, useGetApplication } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, PageLayout, QueryState } from "@workspacenow/views";
import { AppApisTab, AppDataTab, AppOverviewTab, AppWorkflowsTab } from "./subComponents/ApplicationTabs";
import { PinButton } from "./apps/PinButton";
import { DeploymentsTab, ReleasesTab } from "./subComponents/ReleaseTabs";

const TABS = ["Overview", "Data", "APIs", "Workflows", "Releases", "Deployments"] as const;

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
              <LinkButton variant="secondary" href={buildPath(routes.studio.applicationEdit, { appId: application.data.id })}>
                <Pencil className="size-4" aria-hidden />
                Edit
              </LinkButton>
            )}
            <LinkButton variant="primary" href={buildPath(routes.app, { appId: application.data.id })}>
              <ArrowUpRightFromSquare className="size-4" aria-hidden />
              Open app
            </LinkButton>
          </>
        )
      }
    >
      <QueryState query={application}>
        {(app) => (
          <Tabs variant="secondary" align="start" defaultSelectedKey="Overview">
            <Tabs.ListContainer className="mb-6 overflow-x-auto">
              <Tabs.List aria-label="Application sections">
                {TABS.map((t) => (
                  <Tabs.Tab key={t} id={t}>
                    {t}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel className="mt-0" id="Overview">
              <AppOverviewTab app={app} />
            </Tabs.Panel>
            <Tabs.Panel className="mt-0" id="Data">
              <AppDataTab app={app} />
            </Tabs.Panel>
            <Tabs.Panel className="mt-0" id="APIs">
              <AppApisTab app={app} />
            </Tabs.Panel>
            <Tabs.Panel className="mt-0" id="Workflows">
              <AppWorkflowsTab app={app} />
            </Tabs.Panel>
            <Tabs.Panel className="mt-0" id="Releases">
              <ReleasesTab app={app} />
            </Tabs.Panel>
            <Tabs.Panel className="mt-0" id="Deployments">
              <DeploymentsTab app={app} />
            </Tabs.Panel>
          </Tabs>
        )}
      </QueryState>
    </PageLayout>
  );
}
