import { Chip, Table } from "@heroui/react";
import { useListDepartments, useListTeams, useListUsers } from "@workspacenow/api-client";
import { PageLayout, QueryState, SectionCard } from "@workspacenow/views";

export function OrganizationPage() {
  const departments = useListDepartments();
  const teams = useListTeams();
  const users = useListUsers();
  const deptName = (id: string) => departments.data?.items.find((d) => d.id === id)?.name ?? id;

  return (
    <PageLayout title="Organization" description="Departments and teams own resources inside this one organization. They are not tenants.">
      <div className="grid gap-6">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <SectionCard title="Departments" flush>
            <QueryState query={departments}>
              {(data) => (
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Departments">
                      <Table.Header>
                        <Table.Column isRowHeader>Name</Table.Column>
                        <Table.Column>Description</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((d) => (
                          <Table.Row key={d.id} id={d.id}>
                            <Table.Cell className="font-medium whitespace-nowrap">{d.name}</Table.Cell>
                            <Table.Cell className="text-muted">{d.description}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )}
            </QueryState>
          </SectionCard>
          <SectionCard title="Teams" flush>
            <QueryState query={teams}>
              {(data) => (
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Teams">
                      <Table.Header>
                        <Table.Column isRowHeader>Team</Table.Column>
                        <Table.Column>Department</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((t) => (
                          <Table.Row key={t.id} id={t.id}>
                            <Table.Cell className="font-medium">{t.name}</Table.Cell>
                            <Table.Cell className="text-muted">{deptName(t.departmentId)}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )}
            </QueryState>
          </SectionCard>
        </div>
        <SectionCard title="Users" subtitle="Identities come from the identity provider; roles come from group mappings." flush>
          <QueryState query={users}>
            {(data) => (
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Users" className="min-w-[880px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Name</Table.Column>
                      <Table.Column>Title</Table.Column>
                      <Table.Column>Department</Table.Column>
                      <Table.Column>Groups (from IdP)</Table.Column>
                      <Table.Column>WorkspaceNow roles</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {data.items.map((u) => (
                        <Table.Row key={u.id} id={u.id}>
                          <Table.Cell>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted">{u.email}</p>
                          </Table.Cell>
                          <Table.Cell>{u.title}</Table.Cell>
                          <Table.Cell className="text-muted">{deptName(u.departmentId)}</Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-wrap gap-1">
                              {u.groups.map((g) => (
                                <Chip key={g} size="sm" variant="secondary">
                                  <span className="font-mono">{g}</span>
                                </Chip>
                              ))}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map((r) => (
                                <Chip key={r} size="sm" variant="soft" color="accent">
                                  {r}
                                </Chip>
                              ))}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )}
          </QueryState>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
