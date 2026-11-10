import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { useParams } from "react-router-dom";
import { useGetTrace } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { ActorLabel, DetailList, NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, formatDateTime, PageSkeleton } from "@workspacenow/views";
import { formatOffset, formatSpan } from "./utils";

export function TraceDetailPage() {
  const { traceId } = useParams();
  const trace = useGetTrace({ traceId });

  return (
    <PageLayout
      title={trace.data?.title ?? "Trace"}
      description={<span className="font-mono">{traceId}</span>}
      backHref={routes.control.traces}
      backLabel="Traces"
    >
      <QueryState query={trace} skeleton={<PageSkeleton />}>
        {(data) => (
          <div className="grid gap-6">
            <SectionCard>
              <DetailList
                columns={4}
                items={[
                  { label: "Started", value: formatDateTime(data.startedAt) },
                  { label: "Duration", value: formatSpan(data.startedAt, data.endedAt) },
                  { label: "Spans", value: data.spanCount },
                  {
                    label: "Denied",
                    value:
                      data.denied > 0 ? (
                        <Tag size="sm" type="red">
                          {data.denied}
                        </Tag>
                      ) : (
                        "0"
                      ),
                  },
                  {
                    label: "Actors",
                    fullWidth: true,
                    value: (
                      <div className="flex flex-wrap gap-1">
                        {data.actors.map((a) => (
                          <Tag key={a} size="sm" type="gray">
                            {a}
                          </Tag>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </SectionCard>

            <SectionCard title="Timeline" subtitle="Each governed step, in order. Denied steps are highlighted." flush>
              <div>
                <TableContainer>
                  <Table aria-label="Trace timeline" className="min-w-[880px]">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Offset</TableHeader>
                        <TableHeader scope="row">Actor</TableHeader>
                        <TableHeader>Entry point</TableHeader>
                        <TableHeader>Action</TableHeader>
                        <TableHeader>Resource</TableHeader>
                        <TableHeader>Outcome</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.audit.map((record) => {
                        const denied = record.outcome === "denied";
                        return (
                          <TableRow key={record.id} id={record.id} className={denied ? "bg-danger-soft/40" : undefined}>
                            <TableCell className="font-mono text-[13px] whitespace-nowrap text-muted">
                              {formatOffset(data.startedAt, record.time)}
                            </TableCell>
                            <TableCell>
                              <ActorLabel actor={record.actor} />
                              {record.actor.onBehalfOf && <p className="text-xs text-muted">on behalf of {record.actor.onBehalfOf}</p>}
                            </TableCell>
                            <TableCell>
                              <Tag size="sm" type="gray">
                                {record.entryPoint}
                              </Tag>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <p className="font-mono text-[13px]">{record.action}</p>
                              {record.detail && <p className={`text-xs ${denied ? "text-danger" : "text-muted"}`}>{record.detail}</p>}
                            </TableCell>
                            <TableCell className="font-mono text-[13px] whitespace-nowrap">{record.resource}</TableCell>
                            <TableCell>
                              <StatusChip status={record.outcome} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </SectionCard>

            <SectionCard title="Events published" subtitle="Domain events raised inside this trace" flush>
              {data.events.length === 0 ? (
                <NoDataFound message="No events were published in this trace." />
              ) : (
                <div>
                  <TableContainer>
                    <Table aria-label="Events published" className="min-w-[720px]">
                      <TableHead>
                        <TableRow>
                          <TableHeader>Offset</TableHeader>
                          <TableHeader scope="row">Event</TableHeader>
                          <TableHeader>Payload</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.events.map((event) => (
                          <TableRow key={event.id} id={event.id}>
                            <TableCell className="font-mono text-[13px] whitespace-nowrap text-muted">
                              {formatOffset(data.startedAt, event.time)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <p className="font-mono text-[13px]">{event.type}</p>
                              <p className="text-xs text-muted">{event.source}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(event.payload).map(([key, value]) => (
                                  <Tag key={key} size="sm" type="gray" className="max-w-[420px]">
                                    <span className="truncate font-mono">
                                      {key}: {Array.isArray(value) ? value.join(", ") : String(value)}
                                    </span>
                                  </Tag>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </QueryState>
    </PageLayout>
  );
}
