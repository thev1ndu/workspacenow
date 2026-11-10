import { Link as RouterLink } from "react-router-dom";
import { Link, Tile } from "@carbon/react";

import { useListApplications, useListDepartments } from "@workspacenow/api-client";
import { AppIcon, PinButton, pinnedFirst, usePinnedApplicationIds } from "@workspacenow/studio";
import { buildPath, routes, type Application } from "@workspacenow/types";
import { CardGridSkeleton, LinkButton, NoDataFound, QueryState, SectionCard, StatusChip } from "@workspacenow/views";

import styles from "./AppsSection.module.scss";

function AppCard({ app, meta }: { app: Application; meta: string }) {
  return (
    <li>
      <Tile className={styles.card}>
        <div className={styles.top}>
          <AppIcon app={app} />
          <div className={styles.pin}>
            <PinButton app={app} />
          </div>
        </div>
        <div className={styles.body}>
          <Link as={RouterLink} to={buildPath(routes.app, { appId: app.id })} className={styles.link}>
            {app.name}
          </Link>
          <p className={styles.description}>{app.description}</p>
        </div>
        <div className={styles.foot}>
          <span className={styles.meta}>{meta}</span>
          <StatusChip status={app.lifecycle} />
        </div>
      </Tile>
    </li>
  );
}

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
            <ul className={styles.grid}>
              {pinnedFirst(data.items, pinnedIds).map((app) => (
                <AppCard key={app.id} app={app} meta={departmentName(app.ownerDepartmentId)} />
              ))}
            </ul>
          );
        }}
      </QueryState>
    </SectionCard>
  );
}
