import { useState } from "react";
import { Button, InlineNotification, Tag } from "@carbon/react";
import { Gear } from "@workspacenow/icons";
import { useOrganization, useOrganizationTheme, useUpdateOrganizationTheme } from "@workspacenow/api-client";
import { globalConfig } from "@workspacenow/types";
import { DetailList, PageLayout, QueryState, SectionCard, DetailSkeleton, TextInput } from "@workspacenow/views";

/**
 * One WorkspaceNow installation serves one organization — there are no tenants. Users, roles and
 * group mappings live on the Identity and access page; identities come from the identity provider.
 */
export function OrganizationPage() {
  const organization = useOrganization();
  const theme = useOrganizationTheme();
  const updateTheme = useUpdateOrganizationTheme();
  const [color, setColor] = useState("");
  const [logo, setLogo] = useState("");
  const initial = theme.data;
  const themeErr = updateTheme.error as Error | null;
  const themeSaved = updateTheme.data;
  const effectiveColor = color || initial?.primaryColor || "";
  const effectiveLogo = logo || initial?.logoUrl || "";
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
        </SectionCard>
        <SectionCard
          title="White-label theme"
          subtitle="Logo and primary color applied across this installation's console."
          actions={
            <Button
              size="sm"
              kind="secondary"
              disabled={updateTheme.isPending}
              onClick={() => updateTheme.mutate({ primaryColor: effectiveColor, logoUrl: effectiveLogo })}
              renderIcon={(p) => <Gear className="size-3.5" aria-hidden {...p} />}
            >
              Save theme
            </Button>
          }
        >
          <div className="grid max-w-md gap-3">
            <TextInput label="Primary color (hex)" value={effectiveColor} onChange={setColor} placeholder="#6d28d9" />
            <TextInput label="Logo URL" value={effectiveLogo} onChange={setLogo} placeholder="https://example.com/logo.svg" />
            {themeErr && (
              <InlineNotification kind="error" lowContrast hideCloseButton title="Invalid theme">
                {themeErr.message}
              </InlineNotification>
            )}
            {themeSaved && (
              <InlineNotification kind="success" lowContrast hideCloseButton title="Theme saved">
                {themeSaved.primaryColor}
              </InlineNotification>
            )}
          </div>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
