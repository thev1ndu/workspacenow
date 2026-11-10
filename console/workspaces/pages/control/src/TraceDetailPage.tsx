import { Accordion, AccordionItem, StructuredListBody, StructuredListCell, StructuredListRow, StructuredListWrapper, Stack, Tag } from "@carbon/react";
import { useParams } from "react-router-dom";
import { useGetTrace } from "@workspacenow/api-client";
import { routes, type AuditRecord } from "@workspacenow/types";
import { ActorLabel, DetailList, NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, formatDateTime, PageSkeleton } from "@workspacenow/views";

import styles from "./control.module.scss";
import { ControlTable } from "./subComponents/ControlTable";
import { formatOffset, formatSpan } from "./utils";

const rowId = (record: AuditRecord) => record.id;

export function TraceDetailPage() {
  const { traceId } = useParams();
  const trace = useGetTrace({ traceId });

  return (
    <PageLayout
      title={trace.data?.title ?? "Trace"}
      description={<span className={styles.monoLarge}>{traceId}</span>}
      backHref={routes.control.traces}
      backLabel="Traces"
    >
      <QueryState query={trace} skeleton={<PageSkeleton />}>
        {(data) => {
          const timelineColumns = [
            { key: "offset", header: "Offset", cell: (record: AuditRecord) => <span className={`${styles.monoLarge} ${styles.nowrap} ${styles.muted}`}>{formatOffset(data.startedAt, record.time)}</span> },
            {
              key: "actor",
              header: "Actor",
              cell: (record: AuditRecord) => (
                <>
                  <ActorLabel actor={record.actor} />
                  {record.actor.onBehalfOf && <p className={styles.caption}>on behalf of {record.actor.onBehalfOf}</p>}
                </>
              ),
            },
            {
              key: "entryPoint",
              header: "Entry point",
              cell: (record: AuditRecord) => (
                <Tag size="sm" type="gray">
                  {record.entryPoint}
                </Tag>
              ),
            },
            {
              key: "action",
              header: "Action",
              cell: (record: AuditRecord) => (
                <>
                  <p className={styles.monoLarge}>{record.action}</p>
                  {record.detail && <p className={`${styles.caption} ${record.outcome === "denied" ? styles.danger : ""}`}>{record.detail}</p>}
                </>
              ),
            },
            { key: "resource", header: "Resource", cell: (record: AuditRecord) => <span className={`${styles.monoLarge} ${styles.nowrap}`}>{record.resource}</span> },
            { key: "outcome", header: "Outcome", cell: (record: AuditRecord) => <StatusChip status={record.outcome} /> },
          ];
          return (
            <Stack gap={6}>
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
                        <div className={styles.tags}>
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
                <ControlTable
                  label="Trace timeline"
                  rows={data.audit}
                  rowId={rowId}
                  columns={timelineColumns}
                  emptyMessage="No governed steps in this trace."
                  paginate={false}
                  rowTone={(record) => (record.outcome === "denied" ? "error" : undefined)}
                />
              </SectionCard>

              <SectionCard title="Events published" subtitle="Domain events raised inside this trace" flush>
                {data.events.length === 0 ? (
                  <NoDataFound message="No events were published in this trace." />
                ) : (
                  <Accordion isFlush>
                    {data.events.map((event) => (
                      <AccordionItem
                        key={event.id}
                        title={
                          <span>
                            <span className={styles.monoLarge}>{event.type}</span>
                            <span className={styles.caption}>{` ${formatOffset(data.startedAt, event.time)} from ${event.source}`}</span>
                          </span>
                        }
                      >
                        <StructuredListWrapper isCondensed aria-label={`Payload of ${event.type}`}>
                          <StructuredListBody>
                            {Object.entries(event.payload).map(([key, value]) => (
                              <StructuredListRow key={key}>
                                <StructuredListCell noWrap>
                                  <span className={styles.mono}>{key}</span>
                                </StructuredListCell>
                                <StructuredListCell>
                                  <span className={styles.mono}>{Array.isArray(value) ? value.join(", ") : String(value)}</span>
                                </StructuredListCell>
                              </StructuredListRow>
                            ))}
                          </StructuredListBody>
                        </StructuredListWrapper>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </SectionCard>
            </Stack>
          );
        }}
      </QueryState>
    </PageLayout>
  );
}
