import { useState } from "react";
import { Button, CodeSnippet, Column, Grid, PasswordInput, Stack } from "@carbon/react";
import { useOrganization, useSession, useWriteSecret } from "@workspacenow/api-client";
import { globalConfig } from "@workspacenow/types";
import { DetailList, PageLayout, QueryState, SectionCard, DetailSkeleton } from "@workspacenow/views";

import styles from "./control.module.scss";

/** True only for the local system user (actor id "local:..."), never for OIDC/IdP users. */
function isSystemUser(session: { actor: { id: string } } | undefined): boolean {
  return !!session?.actor.id.startsWith("local:");
}

/** Mistral keys have no fixed prefix, so a key is any non-empty value without whitespace once trimmed. */
function isPlausibleKey(value: string): boolean {
  const key = value.trim();
  return key.length > 0 && !/\s/.test(key);
}

function MistralApiKeyCard() {
  const [apiKey, setApiKey] = useState("");
  const write = useWriteSecret();
  const key = apiKey.trim();
  const valid = isPlausibleKey(apiKey);
  return (
    <SectionCard title="Mistral API key" subtitle="Stored in OpenBao (secret/workspacenow/mistral); visible only to the system user.">
      <Stack gap={5}>
        <PasswordInput
          id="mistral-api-key"
          labelText="API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste the Mistral API key"
          helperText="Paste the key itself, not a command"
          invalid={key.length > 0 && !valid}
          invalidText="That does not look like an API key. Paste the key value itself, without spaces"
        />
        <div>
          <Button
            kind="primary"
            disabled={!valid || write.isPending}
            onClick={() => write.mutate({ path: "workspacenow/mistral", key: "apiKey", value: key }, { onSuccess: () => setApiKey("") })}
          >
            {write.isPending ? "Saving..." : "Save API key"}
          </Button>
        </div>
      </Stack>
    </SectionCard>
  );
}

export function SettingsPage() {
  const organization = useOrganization();
  const session = useSession();
  const systemUser = isSystemUser(session.data);

  return (
    <PageLayout title="Settings" description="Installation details.">
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
                    { label: "Identity provider", value: org.identityProvider.issuer ? org.identityProvider.type : "Local system user" },
                    ...(org.identityProvider.issuer
                      ? [{ label: "Issuer", fullWidth: true, value: <CodeSnippet type="inline">{org.identityProvider.issuer}</CodeSnippet> }]
                      : []),
                  ]}
                />
              )}
            </QueryState>
          </SectionCard>
        </Column>
        {systemUser && (
          <Column sm={4} md={8} lg={8} className={styles.cell}>
            <MistralApiKeyCard />
          </Column>
        )}
      </Grid>
    </PageLayout>
  );
}
