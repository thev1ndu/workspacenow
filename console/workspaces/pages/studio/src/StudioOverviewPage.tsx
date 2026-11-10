import { CircleDash, OverflowMenuHorizontal, Rocket } from "@carbon/react/icons";
import { Column, ContainedList, ContainedListItem, Grid, Stack } from "@carbon/react";
import { useNavigate } from "react-router-dom";

import { useListApplications } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, Metric, MetricGrid, PageLayout, QueryState, SectionCard, StatusChip, formatRelative, MetricGridSkeleton, SectionCardSkeleton, ListSkeleton, DetailSkeleton } from "@workspacenow/views";
import { useDepartmentName } from "./subComponents/useDepartmentName";
import { AppIcon } from "./apps/AppIcon";
import shared from "./shared.module.scss";
import styles from "./StudioOverviewPage.module.scss";

export function StudioOverviewPage() {
  const applications = useListApplications();
  const departmentName = useDepartmentName();
  const navigate = useNavigate();

  return (
    <PageLayout
      title="Studio"
      description="Design, preview and release business applications composed from shared entities."
      actions={
        <LinkButton variant="primary" href={routes.studio.builder}>
          New application
        </LinkButton>
      }
    >
      <QueryState query={applications} skeleton={
        <Stack gap={6}>
          <MetricGridSkeleton columns={3} />
          <Grid narrow withRowGap>
            <Column sm={4} md={8} lg={10}>
              <SectionCardSkeleton flush>
                <ListSkeleton rows={4} />
              </SectionCardSkeleton>
            </Column>
            <Column sm={4} md={8} lg={6}>
              <SectionCardSkeleton>
                <DetailSkeleton items={3} columns={1} />
              </SectionCardSkeleton>
            </Column>
          </Grid>
        </Stack>
      }>
        {(data) => {
          const recent = [...data.items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
          return (
            <Stack gap={6}>
              <MetricGrid columns={3}>
                <Metric label="Applications" value={data.total} icon={<OverflowMenuHorizontal />} />
                <Metric label="Released" value={data.items.filter((a) => a.lifecycle === "released").length} icon={<Rocket />} />
                <Metric label="In draft" value={data.items.filter((a) => a.lifecycle === "draft").length} icon={<CircleDash />} />
              </MetricGrid>
              <Grid narrow withRowGap>
                <Column sm={4} md={8} lg={10}>
                  <SectionCard
                    title="Recently updated"
                    actions={
                      <LinkButton size="sm" variant="ghost" href={routes.studio.applications}>
                        All applications
                      </LinkButton>
                    }
                    flush
                  >
                    <ContainedList aria-label="Recently updated applications">
                      {recent.map((app) => (
                        <ContainedListItem key={app.id} onClick={() => navigate(buildPath(routes.studio.application, { appId: app.id }))}>
                          <div className={styles.app}>
                            <AppIcon app={app} />
                            <span className={styles.appText}>
                              <span className={styles.appName}>{app.name}</span>
                              <span className={styles.appMeta}>
                                {departmentName(app.ownerDepartmentId)} · v{app.version} · updated {formatRelative(app.updatedAt)}
                              </span>
                            </span>
                            <StatusChip status={app.lifecycle} />
                          </div>
                        </ContainedListItem>
                      ))}
                    </ContainedList>
                  </SectionCard>
                </Column>
                <Column sm={4} md={8} lg={6}>
                  <SectionCard title="Describe it, review it, ship it">
                    <Stack gap={5}>
                      <p className={shared.body}>
                        Tell the Application Architect agent what you need in plain language. It proposes entities, pages, API operations and
                        workflows as a plan. Nothing changes until you approve it, and the result is a versioned Application Blueprint you can
                        keep editing.
                      </p>
                      <div>
                        <LinkButton variant="secondary" href={routes.studio.builder}>
                          Open the application builder
                        </LinkButton>
                      </div>
                    </Stack>
                  </SectionCard>
                </Column>
              </Grid>
            </Stack>
          );
        }}
      </QueryState>
    </PageLayout>
  );
}
