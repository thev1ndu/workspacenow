import { Edit } from "@carbon/react/icons";
import { useState } from "react";
import { Button, InlineNotification, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";

import { useListUsers, useOrganization, type UserWithRoles } from "@workspacenow/api-client";
import { DetailList, PageLayout, QueryState, SectionCard, DetailSkeleton, TableSkeleton } from "@workspacenow/views";
import { GroupEditor } from "./subComponents/GroupEditor";
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
              <InlineNotification kind="info" lowContrast hideCloseButton>
                OIDC establishes who a user is (Authorization Code + PKCE, token validation, group claims). WorkspaceNow maps those groups to
                roles and decides what the user may do on every application, entity, API, MCP tool, agent and workflow. Agents and
                workflows use their own service identities rather than forwarded user tokens.
              </InlineNotification>
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
                              <Tag key={s} size="sm" type="gray">
                                {s}
                              </Tag>
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
        <GroupEditor />
        <SectionCard
          title="Users and their roles"
          subtitle="Identities come from the identity provider; assign WorkspaceNow roles directly per user, on top of group mappings."
          flush
        >
          <QueryState query={users} skeleton={<TableSkeleton rows={5} columns={4} />}>
            {(data) => (
              <div>
                <TableContainer>
                  <Table aria-label="Users and their roles" className="min-w-[880px]">
                    <TableHead>
                      <TableRow>
                        <TableHeader scope="row">Name</TableHeader>
                        <TableHeader>Groups (from IdP)</TableHeader>
                        <TableHeader>WorkspaceNow roles</TableHeader>
                        <TableHeader aria-label="Actions" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.items.map((u) => (
                        <TableRow key={u.id} id={u.id}>
                          <TableCell>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted">{u.email}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {u.groups.map((g) => (
                                <Tag key={g} size="sm" type="gray">
                                  <span className="font-mono">{g}</span>
                                </Tag>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map((r) => (
                                <Tag key={r} size="sm" type="blue">
                                  {r}
                                </Tag>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              kind="ghost"
                              size="sm"
                              onClick={() => setEditing(u)}
                              aria-label={`Edit roles for ${u.name}`}
                              renderIcon={(p) => <Edit className="size-4" aria-hidden {...p} />}
                            >
                              Edit roles
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}
          </QueryState>
        </SectionCard>
        <RoleMatrix />
      </div>
      <UserRolesEditor user={editing} onClose={() => setEditing(null)} />
    </PageLayout>
  );
}
