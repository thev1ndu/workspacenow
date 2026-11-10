import { Edit } from "@carbon/react/icons";
import { useState } from "react";
import { Button, CodeSnippet, Column, Grid, InlineNotification, Stack, Tag } from "@carbon/react";

import { useListUsers, useOrganization, type UserWithRoles } from "@workspacenow/api-client";
import { DetailList, PageLayout, QueryState, SectionCard, DetailSkeleton, TableSkeleton } from "@workspacenow/views";

import styles from "./control.module.scss";
import { ControlTable } from "./subComponents/ControlTable";
import { GroupEditor } from "./subComponents/GroupEditor";
import { GroupMappingEditor } from "./subComponents/GroupMappingEditor";
import { RoleMatrix } from "./subComponents/RoleMatrix";
import { UserRolesEditor } from "./subComponents/UserRolesEditor";

const rowId = (user: UserWithRoles) => user.id;

export function AccessPage() {
  const organization = useOrganization();
  const users = useListUsers();
  const [editing, setEditing] = useState<UserWithRoles | null>(null);

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (u: UserWithRoles) => (
        <>
          <p className={styles.name}>{u.name}</p>
          <p className={styles.caption}>{u.email}</p>
        </>
      ),
    },
    {
      key: "groups",
      header: "Groups (from IdP)",
      cell: (u: UserWithRoles) => (
        <div className={styles.tags}>
          {u.groups.map((g) => (
            <Tag key={g} size="sm" type="gray">
              {g}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      key: "roles",
      header: "WorkspaceNow roles",
      cell: (u: UserWithRoles) => (
        <div className={styles.tags}>
          {u.roles.map((r) => (
            <Tag key={r} size="sm" type="blue">
              {r}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (u: UserWithRoles) => (
        <Button kind="ghost" size="sm" onClick={() => setEditing(u)} aria-label={`Edit roles for ${u.name}`} renderIcon={Edit}>
          Edit roles
        </Button>
      ),
    },
  ];

  return (
    <PageLayout title="Identity and access" description="The organization's identity provider authenticates; WorkspaceNow authorizes.">
      <Stack gap={6}>
        <Grid fullWidth>
          <Column sm={4} md={8} lg={8} className={styles.cell}>
            <SectionCard title="Identity integration">
              <Stack gap={5}>
                <InlineNotification kind="info" lowContrast hideCloseButton title="How access works">
                  OIDC establishes who a user is (Authorization Code + PKCE, token validation, group claims). WorkspaceNow maps those groups to roles and decides what the user may do
                  on every application, entity, API, MCP tool, agent and workflow. Agents and workflows use their own service identities rather than forwarded user tokens.
                </InlineNotification>
                <QueryState query={organization} skeleton={<DetailSkeleton items={5} columns={2} />}>
                  {(org) => (
                    <DetailList
                      columns={2}
                      items={[
                        { label: "Provider type", value: org.identityProvider.type },
                        { label: "Client id", value: <CodeSnippet type="inline">{org.identityProvider.clientId}</CodeSnippet> },
                        { label: "Issuer", fullWidth: true, value: <CodeSnippet type="inline">{org.identityProvider.issuer}</CodeSnippet> },
                        { label: "Groups claim", value: <CodeSnippet type="inline">{org.identityProvider.groupsClaim}</CodeSnippet> },
                        {
                          label: "Scopes",
                          value: (
                            <div className={styles.tags}>
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
              </Stack>
            </SectionCard>
          </Column>
          <Column sm={4} md={8} lg={8} className={styles.cell}>
            <GroupMappingEditor />
          </Column>
        </Grid>
        <GroupEditor />
        <SectionCard
          title="Users and their roles"
          subtitle="Identities come from the identity provider; assign WorkspaceNow roles directly per user, on top of group mappings."
          flush
        >
          <QueryState query={users} skeleton={<TableSkeleton rows={5} columns={4} />}>
            {(data) => (
              <ControlTable
                label="Users and their roles"
                rows={data.items}
                rowId={rowId}
                columns={columns}
                emptyMessage="No users yet."
                searchText={(u) => `${u.name} ${u.email} ${u.groups.join(" ")} ${u.roles.join(" ")}`}
                searchLabel="Search users"
              />
            )}
          </QueryState>
        </SectionCard>
        <RoleMatrix />
      </Stack>
      <UserRolesEditor user={editing} onClose={() => setEditing(null)} />
    </PageLayout>
  );
}
