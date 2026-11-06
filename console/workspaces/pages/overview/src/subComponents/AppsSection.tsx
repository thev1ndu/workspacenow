import { useListApplications, useListDepartments } from "@workspacenow/api-client";
import { AppTile, pinnedFirst, usePinnedApplicationIds } from "@workspacenow/studio";
import { routes } from "@workspacenow/types";
import { LinkButton, NoDataFound, QueryState, SectionCard, CardGridSkeleton } from "@workspacenow/views";

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
      <QueryState query={applications} skeleton={<CardGridSkeleton />}>
        {(data) => {
          if (data.items.length === 0) return <NoDataFound message="No applications yet." />;
          return (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {pinnedFirst(data.items, pinnedIds).map((app) => (
                <AppTile
                  key={app.id}
                  app={app}
                  meta={`${departmentName(app.ownerDepartmentId)} · ${app.pages.length} ${app.pages.length === 1 ? "page" : "pages"}`}
                />
              ))}
            </ul>
          );
        }}
      </QueryState>
    </SectionCard>
  );
}
