import { Card, Chip, Table } from "@heroui/react";
import { ShieldCheck } from "@workspacenow/icons";
import { useListApplications, useListDeployments, useListEnvironments } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TextLink, formatDateTime, CardGridSkeleton } from "@workspacenow/views";

export function EnvironmentsPage() {
  const environments = useListEnvironments();
  const applications = useListApplications();
  const deployments = useListDeployments();
  const appName = (id: string) => applications.data?.items.find((a) => a.id === id)?.name ?? id;
  const envs = environments.data?.items ?? [];

  return (
    <PageLayout title="Environments and deployments" description="Deployment environments of applications. They isolate configuration, not tenants.">
      <div className="grid gap-6">
        <QueryState query={environments} skeleton={<CardGridSkeleton count={3} className="md:grid-cols-3" />}>
          {(data) => (
            <div className="grid gap-3 md:grid-cols-3">
              {data.items.map((env) => (
                <Card key={env.key} className="gap-2 p-5">
                  <div className="flex items-center gap-2">
                    <h3 className="flex-1 text-sm font-semibold">{env.name}</h3>
                    {env.requiresApproval && (
                      <Chip size="sm" variant="soft" color="warning">
                        <ShieldCheck className="size-3" aria-hidden />
                        Promotion approval
                      </Chip>
                    )}
                  </div>
                  <p className="text-sm text-muted">{env.description}</p>
                </Card>
              ))}
            </div>
          )}
        </QueryState>

        <SectionCard title="Active versions" subtitle="Releases must reach development, then staging, before production." flush>
          <QueryState query={applications}>
            {(apps) => (
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Active versions by environment" className="min-w-[640px]">
                    <Table.Header>
                      <Table.Column id="application" isRowHeader>
                        Application
                      </Table.Column>
                      {envs.map((env) => (
                        <Table.Column key={env.key} id={env.key}>
                          {env.name}
                        </Table.Column>
                      ))}
                    </Table.Header>
                    <Table.Body>
                      {apps.items.map((app) => (
                        <Table.Row key={app.id} id={app.id}>
                          <Table.Cell>
                            <TextLink to={buildPath(routes.studio.application, { appId: app.id })}>{app.name}</TextLink>
                          </Table.Cell>
                          {envs.map((env) => {
                            const active = deployments.data?.items.find(
                              (d) => d.applicationId === app.id && d.environment === env.key && d.status === "active",
                            );
                            return (
                              <Table.Cell key={env.key}>
                                {active ? (
                                  <Chip size="sm" variant="soft" color="success">
                                    v{active.version}
                                  </Chip>
                                ) : (
                                  <span className="text-sm text-muted">Not deployed</span>
                                )}
                              </Table.Cell>
                            );
                          })}
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )}
          </QueryState>
        </SectionCard>

        <SectionCard title="Deployment history" flush>
          <QueryState query={deployments}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No deployments yet." />
              ) : (
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Deployment history" className="min-w-[720px]">
                      <Table.Header>
                        <Table.Column>When</Table.Column>
                        <Table.Column isRowHeader>Application</Table.Column>
                        <Table.Column>Environment</Table.Column>
                        <Table.Column>Version</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>By</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((d) => (
                          <Table.Row key={d.id} id={d.id}>
                            <Table.Cell className="whitespace-nowrap text-muted">{formatDateTime(d.deployedAt)}</Table.Cell>
                            <Table.Cell className="font-medium">{appName(d.applicationId)}</Table.Cell>
                            <Table.Cell className="capitalize">{d.environment}</Table.Cell>
                            <Table.Cell className="tabular-nums">v{d.version}</Table.Cell>
                            <Table.Cell>
                              <StatusChip status={d.status} />
                            </Table.Cell>
                            <Table.Cell>{d.deployedBy}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )
            }
          </QueryState>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
