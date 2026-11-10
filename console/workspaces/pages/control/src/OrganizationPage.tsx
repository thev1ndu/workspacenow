import { Settings } from "@carbon/react/icons";
import { useState } from "react";
import { Button, CodeSnippet, Column, Grid, InlineNotification, Stack, Tag } from "@carbon/react";

import { useOrganization, useOrganizationTheme, useUpdateOrganizationTheme } from "@workspacenow/api-client";
import { globalConfig } from "@workspacenow/types";
import { DetailList, PageLayout, QueryState, SectionCard, DetailSkeleton, TextInput } from "@workspacenow/views";

import styles from "./control.module.scss";

/**
 * One WorkspaceNow installation serves one organization; there are no tenants. Users, roles and
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
    <PageLayout title="Organization" description="This installation and the identity provider that authenticates its users.">
      <Grid fullWidth>
        <Column sm={4} md={8} lg={8} className={styles.cell}>
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
                    { label: "Issuer", fullWidth: true, value: <CodeSnippet type="inline">{org.identityProvider.issuer}</CodeSnippet> },
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
          </SectionCard>
        </Column>
        <Column sm={4} md={8} lg={8} className={styles.cell}>
          <SectionCard
            title="White-label theme"
            subtitle="Logo and primary color applied across this installation's console."
            actions={
              <Button
                size="sm"
                kind="secondary"
                disabled={updateTheme.isPending}
                onClick={() => updateTheme.mutate({ primaryColor: effectiveColor, logoUrl: effectiveLogo })}
                renderIcon={Settings}
              >
                Save theme
              </Button>
            }
          >
            <Stack gap={5}>
              <TextInput label="Primary color (hex)" value={effectiveColor} onChange={setColor} placeholder="#6d28d9" />
              <TextInput label="Logo URL" value={effectiveLogo} onChange={setLogo} placeholder="https://example.com/logo.svg" />
              {themeErr && (
                <InlineNotification kind="error" lowContrast hideCloseButton title="Invalid theme" subtitle={themeErr.message} />
              )}
              {themeSaved && (
                <InlineNotification kind="success" lowContrast hideCloseButton title="Theme saved" subtitle={themeSaved.primaryColor} />
              )}
            </Stack>
          </SectionCard>
        </Column>
      </Grid>
    </PageLayout>
  );
}
