import { useState } from "react";
import { Button } from "@heroui/react";
import { useOrganization, useSession, useWriteSecret } from "@workspacenow/api-client";
import { globalConfig } from "@workspacenow/types";
import { DetailList, PageLayout, QueryState, SectionCard, DetailSkeleton, TextInput } from "@workspacenow/views";

/** True only for the local system user (actor id "local:…"), never for OIDC/IdP users. */
function isSystemUser(session: { actor: { id: string } } | undefined): boolean {
  return !!session?.actor.id.startsWith("local:");
}

function MistralApiKeyCard() {
  const [apiKey, setApiKey] = useState("");
  const write = useWriteSecret();
  return (
    <SectionCard title="Mistral API key" subtitle="Stored in OpenBao (secret/workspacenow/mistral); visible only to the system user.">
      <div className="flex flex-col gap-3">
        <TextInput
          label="API key"
          type="password"
          value={apiKey}
          onChange={setApiKey}
          placeholder="mstrl-… / sk-…"
          helperText="Paste the key itself (starts with mstrl- or sk-), not a command"
          error={apiKey.length > 0 && !/^(mstrl|sk)-/.test(apiKey) ? "That does not look like an API key — paste the key value itself" : undefined}
        />
        <div>
          <Button
            variant="primary"
            isDisabled={!apiKey || !/^(mstrl|sk)-/.test(apiKey) || write.isPending}
            onPress={() => write.mutate({ path: "workspacenow/mistral", key: "apiKey", value: apiKey }, { onSuccess: () => setApiKey("") })}
          >
            {write.isPending ? "Saving…" : "Save API key"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

export function SettingsPage() {
  const organization = useOrganization();
  const session = useSession();
  const systemUser = isSystemUser(session.data);

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
        {systemUser && <MistralApiKeyCard />}
      </div>
    </PageLayout>
  );
}
