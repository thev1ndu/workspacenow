import { Fragment } from "react";
import { Link, Separator } from "@heroui/react";
import { ChevronRight, CircleDashed, DotsNine, Rocket } from "@workspacenow/icons";
import { useListApplications } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, Metric, MetricGrid, PageLayout, QueryState, SectionCard, StatusChip, formatRelative, MetricGridSkeleton, SectionCardSkeleton, ListSkeleton, DetailSkeleton } from "@workspacenow/views";
import { useDepartmentName } from "./subComponents/useDepartmentName";
import { AppIcon } from "./apps/AppIcon";

export function StudioOverviewPage() {
  const applications = useListApplications();
  const departmentName = useDepartmentName();

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
        <div className="grid gap-6">
          <MetricGridSkeleton columns={3} />
          <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
            <SectionCardSkeleton flush>
              <ListSkeleton rows={4} />
            </SectionCardSkeleton>
            <SectionCardSkeleton>
              <DetailSkeleton items={3} columns={1} />
            </SectionCardSkeleton>
          </div>
        </div>
      }>
        {(data) => {
          const recent = [...data.items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
          return (
            <div className="grid gap-6">
              <MetricGrid columns={3}>
                <Metric label="Applications" value={data.total} icon={<DotsNine />} />
                <Metric label="Released" value={data.items.filter((a) => a.lifecycle === "released").length} icon={<Rocket />} />
                <Metric label="In draft" value={data.items.filter((a) => a.lifecycle === "draft").length} icon={<CircleDashed />} />
              </MetricGrid>
              <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
                <SectionCard
                  title="Recently updated"
                  actions={
                    <LinkButton size="sm" variant="ghost" href={routes.studio.applications}>
                      All applications
                    </LinkButton>
                  }
                  flush
                >
                  <ul>
                    {recent.map((app, i) => (
                      <Fragment key={app.id}>
                        {i > 0 && <Separator />}
                        <li>
                          <Link
                            href={buildPath(routes.studio.application, { appId: app.id })}
                            className="group flex w-full items-center gap-3 px-5 py-3 no-underline transition-colors hover:bg-surface-secondary"
                          >
                            <AppIcon app={app} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-foreground">{app.name}</span>
                              <span className="block text-xs text-muted">
                                {departmentName(app.ownerDepartmentId)} · v{app.version} · updated {formatRelative(app.updatedAt)}
                              </span>
                            </span>
                            <StatusChip status={app.lifecycle} />
                            <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                          </Link>
                        </li>
                      </Fragment>
                    ))}
                  </ul>
                </SectionCard>
                <SectionCard title="Describe it, review it, ship it">
                  <div className="grid gap-4">
                    <p className="text-sm text-muted">
                      Tell the Application Architect agent what you need in plain language. It proposes entities, pages, API operations and
                      workflows as a plan. Nothing changes until you approve it, and the result is a versioned Application Blueprint you can
                      keep editing.
                    </p>
                    <div>
                      <LinkButton variant="secondary" href={routes.studio.builder}>
                        Open the application builder
                      </LinkButton>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          );
        }}
      </QueryState>
    </PageLayout>
  );
}
