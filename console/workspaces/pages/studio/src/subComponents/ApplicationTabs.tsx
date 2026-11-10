import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { Link } from "react-router-dom";
import { useListApiOperations, useListApis, useListEntities, useListWorkflows } from "@workspacenow/api-client";
import { buildPath, routes, type Application } from "@workspacenow/types";
import { DetailList, LinkButton, NoDataFound, QueryState, SectionCard, StatusChip, TextLink, formatDateTime, SectionCardSkeleton, TableSkeleton } from "@workspacenow/views";
import { useDepartmentName } from "./useDepartmentName";

const SCOPE_LABEL = { application: "Application-scoped", organization: "Organization-shared", external: "External" };

export function AppOverviewTab({ app }: { app: Application }) {
  const departmentName = useDepartmentName();
  return (
    <div className="grid items-start gap-6 md:grid-cols-[2fr_1fr]">
      <SectionCard title="Blueprint">
        <DetailList
          columns={2}
          items={[
            { label: "Owner", value: departmentName(app.ownerDepartmentId) },
            { label: "Lifecycle", value: <StatusChip status={app.lifecycle} /> },
            { label: "Version", value: <span className="tabular-nums">v{app.version}</span> },
            { label: "Slug", value: <code className="text-xs">{app.slug}</code> },
            { label: "Created", value: formatDateTime(app.createdAt) },
            { label: "Updated", value: formatDateTime(app.updatedAt) },
            {
              label: "Entities",
              fullWidth: true,
              value: (
                <div className="flex flex-wrap gap-1.5">
                  {app.entityNames.map((name) => (
                    <Link key={name} to={buildPath(routes.data.entity, { entityName: name })} className="no-underline">
                      <Tag size="sm" type="gray" className="cursor-pointer hover:bg-default-hover">
                        {name}
                      </Tag>
                    </Link>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </SectionCard>
      <SectionCard title="Pages" flush>
        <TableContainer aria-label="Pages">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader scope="col">Page</TableHeader>
                <TableHeader scope="col">Kind</TableHeader>
                <TableHeader scope="col">Entity</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {app.pages.map((page) => (
                <TableRow key={page.id} id={page.id}>
                  <TableCell>{page.title}</TableCell>
                  <TableCell>
                    <Tag size="sm" type="gray">
                      {page.kind}
                    </Tag>
                  </TableCell>
                  <TableCell className="text-muted">{page.entity ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
    </div>
  );
}

export function AppDataTab({ app }: { app: Application }) {
  const entities = useListEntities();
  return (
    <SectionCard title="Entities this application uses" flush>
      <QueryState query={entities}>
        {(data) => {
          const used = data.items.filter((e) => app.entityNames.includes(e.name));
          if (used.length === 0) return <NoDataFound message="This application uses no entities." />;
          return (
            <TableContainer aria-label="Entities used">
              <Table className="min-w-[640px]">
                <TableHead>
                  <TableRow>
                    <TableHeader scope="col">Entity</TableHeader>
                    <TableHeader scope="col">Scope</TableHeader>
                    <TableHeader scope="col">Ownership</TableHeader>
                    <TableHeader scope="col" className="text-right">Fields</TableHeader>
                    <TableHeader scope="col" className="text-right">Records</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {used.map((e) => (
                    <TableRow key={e.id} id={e.id}>
                      <TableCell>
                        <TextLink to={buildPath(routes.data.entity, { entityName: e.name })}>{e.label}</TextLink>
                      </TableCell>
                      <TableCell className="text-muted">{SCOPE_LABEL[e.scope]}</TableCell>
                      <TableCell>{e.ownerApplicationId === app.id ? "Owned (authoritative writes)" : "Consumed"}</TableCell>
                      <TableCell className="text-right tabular-nums">{e.fields.length}</TableCell>
                      <TableCell className="text-right">
                        <LinkButton size="sm" variant="ghost" href={buildPath(routes.data.records, { entityName: e.name })}>
                          Records
                        </LinkButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }}
      </QueryState>
    </SectionCard>
  );
}

export function AppApisTab({ app }: { app: Application }) {
  const apis = useListApis();
  const operations = useListApiOperations();
  const appApis = apis.data?.items.filter((a) => a.applicationId === app.id) ?? [];
  return (
    <QueryState query={apis} skeleton={
        <SectionCardSkeleton flush>
          <TableSkeleton rows={3} />
        </SectionCardSkeleton>
      }>
      {() =>
        appApis.length === 0 ? (
          <SectionCard>
            <NoDataFound message="This application exposes no APIs." />
          </SectionCard>
        ) : (
          <div className="grid gap-6">
            {appApis.map((api) => (
              <SectionCard
                key={api.id}
                title={api.name}
                subtitle={`${api.basePath} · v${api.version}`}
                actions={
                  <LinkButton size="sm" variant="ghost" href={buildPath(routes.connect.api, { apiId: api.id })}>
                    Open in Connect
                  </LinkButton>
                }
                flush
              >
                <TableContainer aria-label={`${api.name} operations`}>
                  <Table className="min-w-[760px]">
                    <TableHead>
                      <TableRow>
                        <TableHeader scope="col">Endpoint</TableHeader>
                        <TableHeader scope="col">Business operation</TableHeader>
                        <TableHeader scope="col">Permission</TableHeader>
                        <TableHeader scope="col">MCP tool</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(operations.data?.items ?? [])
                        .filter((op) => op.apiId === api.id)
                        .map((op) => (
                          <TableRow key={op.id} id={op.id}>
                            <TableCell>
                              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                <Tag size="sm" type={op.method === "GET" ? "gray" : "blue"} className="font-mono">
                                  {op.method}
                                </Tag>
                                <span className="font-mono text-xs">
                                  {api.basePath}
                                  {op.path}
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{op.businessOperation}</TableCell>
                            <TableCell className="font-mono text-xs text-muted">{op.permission}</TableCell>
                            <TableCell>
                              {op.mcp?.enabled ? (
                                <Tag size="sm" type="green" className="font-mono">
                                  {op.mcp.toolName}
                                </Tag>
                              ) : (
                                <span className="text-xs text-muted">Not exposed</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            ))}
          </div>
        )
      }
    </QueryState>
  );
}

export function AppWorkflowsTab({ app }: { app: Application }) {
  const workflows = useListWorkflows();
  return (
    <SectionCard title="Workflows" flush>
      <QueryState query={workflows}>
        {(data) => {
          const own = data.items.filter((w) => w.applicationId === app.id);
          if (own.length === 0) return <NoDataFound message="No workflows belong to this application." />;
          return (
            <TableContainer aria-label="Workflows">
              <Table className="min-w-[680px]">
                <TableHead>
                  <TableRow>
                    <TableHeader scope="col">Workflow</TableHeader>
                    <TableHeader scope="col">Trigger</TableHeader>
                    <TableHeader scope="col" className="text-right">Steps</TableHeader>
                    <TableHeader scope="col">Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {own.map((w) => (
                    <TableRow key={w.id} id={w.id}>
                      <TableCell className="max-w-md">
                        <TextLink to={buildPath(routes.flow.workflow, { workflowId: w.id })}>{w.name}</TextLink>
                        <p className="mt-0.5 text-xs text-muted">{w.description}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {w.trigger.kind === "entity-event" ? w.trigger.event : w.trigger.kind === "schedule" ? w.trigger.cron : "manual"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{w.steps.length}</TableCell>
                      <TableCell>
                        <StatusChip status={w.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }}
      </QueryState>
    </SectionCard>
  );
}
