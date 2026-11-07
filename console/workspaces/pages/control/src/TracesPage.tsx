import { Chip, Table } from "@heroui/react";
import { useListTraces } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, TablePager, TextInput, TextLink, formatRelative, usePagedSearch } from "@workspacenow/views";
import { formatSpan } from "./utils";

export function TracesPage() {
  const traces = useListTraces();
  const paged = usePagedSearch(traces.data?.items, 15, (t) => [t.traceId, t.title, t.actors.join(" ")].join(" "));
  return (
    <PageLayout title="Traces" description="One trace follows a request across Studio, APIs, MCP tools, agents and workflows.">
      <div className="grid gap-5">
        <div className="max-w-sm">
          <TextInput label="Search traces" value={paged.search} onChange={paged.setSearch} placeholder="Trace id, title or actor" />
        </div>
        <SectionCard flush>
          <QueryState query={traces}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No traces yet." />
              ) : (
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Traces" className="min-w-[880px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Trace</Table.Column>
                      <Table.Column>Actors</Table.Column>
                      <Table.Column>Spans</Table.Column>
                      <Table.Column>Denied</Table.Column>
                      <Table.Column>Started</Table.Column>
                      <Table.Column>Duration</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {paged.pageItems.map((trace) => (
                        <Table.Row key={trace.traceId} id={trace.traceId}>
                          <Table.Cell>
                            <TextLink to={buildPath(routes.control.trace, { traceId: trace.traceId })}>{trace.title}</TextLink>
                            <p className="font-mono text-xs text-muted">{trace.traceId}</p>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-wrap gap-1">
                              {trace.actors.map((a) => (
                                <Chip key={a} size="sm" variant="secondary">
                                  {a}
                                </Chip>
                              ))}
                            </div>
                          </Table.Cell>
                          <Table.Cell className="tabular-nums">{trace.spanCount}</Table.Cell>
                          <Table.Cell>
                            {trace.denied > 0 ? (
                              <Chip size="sm" variant="soft" color="danger">
                                {trace.denied}
                              </Chip>
                            ) : (
                              <span className="text-muted tabular-nums">0</span>
                            )}
                          </Table.Cell>
                          <Table.Cell className="whitespace-nowrap text-muted">{formatRelative(trace.startedAt)}</Table.Cell>
                          <Table.Cell className="tabular-nums">{formatSpan(trace.startedAt, trace.endedAt)}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )
          }
        </QueryState>
        <TablePager page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={paged.pageSize} onPageChange={paged.setPage} />
      </SectionCard>
      </div>
    </PageLayout>
  );
}
