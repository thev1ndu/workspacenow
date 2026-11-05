import { Chip, Link, Table } from "@heroui/react";
import { useListApiOperations, useListApis, useListEntities, useListWorkflows } from "@workspacenow/api-client";
import { buildPath, routes, type Application } from "@workspacenow/types";
import { DetailList, LinkButton, NoDataFound, QueryState, SectionCard, StatusChip, TextLink, formatDateTime } from "@workspacenow/views";
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
                    <Link key={name} href={buildPath(routes.data.entity, { entityName: name })} className="no-underline">
                      <Chip size="sm" variant="secondary" className="cursor-pointer hover:bg-default-hover">
                        {name}
                      </Chip>
                    </Link>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </SectionCard>
      <SectionCard title="Pages" flush>
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Pages">
              <Table.Header>
                <Table.Column isRowHeader>Page</Table.Column>
                <Table.Column>Kind</Table.Column>
                <Table.Column>Entity</Table.Column>
              </Table.Header>
              <Table.Body>
                {app.pages.map((page) => (
                  <Table.Row key={page.id} id={page.id}>
                    <Table.Cell>{page.title}</Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" variant="secondary">
                        {page.kind}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell className="text-muted">{page.entity ?? "—"}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Entities used" className="min-w-[640px]">
                  <Table.Header>
                    <Table.Column isRowHeader>Entity</Table.Column>
                    <Table.Column>Scope</Table.Column>
                    <Table.Column>Ownership</Table.Column>
                    <Table.Column className="text-right">Fields</Table.Column>
                    <Table.Column className="text-right">Records</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {used.map((e) => (
                      <Table.Row key={e.id} id={e.id}>
                        <Table.Cell>
                          <TextLink to={buildPath(routes.data.entity, { entityName: e.name })}>{e.label}</TextLink>
                        </Table.Cell>
                        <Table.Cell className="text-muted">{SCOPE_LABEL[e.scope]}</Table.Cell>
                        <Table.Cell>{e.ownerApplicationId === app.id ? "Owned (authoritative writes)" : "Consumed"}</Table.Cell>
                        <Table.Cell className="text-right tabular-nums">{e.fields.length}</Table.Cell>
                        <Table.Cell className="text-right">
                          <LinkButton size="sm" variant="ghost" href={buildPath(routes.data.records, { entityName: e.name })}>
                            Records
                          </LinkButton>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
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
    <QueryState query={apis}>
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
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label={`${api.name} operations`} className="min-w-[760px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Endpoint</Table.Column>
                        <Table.Column>Business operation</Table.Column>
                        <Table.Column>Permission</Table.Column>
                        <Table.Column>MCP tool</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {(operations.data?.items ?? [])
                          .filter((op) => op.apiId === api.id)
                          .map((op) => (
                            <Table.Row key={op.id} id={op.id}>
                              <Table.Cell>
                                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                  <Chip size="sm" variant="soft" color={op.method === "GET" ? "default" : "accent"} className="font-mono">
                                    {op.method}
                                  </Chip>
                                  <span className="font-mono text-xs">
                                    {api.basePath}
                                    {op.path}
                                  </span>
                                </span>
                              </Table.Cell>
                              <Table.Cell className="font-mono text-xs">{op.businessOperation}</Table.Cell>
                              <Table.Cell className="font-mono text-xs text-muted">{op.permission}</Table.Cell>
                              <Table.Cell>
                                {op.mcp?.enabled ? (
                                  <Chip size="sm" variant="soft" color="success" className="font-mono">
                                    {op.mcp.toolName}
                                  </Chip>
                                ) : (
                                  <span className="text-xs text-muted">Not exposed</span>
                                )}
                              </Table.Cell>
                            </Table.Row>
                          ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Workflows" className="min-w-[680px]">
                  <Table.Header>
                    <Table.Column isRowHeader>Workflow</Table.Column>
                    <Table.Column>Trigger</Table.Column>
                    <Table.Column className="text-right">Steps</Table.Column>
                    <Table.Column>Status</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {own.map((w) => (
                      <Table.Row key={w.id} id={w.id}>
                        <Table.Cell className="max-w-md">
                          <TextLink to={buildPath(routes.flow.workflow, { workflowId: w.id })}>{w.name}</TextLink>
                          <p className="mt-0.5 text-xs text-muted">{w.description}</p>
                        </Table.Cell>
                        <Table.Cell className="font-mono text-xs">
                          {w.trigger.kind === "entity-event" ? w.trigger.event : w.trigger.kind === "schedule" ? w.trigger.cron : "manual"}
                        </Table.Cell>
                        <Table.Cell className="text-right tabular-nums">{w.steps.length}</Table.Cell>
                        <Table.Cell>
                          <StatusChip status={w.status} />
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          );
        }}
      </QueryState>
    </SectionCard>
  );
}
