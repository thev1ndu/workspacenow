import { Column, Grid, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { Link } from "react-router-dom";
import { useListApiOperations, useListApis, useListEntities, useListWorkflows } from "@workspacenow/api-client";
import { buildPath, routes, type Application } from "@workspacenow/types";
import { DetailList, LinkButton, NoDataFound, QueryState, SectionCard, StatusChip, TextLink, formatDateTime, SectionCardSkeleton, TableSkeleton } from "@workspacenow/views";
import { useDepartmentName } from "./useDepartmentName";
import shared from "../shared.module.scss";

import styles from "./ApplicationTabs.module.scss";

const SCOPE_LABEL = { application: "Application-scoped", organization: "Organization-shared", external: "External" };

export function AppOverviewTab({ app }: { app: Application }) {
  const departmentName = useDepartmentName();
  return (
    <Grid narrow withRowGap>
      <Column sm={4} md={5} lg={11}>
      <SectionCard title="Blueprint">
        <DetailList
          columns={2}
          items={[
            { label: "Owner", value: departmentName(app.ownerDepartmentId) },
            { label: "Lifecycle", value: <StatusChip status={app.lifecycle} /> },
            { label: "Version", value: <span className={shared.numeric}>v{app.version}</span> },
            { label: "Slug", value: <code className={shared.mono}>{app.slug}</code> },
            { label: "Created", value: formatDateTime(app.createdAt) },
            { label: "Updated", value: formatDateTime(app.updatedAt) },
            {
              label: "Entities",
              fullWidth: true,
              value: (
                <div className={shared.tags}>
                  {app.entityNames.map((name) => (
                    <Link key={name} to={buildPath(routes.data.entity, { entityName: name })} className={styles.entityLink}>
                      <Tag size="sm" type="gray">
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
      </Column>
      <Column sm={4} md={3} lg={5}>
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
                  <TableCell>{page.entity ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
      </Column>
    </Grid>
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
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader scope="col">Entity</TableHeader>
                    <TableHeader scope="col">Scope</TableHeader>
                    <TableHeader scope="col">Ownership</TableHeader>
                    <TableHeader scope="col" className={shared.right}>Fields</TableHeader>
                    <TableHeader scope="col" className={shared.right}>Records</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {used.map((e) => (
                    <TableRow key={e.id} id={e.id}>
                      <TableCell>
                        <TextLink to={buildPath(routes.data.entity, { entityName: e.name })}>{e.label}</TextLink>
                      </TableCell>
                      <TableCell>{SCOPE_LABEL[e.scope]}</TableCell>
                      <TableCell>{e.ownerApplicationId === app.id ? "Owned (authoritative writes)" : "Consumed"}</TableCell>
                      <TableCell className={`${shared.right} ${shared.numeric}`}>{e.fields.length}</TableCell>
                      <TableCell className={shared.right}>
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
          <Stack gap={6}>
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
                  <Table>
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
                              <span className={styles.endpoint}>
                                <Tag size="sm" type={op.method === "GET" ? "gray" : "blue"}>
                                  {op.method}
                                </Tag>
                                <span className={styles.mono}>
                                  {api.basePath}
                                  {op.path}
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className={styles.mono}>{op.businessOperation}</TableCell>
                            <TableCell className={styles.subtle}>{op.permission}</TableCell>
                            <TableCell>
                              {op.mcp?.enabled ? (
                                <Tag size="sm" type="green">
                                  {op.mcp.toolName}
                                </Tag>
                              ) : (
                                <span className={shared.helper}>Not exposed</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            ))}
          </Stack>
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
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader scope="col">Workflow</TableHeader>
                    <TableHeader scope="col">Trigger</TableHeader>
                    <TableHeader scope="col" className={shared.right}>Steps</TableHeader>
                    <TableHeader scope="col">Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {own.map((w) => (
                    <TableRow key={w.id} id={w.id}>
                      <TableCell>
                        <TextLink to={buildPath(routes.flow.workflow, { workflowId: w.id })}>{w.name}</TextLink>
                        <p className={styles.description}>{w.description}</p>
                      </TableCell>
                      <TableCell className={styles.mono}>
                        {w.trigger.kind === "entity-event" ? w.trigger.event : w.trigger.kind === "schedule" ? w.trigger.cron : "manual"}
                      </TableCell>
                      <TableCell className={`${shared.right} ${shared.numeric}`}>{w.steps.length}</TableCell>
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
