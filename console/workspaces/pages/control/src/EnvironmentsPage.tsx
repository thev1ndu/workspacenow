import { Security } from "@carbon/react/icons";
import { Column, Grid, Heading, Section, Stack, Tag, Tile } from "@carbon/react";

import { useListApplications, useListDeployments, useListEnvironments } from "@workspacenow/api-client";
import { buildPath, routes, type Deployment, type Environment } from "@workspacenow/types";
import { PageLayout, QueryState, SectionCard, StatusChip, TextLink, formatDateTime, CardGridSkeleton } from "@workspacenow/views";

import styles from "./control.module.scss";
import { ControlTable } from "./subComponents/ControlTable";

const deploymentId = (d: Deployment) => d.id;

export function EnvironmentsPage() {
  const environments = useListEnvironments();
  const applications = useListApplications();
  const deployments = useListDeployments();
  const appName = (id: string) => applications.data?.items.find((a) => a.id === id)?.name ?? id;
  const envs: Environment[] = environments.data?.items ?? [];

  const versionColumns = [
    {
      key: "application",
      header: "Application",
      cell: (app: { id: string; name: string }) => <TextLink to={buildPath(routes.studio.application, { appId: app.id })}>{app.name}</TextLink>,
    },
    ...envs.map((env) => ({
      key: env.key,
      header: env.name,
      cell: (app: { id: string; name: string }) => {
        const active = deployments.data?.items.find((d) => d.applicationId === app.id && d.environment === env.key && d.status === "active");
        return active ? (
          <Tag size="sm" type="green">
            v{active.version}
          </Tag>
        ) : (
          <span className={styles.muted}>Not deployed</span>
        );
      },
    })),
  ];

  const historyColumns = [
    { key: "when", header: "When", cell: (d: Deployment) => <span className={`${styles.nowrap} ${styles.muted}`}>{formatDateTime(d.deployedAt)}</span> },
    { key: "application", header: "Application", cell: (d: Deployment) => <span className={styles.name}>{appName(d.applicationId)}</span> },
    { key: "environment", header: "Environment", cell: (d: Deployment) => d.environment },
    { key: "version", header: "Version", cell: (d: Deployment) => <span className={styles.tabular}>v{d.version}</span> },
    { key: "status", header: "Status", cell: (d: Deployment) => <StatusChip status={d.status} /> },
    { key: "by", header: "By", cell: (d: Deployment) => d.deployedBy },
  ];

  return (
    <PageLayout title="Environments and deployments" description="Deployment environments of applications. They isolate configuration, not tenants.">
      <Stack gap={6}>
        <QueryState query={environments} skeleton={<CardGridSkeleton count={3} columns={3} />}>
          {(data) => (
            <Grid fullWidth>
              {data.items.map((env) => (
                <Column key={env.key} sm={4} md={4} lg={Math.max(4, Math.floor(16 / Math.max(1, data.items.length)))} className={styles.cell}>
                  <Tile className={styles.tile}>
                    <Section>
                      <div className={styles.tileHead}>
                        <Heading>{env.name}</Heading>
                        {env.requiresApproval && (
                          <Tag size="sm" type="warm-gray" renderIcon={Security}>
                            Promotion approval
                          </Tag>
                        )}
                      </div>
                      <p className={styles.muted}>{env.description}</p>
                    </Section>
                  </Tile>
                </Column>
              ))}
            </Grid>
          )}
        </QueryState>

        <SectionCard title="Active versions" subtitle="Releases must reach development, then staging, before production." flush>
          <QueryState query={applications}>
            {(apps) => (
              <ControlTable
                label="Active versions by environment"
                rows={apps.items}
                rowId={(app) => app.id}
                columns={versionColumns}
                emptyMessage="No applications yet."
                searchText={(app) => app.name}
                searchLabel="Search applications"
              />
            )}
          </QueryState>
        </SectionCard>

        <SectionCard title="Deployment history" flush>
          <QueryState query={deployments}>
            {(data) => (
              <ControlTable
                label="Deployment history"
                rows={data.items}
                rowId={deploymentId}
                columns={historyColumns}
                emptyMessage="No deployments yet."
                searchText={(d) => `${appName(d.applicationId)} ${d.environment} v${d.version} ${d.status} ${d.deployedBy}`}
                searchLabel="Search deployments"
              />
            )}
          </QueryState>
        </SectionCard>
      </Stack>
    </PageLayout>
  );
}
