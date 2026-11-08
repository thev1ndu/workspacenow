import { Chip, Table } from "@heroui/react";
import { useListErrorGroups, useListObservedServices } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { useState } from "react";
import { NoDataFound, PageLayout, QueryState, SectionCard, TablePager, TextInput, TextLink, formatRelative, useDebouncedValue } from "@workspacenow/views";

const PAGE_SIZE = 15;

function errorRateChip(rate: number) {
  if (rate >= 0.05) return <Chip size="sm" variant="soft" color="danger">{(rate * 100).toFixed(1)}%</Chip>;
  if (rate > 0) return <Chip size="sm" variant="soft" color="warning">{(rate * 100).toFixed(1)}%</Chip>;
  return <Chip size="sm" variant="secondary">0%</Chip>;
}

export function HealthPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const errors = useListErrorGroups({ q: q || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const services = useListObservedServices();
  return (
    <PageLayout
      title="Health & errors"
      description="Per-service telemetry health and grouped error spans from the observer — every error links back to its trace."
    >
      <div className="grid gap-5">
        <SectionCard title="Services" flush>
          <QueryState query={services}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No telemetry yet — the observer has not received spans." />
              ) : (
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Observed services" className="min-w-[880px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Service</Table.Column>
                        <Table.Column>Spans</Table.Column>
                        <Table.Column>Errors</Table.Column>
                        <Table.Column>Error rate</Table.Column>
                        <Table.Column>Logs</Table.Column>
                        <Table.Column>Last seen</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((s) => (
                          <Table.Row key={s.service} id={s.service}>
                            <Table.Cell className="font-mono text-sm">{s.service}</Table.Cell>
                            <Table.Cell className="tabular-nums">{s.spans}</Table.Cell>
                            <Table.Cell className="tabular-nums">{s.errors}</Table.Cell>
                            <Table.Cell>{errorRateChip(s.errorRate)}</Table.Cell>
                            <Table.Cell className="tabular-nums">{s.logs}</Table.Cell>
                            <Table.Cell className="whitespace-nowrap text-muted">{s.lastSeen ? formatRelative(s.lastSeen) : "—"}</Table.Cell>
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
        <div className="max-w-sm">
          <TextInput label="Search errors" value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Message or span name" />
        </div>
        <SectionCard title="Error groups" flush>
          <QueryState query={errors}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No error spans recorded." />
              ) : (
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Error groups" className="min-w-[880px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Error</Table.Column>
                        <Table.Column>Service</Table.Column>
                        <Table.Column>Count</Table.Column>
                        <Table.Column>Last seen</Table.Column>
                        <Table.Column>Traces</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((g) => (
                          <Table.Row key={g.fingerprint} id={g.fingerprint}>
                            <Table.Cell>
                              <p className="text-sm font-medium">{g.message}</p>
                              <p className="font-mono text-xs text-muted">{g.spanName}</p>
                            </Table.Cell>
                            <Table.Cell className="font-mono text-xs">{g.service}</Table.Cell>
                            <Table.Cell>
                              <Chip size="sm" variant="soft" color="danger">{g.count}</Chip>
                            </Table.Cell>
                            <Table.Cell className="whitespace-nowrap text-muted">{formatRelative(g.lastSeen)}</Table.Cell>
                            <Table.Cell>
                              <div className="flex flex-wrap gap-1">
                                {g.traceIds.map((t) => (
                                  <span key={t} className="font-mono text-xs">
                                    <TextLink to={buildPath(routes.control.trace, { traceId: t })}>{t.slice(0, 8)}</TextLink>
                                  </span>
                                ))}
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )
            }
          </QueryState>
          <TablePager page={page} totalPages={Math.max(1, Math.ceil((errors.data?.total ?? 0) / PAGE_SIZE))} total={errors.data?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </SectionCard>
      </div>
    </PageLayout>
  );
}
