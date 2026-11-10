import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { useListErrorGroups, useListObservedServices } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { useState } from "react";
import { NoDataFound, PageLayout, QueryState, SectionCard, TablePager, TextInput, TextLink, formatRelative, useDebouncedValue } from "@workspacenow/views";

const PAGE_SIZE = 15;

function errorRateChip(rate: number) {
  if (rate >= 0.05) return <Tag size="sm" type="red">{(rate * 100).toFixed(1)}%</Tag>;
  if (rate > 0) return <Tag size="sm" type="warm-gray">{(rate * 100).toFixed(1)}%</Tag>;
  return <Tag size="sm" type="gray">0%</Tag>;
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
                <div>
                  <TableContainer>
                    <Table aria-label="Observed services" className="min-w-[880px]">
                      <TableHead>
                        <TableRow>
                          <TableHeader scope="row">Service</TableHeader>
                          <TableHeader>Spans</TableHeader>
                          <TableHeader>Errors</TableHeader>
                          <TableHeader>Error rate</TableHeader>
                          <TableHeader>Logs</TableHeader>
                          <TableHeader>Last seen</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.items.map((s) => (
                          <TableRow key={s.service} id={s.service}>
                            <TableCell className="font-mono text-sm">{s.service}</TableCell>
                            <TableCell className="tabular-nums">{s.spans}</TableCell>
                            <TableCell className="tabular-nums">{s.errors}</TableCell>
                            <TableCell>{errorRateChip(s.errorRate)}</TableCell>
                            <TableCell className="tabular-nums">{s.logs}</TableCell>
                            <TableCell className="whitespace-nowrap text-muted">{s.lastSeen ? formatRelative(s.lastSeen) : "—"}</TableCell>
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
        <div className="max-w-sm">
          <TextInput label="Search errors" value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Message or span name" />
        </div>
        <SectionCard title="Error groups" flush>
          <QueryState query={errors}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No error spans recorded." />
              ) : (
                <div>
                  <TableContainer>
                    <Table aria-label="Error groups" className="min-w-[880px]">
                      <TableHead>
                        <TableRow>
                          <TableHeader scope="row">Error</TableHeader>
                          <TableHeader>Service</TableHeader>
                          <TableHeader>Count</TableHeader>
                          <TableHeader>Last seen</TableHeader>
                          <TableHeader>Traces</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.items.map((g) => (
                          <TableRow key={g.fingerprint} id={g.fingerprint}>
                            <TableCell>
                              <p className="text-sm font-medium">{g.message}</p>
                              <p className="font-mono text-xs text-muted">{g.spanName}</p>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{g.service}</TableCell>
                            <TableCell>
                              <Tag size="sm" type="red">{g.count}</Tag>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted">{formatRelative(g.lastSeen)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {g.traceIds.map((t) => (
                                  <span key={t} className="font-mono text-xs">
                                    <TextLink to={buildPath(routes.control.trace, { traceId: t })}>{t.slice(0, 8)}</TextLink>
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              )
            }
          </QueryState>
          <TablePager page={page} totalPages={Math.max(1, Math.ceil((errors.data?.total ?? 0) / PAGE_SIZE))} total={errors.data?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </SectionCard>
      </div>
    </PageLayout>
  );
}
