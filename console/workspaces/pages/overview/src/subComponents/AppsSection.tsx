import { Link } from "@heroui/react";
import { useListApplications, useListDepartments } from "@workspacenow/api-client";
import { AppIcon, PinButton, usePinnedApplicationIds } from "@workspacenow/studio";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, NoDataFound, QueryState, SectionCard, StatusChip } from "@workspacenow/views";

/** Every application as a tile that opens it; the user's pinned ones come first, in pin order. */
export function AppsSection() {
  const applications = useListApplications();
  const departments = useListDepartments();
  const pinnedIds = usePinnedApplicationIds();
  const departmentName = (id: string) => departments.data?.items.find((d) => d.id === id)?.name ?? id;

  return (
    <SectionCard
      title="Apps"
      actions={
        <LinkButton size="sm" variant="ghost" href={routes.studio.applications}>
          Manage in Studio
        </LinkButton>
      }
    >
      <QueryState query={applications}>
        {(data) => {
          if (data.items.length === 0) return <NoDataFound message="No applications yet." />;
          const rank = (id: string) => (pinnedIds.includes(id) ? pinnedIds.indexOf(id) : pinnedIds.length);
          const apps = [...data.items].sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
          return (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {apps.map((app) => (
                <li
                  key={app.id}
                  className="relative flex flex-col gap-3 rounded-xl border border-separator bg-surface p-4 transition-colors hover:border-default-hover hover:bg-surface-secondary"
                >
                  <div className="flex items-start justify-between gap-2">
                    <AppIcon app={app} />
                    <div className="relative z-10 -mt-1 -mr-1">
                      <PinButton app={app} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* The link's overlay makes the whole tile open the app; the pin button sits above it. */}
                    <Link
                      href={buildPath(routes.app, { appId: app.id })}
                      className="text-sm font-medium text-foreground no-underline after:absolute after:inset-0 after:rounded-xl"
                    >
                      {app.name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{app.description}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="truncate">
                      {departmentName(app.ownerDepartmentId)} · {app.pages.length} {app.pages.length === 1 ? "page" : "pages"}
                    </span>
                    <StatusChip status={app.lifecycle} />
                  </div>
                </li>
              ))}
            </ul>
          );
        }}
      </QueryState>
    </SectionCard>
  );
}
