import { useOrganization } from "@workspacenow/api-client";
import { globalConfig } from "@workspacenow/types";
import { DetailList, PageLayout, QueryState, SectionCard, DetailSkeleton } from "@workspacenow/views";

export function SettingsPage() {
  const organization = useOrganization();

  return (
    <PageLayout title="Settings" description="Installation details.">
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
                  { label: "Identity provider", value: org.identityProvider.issuer ? org.identityProvider.type : "Local system user" },
                  ...(org.identityProvider.issuer
                    ? [{ label: "Issuer", fullWidth: true, value: <code className="font-mono text-[13px]">{org.identityProvider.issuer}</code> }]
                    : []),
                ]}
              />
            )}
          </QueryState>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
