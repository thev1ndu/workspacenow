import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { buildPath, routes, type AuditRecord } from "@workspacenow/types";
import { ActorLabel, NoDataFound, StatusChip, TextLink, formatDateTime, formatShortDateTime } from "@workspacenow/views";

export function AuditTable({ records, showTrace = true }: { records: AuditRecord[]; showTrace?: boolean }) {
  if (records.length === 0) return <NoDataFound message="No audit records match." />;
  return (
    <div>
      <TableContainer>
        <Table aria-label="Audit records" className="min-w-[820px]">
          <TableHead>
            <TableRow>
              <TableHeader>Time</TableHeader>
              <TableHeader scope="row">Actor</TableHeader>
              <TableHeader>Entry point</TableHeader>
              <TableHeader>Action and resource</TableHeader>
              <TableHeader>Outcome</TableHeader>
              {showTrace && <TableHeader>Trace</TableHeader>}
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => {
              const denied = record.outcome === "denied";
              return (
                <TableRow key={record.id} id={record.id} className={denied ? "bg-danger-soft/40" : undefined}>
                  <TableCell className="whitespace-nowrap text-muted">
                    <time dateTime={record.time} title={formatDateTime(record.time)}>
                      {formatShortDateTime(record.time)}
                    </time>
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
                  <TableCell className="max-w-sm">
                    <p className="font-mono text-[13px]">{record.action}</p>
                    <p className="font-mono text-xs text-muted">{record.resource}</p>
                    {record.detail && <p className={`mt-0.5 text-xs ${denied ? "text-danger" : "text-muted"}`}>{record.detail}</p>}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={record.outcome} />
                  </TableCell>
                  {showTrace && (
                    <TableCell>
                      <span className="font-mono text-[13px]">
                        <TextLink to={buildPath(routes.control.trace, { traceId: record.traceId })}>{record.traceId}</TextLink>
                      </span>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
