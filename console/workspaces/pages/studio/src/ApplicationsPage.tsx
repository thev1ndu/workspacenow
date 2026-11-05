import { Chip, Table } from "@heroui/react";
import { ArrowUpRightFromSquare, Plus } from "@workspacenow/icons";
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
          <Plus className="size-4" aria-hidden />
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
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Applications" className="min-w-[860px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Name</Table.Column>
                      <Table.Column>Owner</Table.Column>
                      <Table.Column>Lifecycle</Table.Column>
                      <Table.Column>Version</Table.Column>
                      <Table.Column>Entities</Table.Column>
                      <Table.Column>Updated</Table.Column>
                      <Table.Column className="w-24">
                        <span className="sr-only">Actions</span>
                      </Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {data.items.map((app) => (
                        <Table.Row key={app.id} id={app.id}>
                          <Table.Cell className="max-w-sm">
                            <div className="flex items-center gap-3">
                              <AppIcon app={app} size="sm" />
                              <div className="min-w-0">
                                <TextLink to={buildPath(routes.studio.application, { appId: app.id })}>{app.name}</TextLink>
                                <p className="mt-0.5 text-xs text-muted">{app.description}</p>
                              </div>
                            </div>
                          </Table.Cell>
                          <Table.Cell className="text-muted">{departmentName(app.ownerDepartmentId)}</Table.Cell>
                          <Table.Cell>
                            <StatusChip status={app.lifecycle} />
                          </Table.Cell>
                          <Table.Cell className="tabular-nums">v{app.version}</Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-wrap gap-1">
                              {app.entityNames.map((e) => (
                                <Chip key={e} size="sm" variant="secondary">
                                  {e}
                                </Chip>
                              ))}
                            </div>
                          </Table.Cell>
                          <Table.Cell className="whitespace-nowrap text-muted">{formatRelative(app.updatedAt)}</Table.Cell>
                          <Table.Cell>
                            <div className="flex justify-end gap-1">
                              <PinButton app={app} />
                              <LinkButton isIconOnly size="sm" variant="ghost" aria-label={`Open ${app.name}`} href={buildPath(routes.app, { appId: app.id })}>
                                <ArrowUpRightFromSquare className="size-4" />
                              </LinkButton>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )
          }
        </QueryState>
      </SectionCard>
    </PageLayout>
  );
}
