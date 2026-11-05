import { Chip, Table } from "@heroui/react";
import { buildPath, routes, type AuditRecord } from "@workspacenow/types";
import { ActorLabel, NoDataFound, StatusChip, TextLink, formatDateTime, formatShortDateTime } from "@workspacenow/views";

export function AuditTable({ records, showTrace = true }: { records: AuditRecord[]; showTrace?: boolean }) {
  if (records.length === 0) return <NoDataFound message="No audit records match." />;
  return (
    <Table variant="secondary">
      <Table.ScrollContainer>
        <Table.Content aria-label="Audit records" className="min-w-[820px]">
          <Table.Header>
            <Table.Column>Time</Table.Column>
            <Table.Column isRowHeader>Actor</Table.Column>
            <Table.Column>Entry point</Table.Column>
            <Table.Column>Action and resource</Table.Column>
            <Table.Column>Outcome</Table.Column>
            {showTrace && <Table.Column>Trace</Table.Column>}
          </Table.Header>
          <Table.Body>
            {records.map((record) => {
              const denied = record.outcome === "denied";
              return (
                <Table.Row key={record.id} id={record.id} className={denied ? "bg-danger-soft/40" : undefined}>
                  <Table.Cell className="whitespace-nowrap text-muted">
                    <time dateTime={record.time} title={formatDateTime(record.time)}>
                      {formatShortDateTime(record.time)}
                    </time>
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
                  <Table.Cell className="max-w-sm">
                    <p className="font-mono text-[13px]">{record.action}</p>
                    <p className="font-mono text-xs text-muted">{record.resource}</p>
                    {record.detail && <p className={`mt-0.5 text-xs ${denied ? "text-danger" : "text-muted"}`}>{record.detail}</p>}
                  </Table.Cell>
                  <Table.Cell>
                    <StatusChip status={record.outcome} />
                  </Table.Cell>
                  {showTrace && (
                    <Table.Cell>
                      <span className="font-mono text-[13px]">
                        <TextLink to={buildPath(routes.control.trace, { traceId: record.traceId })}>{record.traceId}</TextLink>
                      </span>
                    </Table.Cell>
                  )}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
