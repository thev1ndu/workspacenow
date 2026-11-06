import { Fragment } from "react";
import { Alert, Button, Chip, Separator } from "@heroui/react";
import { ArrowRotateLeft } from "@workspacenow/icons";
import { useNavigate } from "react-router-dom";
import { useOrganization, useResetDemo } from "@workspacenow/api-client";
import { globalConfig } from "@workspacenow/types";
import { DetailList, PageLayout, QueryState, SectionCard, DetailSkeleton } from "@workspacenow/views";

const DEPENDENCIES = [
  { name: "PostgreSQL", role: "Entity persistence and platform metadata" },
  { name: "Redis", role: "Sessions and caching" },
  { name: "NATS", role: "Event infrastructure" },
  { name: "Temporal", role: "Durable workflow execution" },
  { name: "Object storage", role: "Documents and release artifacts" },
  { name: "Secrets manager", role: "Integration credentials, referenced never copied" },
];

export function SettingsPage() {
  const organization = useOrganization();
  const reset = useResetDemo();
  const navigate = useNavigate();

  return (
    <PageLayout title="Settings" description="Installation details and the deployment model.">
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
                ]}
              />
            )}
          </QueryState>
        </SectionCard>
        <SectionCard title="Deployment model">
          <div className="mb-4 flex flex-wrap gap-1.5">
            <Chip size="sm" variant="secondary">
              Self-hosted
            </Chip>
            <Chip size="sm" variant="secondary">
              Single organization
            </Chip>
            <Chip size="sm" variant="secondary">
              Customer-managed OIDC
            </Chip>
          </div>
          <ul>
            {DEPENDENCIES.map((d, i) => (
              <Fragment key={d.name}>
                {i > 0 && <Separator />}
                <li className="py-2.5">
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted">{d.role}</p>
                </li>
              </Fragment>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Demo data">
          <div className="grid gap-4">
            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  This console runs against an in-browser platform runtime. Resetting restores the seeded Northwind Retail installation and its
                  two days of history, discarding everything done since.
                </Alert.Description>
              </Alert.Content>
            </Alert>
            <div>
              <Button variant="secondary" isPending={reset.isPending} onPress={() => reset.mutate(undefined, { onSuccess: () => navigate("/") })}>
                <ArrowRotateLeft className="size-4" aria-hidden />
                Reset demo data
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
