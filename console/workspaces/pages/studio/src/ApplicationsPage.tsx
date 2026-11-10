import { ArrowUpRight, Add } from "@carbon/react/icons";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";

import { useListApplications } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TextLink, formatRelative } from "@workspacenow/views";
import { AppIcon } from "./apps/AppIcon";
import { PinButton } from "./apps/PinButton";
import { useDepartmentName } from "./subComponents/useDepartmentName";
import shared from "./shared.module.scss";
import styles from "./ApplicationsPage.module.scss";

export function ApplicationsPage() {
  const applications = useListApplications();
  const departmentName = useDepartmentName();

  return (
    <PageLayout
      title="Applications"
      description="Every application is a versioned blueprint over shared entities, APIs, workflows and agents."
      actions={
        <LinkButton variant="primary" href={routes.studio.builder} renderIcon={Add}>
          New application
        </LinkButton>
      }
    >
      <SectionCard flush>
        <QueryState query={applications}>
          {(data) =>
            data.items.length === 0 ? (
              <NoDataFound message="No applications yet." />
            ) : (
              <TableContainer aria-label="Applications">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader scope="col">Name</TableHeader>
                      <TableHeader scope="col">Owner</TableHeader>
                      <TableHeader scope="col">Lifecycle</TableHeader>
                      <TableHeader scope="col">Version</TableHeader>
                      <TableHeader scope="col">Entities</TableHeader>
                      <TableHeader scope="col">Updated</TableHeader>
                      <TableHeader scope="col">
                        <span className="cds--visually-hidden">Actions</span>
                      </TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((app) => (
                      <TableRow key={app.id} id={app.id}>
                        <TableCell>
                          <div className={styles.name}>
                            <AppIcon app={app} size="sm" />
                            <div>
                              <TextLink to={buildPath(routes.studio.application, { appId: app.id })}>{app.name}</TextLink>
                              <p className={shared.helper}>{app.description}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{departmentName(app.ownerDepartmentId)}</TableCell>
                        <TableCell>
                          <StatusChip status={app.lifecycle} />
                        </TableCell>
                        <TableCell className={shared.numeric}>v{app.version}</TableCell>
                        <TableCell>
                          <div className={shared.tags}>
                            {app.entityNames.map((e) => (
                              <Tag key={e} size="sm" type="gray">
                                {e}
                              </Tag>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className={shared.nowrap}>{formatRelative(app.updatedAt)}</TableCell>
                        <TableCell>
                          <div className={shared.actionsCell}>
                            <PinButton app={app} />
                            <LinkButton isIconOnly size="sm" variant="ghost" aria-label={`Open ${app.name}`} href={buildPath(routes.app, { appId: app.id })} renderIcon={ArrowUpRight} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          }
        </QueryState>
      </SectionCard>
    </PageLayout>
  );
}
