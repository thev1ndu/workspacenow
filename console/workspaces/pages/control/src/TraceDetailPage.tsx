import { Chip, Table } from "@heroui/react";
import { useParams } from "react-router-dom";
import { useGetTrace } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { ActorLabel, DetailList, NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, formatDateTime } from "@workspacenow/views";
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
      <QueryState query={trace}>
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
                        <Chip size="sm" variant="soft" color="danger">
                          {data.denied}
                        </Chip>
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
                          <Chip key={a} size="sm" variant="secondary">
                            {a}
                          </Chip>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </SectionCard>

            <SectionCard title="Timeline" subtitle="Each governed step, in order. Denied steps are highlighted." flush>
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Trace timeline" className="min-w-[880px]">
                    <Table.Header>
                      <Table.Column>Offset</Table.Column>
                      <Table.Column isRowHeader>Actor</Table.Column>
                      <Table.Column>Entry point</Table.Column>
                      <Table.Column>Action</Table.Column>
                      <Table.Column>Resource</Table.Column>
                      <Table.Column>Outcome</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {data.audit.map((record) => {
                        const denied = record.outcome === "denied";
                        return (
                          <Table.Row key={record.id} id={record.id} className={denied ? "bg-danger-soft/40" : undefined}>
                            <Table.Cell className="font-mono text-[13px] whitespace-nowrap text-muted">
                              {formatOffset(data.startedAt, record.time)}
                            </Table.Cell>
                            <Table.Cell>
                              <ActorLabel actor={record.actor} />
                              {record.actor.onBehalfOf && <p className="text-xs text-muted">on behalf of {record.actor.onBehalfOf}</p>}
                            </Table.Cell>
                            <Table.Cell>
                              <Chip size="sm" variant="secondary">
                                {record.entryPoint}
                              </Chip>
                            </Table.Cell>
                            <Table.Cell className="max-w-md">
                              <p className="font-mono text-[13px]">{record.action}</p>
                              {record.detail && <p className={`text-xs ${denied ? "text-danger" : "text-muted"}`}>{record.detail}</p>}
                            </Table.Cell>
                            <Table.Cell className="font-mono text-[13px] whitespace-nowrap">{record.resource}</Table.Cell>
                            <Table.Cell>
                              <StatusChip status={record.outcome} />
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </SectionCard>

            <SectionCard title="Events published" subtitle="Domain events raised inside this trace" flush>
              {data.events.length === 0 ? (
                <NoDataFound message="No events were published in this trace." />
              ) : (
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Events published" className="min-w-[720px]">
                      <Table.Header>
                        <Table.Column>Offset</Table.Column>
                        <Table.Column isRowHeader>Event</Table.Column>
                        <Table.Column>Payload</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.events.map((event) => (
                          <Table.Row key={event.id} id={event.id}>
                            <Table.Cell className="font-mono text-[13px] whitespace-nowrap text-muted">
                              {formatOffset(data.startedAt, event.time)}
                            </Table.Cell>
                            <Table.Cell className="whitespace-nowrap">
                              <p className="font-mono text-[13px]">{event.type}</p>
                              <p className="text-xs text-muted">{event.source}</p>
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(event.payload).map(([key, value]) => (
                                  <Chip key={key} size="sm" variant="secondary" className="max-w-[420px]">
                                    <span className="truncate font-mono">
                                      {key}: {Array.isArray(value) ? value.join(", ") : String(value)}
                                    </span>
                                  </Chip>
                                ))}
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )}
            </SectionCard>
          </div>
        )}
      </QueryState>
    </PageLayout>
  );
}
