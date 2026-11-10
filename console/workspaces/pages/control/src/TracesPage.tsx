import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { useListTraces } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { useState } from "react";
import { NoDataFound, PageLayout, QueryState, SectionCard, TablePager, TextInput, TextLink, formatRelative, useDebouncedValue } from "@workspacenow/views";
import { formatSpan } from "./utils";

const PAGE_SIZE = 15;

export function TracesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const traces = useListTraces({ q: q || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  return (
    <PageLayout title="Traces" description="One trace follows a request across Studio, APIs, MCP tools, agents and workflows.">
      <div className="grid gap-5">
        <div className="max-w-sm">
          <TextInput label="Search traces" value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Trace id, title or actor" />
        </div>
        <SectionCard flush>
          <QueryState query={traces}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No traces yet." />
              ) : (
              <div>
                <TableContainer>
                  <Table aria-label="Traces" className="min-w-[880px]">
                    <TableHead>
                      <TableRow>
                        <TableHeader scope="row">Trace</TableHeader>
                        <TableHeader>Actors</TableHeader>
                        <TableHeader>Spans</TableHeader>
                        <TableHeader>Denied</TableHeader>
                        <TableHeader>Started</TableHeader>
                        <TableHeader>Duration</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.items.map((trace) => (
                        <TableRow key={trace.traceId} id={trace.traceId}>
                          <TableCell>
                            <TextLink to={buildPath(routes.control.trace, { traceId: trace.traceId })}>{trace.title}</TextLink>
                            <p className="font-mono text-xs text-muted">{trace.traceId}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {trace.actors.map((a) => (
                                <Tag key={a} size="sm" type="gray">
                                  {a}
                                </Tag>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums">{trace.spanCount}</TableCell>
                          <TableCell>
                            {trace.denied > 0 ? (
                              <Tag size="sm" type="red">
                                {trace.denied}
                              </Tag>
                            ) : (
                              <span className="text-muted tabular-nums">0</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted">{formatRelative(trace.startedAt)}</TableCell>
                          <TableCell className="tabular-nums">{formatSpan(trace.startedAt, trace.endedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )
          }
        </QueryState>
        <TablePager page={page} totalPages={Math.max(1, Math.ceil((traces.data?.total ?? 0) / PAGE_SIZE))} total={traces.data?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </SectionCard>
      </div>
    </PageLayout>
  );
}
