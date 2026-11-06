import { useState } from "react";
import { useListApplications } from "@workspacenow/api-client";
import { CardGridSkeleton, NoDataFound, PageLayout, QueryState, TextInput } from "@workspacenow/views";
import { useDepartmentName } from "../subComponents/useDepartmentName";
import { AppTile } from "./AppTile";
import { pinnedFirst, usePinnedApplicationIds } from "./PinButton";

/**
 * The organization's applications as their users see them: one place to find and open an app, without
 * the entities, APIs and workflows behind it. Pinned apps come first.
 */
export function CatalogPage() {
  const applications = useListApplications();
  const pinnedIds = usePinnedApplicationIds();
  const departmentName = useDepartmentName();
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();

  return (
    <PageLayout title="Applications" description="Every application you can use, in one place.">
      <div className="grid gap-6">
        <div className="max-w-sm">
          <TextInput label="Search" value={search} onChange={setSearch} placeholder="Name, description or team" />
        </div>
        <QueryState query={applications} skeleton={<CardGridSkeleton count={8} />}>
          {(data) => {
            const apps = pinnedFirst(data.items, pinnedIds).filter(
              (app) => !term || [app.name, app.description, departmentName(app.ownerDepartmentId)].some((text) => text.toLowerCase().includes(term)),
            );
            if (data.items.length === 0) return <NoDataFound message="No applications yet." />;
            if (apps.length === 0) return <NoDataFound message="No applications match your search." />;
            return (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {apps.map((app) => (
                  <AppTile key={app.id} app={app} meta={departmentName(app.ownerDepartmentId)} />
                ))}
              </ul>
            );
          }}
        </QueryState>
      </div>
    </PageLayout>
  );
}
