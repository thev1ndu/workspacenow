import { Security } from "@carbon/react/icons";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";

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
                <div key={env.key} className="flex flex-col gap-2 rounded-xl border border-separator bg-surface p-5">
                  <div className="flex items-center gap-2">
                    <h3 className="flex-1 text-sm font-semibold">{env.name}</h3>
                    {env.requiresApproval && (
                      <Tag size="sm" type="warm-gray">
                        <Security className="size-3" aria-hidden />
                        Promotion approval
                      </Tag>
                    )}
                  </div>
                  <p className="text-sm text-muted">{env.description}</p>
                </div>
              ))}
            </div>
          )}
        </QueryState>

        <SectionCard title="Active versions" subtitle="Releases must reach development, then staging, before production." flush>
          <QueryState query={applications}>
            {(apps) => (
              <div>
                <TableContainer>
                  <Table aria-label="Active versions by environment" className="min-w-[640px]">
                    <TableHead>
                      <TableRow>
                        <TableHeader id="application" scope="row">
                          Application
                        </TableHeader>
                        {envs.map((env) => (
                          <TableHeader key={env.key} id={env.key}>
                            {env.name}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {apps.items.map((app) => (
                        <TableRow key={app.id} id={app.id}>
                          <TableCell>
                            <TextLink to={buildPath(routes.studio.application, { appId: app.id })}>{app.name}</TextLink>
                          </TableCell>
                          {envs.map((env) => {
                            const active = deployments.data?.items.find(
                              (d) => d.applicationId === app.id && d.environment === env.key && d.status === "active",
                            );
                            return (
                              <TableCell key={env.key}>
                                {active ? (
                                  <Tag size="sm" type="green">
                                    v{active.version}
                                  </Tag>
                                ) : (
                                  <span className="text-sm text-muted">Not deployed</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}
          </QueryState>
        </SectionCard>

        <SectionCard title="Deployment history" flush>
          <QueryState query={deployments}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No deployments yet." />
              ) : (
                <div>
                  <TableContainer>
                    <Table aria-label="Deployment history" className="min-w-[720px]">
                      <TableHead>
                        <TableRow>
                          <TableHeader>When</TableHeader>
                          <TableHeader scope="row">Application</TableHeader>
                          <TableHeader>Environment</TableHeader>
                          <TableHeader>Version</TableHeader>
                          <TableHeader>Status</TableHeader>
                          <TableHeader>By</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.items.map((d) => (
                          <TableRow key={d.id} id={d.id}>
                            <TableCell className="whitespace-nowrap text-muted">{formatDateTime(d.deployedAt)}</TableCell>
                            <TableCell className="font-medium">{appName(d.applicationId)}</TableCell>
                            <TableCell className="capitalize">{d.environment}</TableCell>
                            <TableCell className="tabular-nums">v{d.version}</TableCell>
                            <TableCell>
                              <StatusChip status={d.status} />
                            </TableCell>
                            <TableCell>{d.deployedBy}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              )
            }
          </QueryState>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
