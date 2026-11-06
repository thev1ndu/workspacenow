import { Alert, Chip } from "@heroui/react";
import { useOrganization } from "@workspacenow/api-client";
import { DetailList, PageLayout, QueryState, SectionCard, DetailSkeleton } from "@workspacenow/views";
import { GroupMappingEditor } from "./subComponents/GroupMappingEditor";
import { RoleMatrix } from "./subComponents/RoleMatrix";

export function AccessPage() {
  const organization = useOrganization();
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
        <RoleMatrix />
      </div>
    </PageLayout>
  );
}
