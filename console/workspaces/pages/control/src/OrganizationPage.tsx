import { Chip } from "@heroui/react";
import { useOrganization } from "@workspacenow/api-client";
import { globalConfig } from "@workspacenow/types";
import { DetailList, PageLayout, QueryState, SectionCard, DetailSkeleton } from "@workspacenow/views";

/**
 * One WorkspaceNow installation serves one organization — there are no tenants. Users, roles and
 * group mappings live on the Identity and access page; identities come from the identity provider.
 */
export function OrganizationPage() {
  const organization = useOrganization();
  return (
    <PageLayout
      title="Organization"
      description="This installation and the identity provider that authenticates its users."
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <SectionCard title="Installation">
          <QueryState query={organization} skeleton={<DetailSkeleton items={5} columns={2} />}>
            {(org) => (
              <DetailList
                columns={2}
                items={[
                  { label: "Organization", value: org.name },
                  { label: "Installation", value: org.installationName },
                  { label: "Version", value: globalConfig.version },
                  { label: "Identity provider", value: org.identityProvider.type },
                  { label: "Issuer", fullWidth: true, value: <code className="font-mono text-[13px]">{org.identityProvider.issuer}</code> },
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
        </SectionCard>
      </div>
    </PageLayout>
  );
}
