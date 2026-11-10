import { ArrowUpRight, Add } from "@carbon/react/icons";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";

import { useListApplications } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TextLink, formatRelative } from "@workspacenow/views";
import { AppIcon } from "./apps/AppIcon";
import { PinButton } from "./apps/PinButton";
import { useDepartmentName } from "./subComponents/useDepartmentName";

export function ApplicationsPage() {
  const applications = useListApplications();
  const departmentName = useDepartmentName();

  return (
    <PageLayout
      title="Applications"
      description="Every application is a versioned blueprint over shared entities, APIs, workflows and agents."
      actions={
        <LinkButton variant="primary" href={routes.studio.builder}>
          <Add className="size-4" aria-hidden />
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
                <Table className="min-w-[860px]">
                  <TableHead>
                    <TableRow>
                      <TableHeader scope="col">Name</TableHeader>
                      <TableHeader scope="col">Owner</TableHeader>
                      <TableHeader scope="col">Lifecycle</TableHeader>
                      <TableHeader scope="col">Version</TableHeader>
                      <TableHeader scope="col">Entities</TableHeader>
                      <TableHeader scope="col">Updated</TableHeader>
                      <TableHeader scope="col" className="w-24">
                        <span className="sr-only">Actions</span>
                      </TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((app) => (
                      <TableRow key={app.id} id={app.id}>
                        <TableCell className="max-w-sm">
                          <div className="flex items-center gap-3">
                            <AppIcon app={app} size="sm" />
                            <div className="min-w-0">
                              <TextLink to={buildPath(routes.studio.application, { appId: app.id })}>{app.name}</TextLink>
                              <p className="mt-0.5 text-xs text-muted">{app.description}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted">{departmentName(app.ownerDepartmentId)}</TableCell>
                        <TableCell>
                          <StatusChip status={app.lifecycle} />
                        </TableCell>
                        <TableCell className="tabular-nums">v{app.version}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {app.entityNames.map((e) => (
                              <Tag key={e} size="sm" type="gray">
                                {e}
                              </Tag>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted">{formatRelative(app.updatedAt)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <PinButton app={app} />
                            <LinkButton isIconOnly size="sm" variant="ghost" aria-label={`Open ${app.name}`} href={buildPath(routes.app, { appId: app.id })}>
                              <ArrowUpRight className="size-4" />
                            </LinkButton>
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
