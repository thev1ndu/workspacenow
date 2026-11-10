import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";
import { CircleCheck, CircleExclamation, CircleXmark, Key, Layers, Persons } from "@workspacenow/icons";
import {
  useListAudit,
  useListEnvironments,
  useListHealth,
  useListRoles,
  useListUsers,
  useOrganization,
} from "@workspacenow/api-client";
import { globalConfig, routes } from "@workspacenow/types";
import { DetailList, LinkButton, Metric, MetricGrid, PageLayout, QueryState, SectionCard, StatusChip, DetailSkeleton } from "@workspacenow/views";
import { AuditTable } from "./subComponents/AuditTable";
import { EntryPointOutcomesChart } from "./subComponents/EntryPointOutcomesChart";
import { HealthChart } from "./subComponents/HealthChart";

const KIND_LABELS: Record<string, string> = {
  application: "Application",
  api: "API",
  mcp: "MCP server",
  agent: "Agent",
  workflow: "Workflow",
  integration: "Integration",
  database: "Database",
};

const STATUS_ORDER = ["down", "degraded", "healthy"];

export function ControlOverview() {
  const organization = useOrganization();
  const users = useListUsers();
  const roles = useListRoles();
  const environments = useListEnvironments();
  const health = useListHealth();
  const denied = useListAudit({ outcome: "denied" });

  const signals = health.data?.items ?? [];
  const count = (status: string) => signals.filter((s) => s.status === status).length;

  return (
    <PageLayout title="Control" description="Administration, security, governance and operations for this installation.">
      <div className="grid gap-6">
        <MetricGrid columns={6}>
          <Metric label="Users" value={users.data?.total ?? "—"} icon={<Persons />} href={routes.control.organization} />
          <Metric label="Roles" value={roles.data?.total ?? "—"} icon={<Key />} href={routes.control.access} />
          <Metric label="Environments" value={environments.data?.total ?? "—"} icon={<Layers />} href={routes.control.environments} />
          <Metric label="Healthy" value={count("healthy")} icon={<CircleCheck />} href="#health-signals" />
          <Metric label="Degraded" value={count("degraded")} icon={<CircleExclamation />} href="#health-signals" />
          <Metric label="Down" value={count("down")} icon={<CircleXmark />} href="#health-signals" />
        </MetricGrid>

        <SectionCard title="Installation">
          <QueryState query={organization} skeleton={<DetailSkeleton items={5} />}>
            {(org) => (
              <DetailList
                columns={4}
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

        <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
          <EntryPointOutcomesChart />
          <HealthChart />
        </div>

        <SectionCard
          title="Recent denied actions"
          subtitle="Requests the platform refused, from any entry point"
          actions={
            <LinkButton size="sm" variant="ghost" href={routes.control.audit}>
              Audit log
            </LinkButton>
          }
          flush
        >
          <QueryState query={denied}>{(data) => <AuditTable records={data.items.slice(0, 6)} />}</QueryState>
        </SectionCard>

        <div id="health-signals" className="scroll-mt-20">
          <SectionCard title="Health signals" subtitle="Applications, APIs, MCP servers, integrations, databases and workflows" flush>
            <QueryState query={health}>
              {(data) => (
                <div>
                  <TableContainer>
                    <Table aria-label="Health signals" className="min-w-[640px]">
                      <TableHead>
                        <TableRow>
                          <TableHeader scope="row">Resource</TableHeader>
                          <TableHeader>Kind</TableHeader>
                          <TableHeader>Status</TableHeader>
                          <TableHeader>Detail</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...data.items]
                          .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
                          .map((signal) => {
                            const id = `${signal.kind}-${signal.resource}`;
                            return (
                              <TableRow key={id} id={id}>
                                <TableCell className="font-medium">{signal.resource}</TableCell>
                                <TableCell className="text-muted">{KIND_LABELS[signal.kind]}</TableCell>
                                <TableCell>
                                  <StatusChip status={signal.status} />
                                </TableCell>
                                <TableCell className="font-mono text-[13px] text-muted">{signal.detail}</TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              )}
            </QueryState>
          </SectionCard>
        </div>
      </div>
    </PageLayout>
  );
}
