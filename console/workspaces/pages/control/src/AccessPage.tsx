import { useState } from "react";
import { Alert, Button, Chip, Table } from "@heroui/react";
import { Pencil } from "@workspacenow/icons";
import { useListUsers, useOrganization, type UserWithRoles } from "@workspacenow/api-client";
import { DetailList, PageLayout, QueryState, SectionCard, DetailSkeleton, TableSkeleton } from "@workspacenow/views";
import { GroupMappingEditor } from "./subComponents/GroupMappingEditor";
import { RoleMatrix } from "./subComponents/RoleMatrix";
import { UserRolesEditor } from "./subComponents/UserRolesEditor";

export function AccessPage() {
  const organization = useOrganization();
  const users = useListUsers();
  const [editing, setEditing] = useState<UserWithRoles | null>(null);

  return (
    <PageLayout title="Identity and access" description="The organization's identity provider authenticates; WorkspaceNow authorizes.">
      <div className="grid gap-6">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <SectionCard title="Identity integration">
            <div className="grid gap-5">
              <Alert>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    OIDC establishes who a user is (Authorization Code + PKCE, token validation, group claims). WorkspaceNow maps those groups to
                    roles and decides what the user may do on every application, entity, API, MCP tool, agent and workflow. Agents and
                    workflows use their own service identities rather than forwarded user tokens.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
              <QueryState query={organization} skeleton={<DetailSkeleton items={5} columns={2} />}>
                {(org) => (
                  <DetailList
                    columns={2}
                    items={[
                      { label: "Provider type", value: org.identityProvider.type },
                      { label: "Client id", value: <code className="font-mono text-[13px]">{org.identityProvider.clientId}</code> },
                      { label: "Issuer", fullWidth: true, value: <code className="font-mono text-[13px]">{org.identityProvider.issuer}</code> },
                      { label: "Groups claim", value: <code className="font-mono text-[13px]">{org.identityProvider.groupsClaim}</code> },
                      {
                        label: "Scopes",
                        value: (
                          <div className="flex flex-wrap gap-1">
                            {org.identityProvider.scopes.map((s) => (
                              <Chip key={s} size="sm" variant="secondary">
                                {s}
                              </Chip>
                            ))}
                          </div>
                        ),
                      },
                    ]}
                  />
                )}
              </QueryState>
            </div>
          </SectionCard>
          <GroupMappingEditor />
        </div>
        <SectionCard
          title="Users and their roles"
          subtitle="Identities come from the identity provider; assign WorkspaceNow roles directly per user, on top of group mappings."
          flush
        >
          <QueryState query={users} skeleton={<TableSkeleton rows={5} columns={4} />}>
            {(data) => (
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Users and their roles" className="min-w-[880px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Name</Table.Column>
                      <Table.Column>Groups (from IdP)</Table.Column>
                      <Table.Column>WorkspaceNow roles</Table.Column>
                      <Table.Column aria-label="Actions" />
                    </Table.Header>
                    <Table.Body>
                      {data.items.map((u) => (
                        <Table.Row key={u.id} id={u.id}>
                          <Table.Cell>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted">{u.email}</p>
                          </Table.Cell>
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
                          <Table.Cell>
                            <Button size="sm" variant="ghost" onPress={() => setEditing(u)} aria-label={`Edit roles for ${u.name}`}>
                              <Pencil className="size-4" aria-hidden />
                              Edit roles
                            </Button>
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
        <RoleMatrix />
      </div>
      <UserRolesEditor user={editing} onClose={() => setEditing(null)} />
    </PageLayout>
  );
}
