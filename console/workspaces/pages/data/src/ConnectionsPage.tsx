import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { useListConnections } from "@workspacenow/api-client";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip } from "@workspacenow/views";

export function ConnectionsPage() {
  const connections = useListConnections();
  return (
    <PageLayout
      title="Connections"
      description="Managed connections hold WorkspaceNow's application data; external ones reach data other systems own."
    >
      <SectionCard flush>
        <QueryState query={connections}>
          {(data) =>
            data.items.length === 0 ? (
              <NoDataFound message="No connections configured." />
            ) : (
              <TableContainer aria-label="Connections">
                <Table className="min-w-[760px]">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Engine</TableHeader>
                      <TableHeader>Host</TableHeader>
                      <TableHeader>Ownership</TableHeader>
                      <TableHeader>Environment</TableHeader>
                      <TableHeader>Status</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((c) => (
                      <TableRow key={c.id} id={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          <Tag size="sm" type="gray">
                            {c.engine}
                          </Tag>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{c.host}</TableCell>
                        <TableCell className="text-muted">{c.managed ? "Managed by WorkspaceNow" : "External"}</TableCell>
                        <TableCell className="capitalize">{c.environment}</TableCell>
                        <TableCell>
                          <StatusChip status={c.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          }
        </QueryState>
      </SectionCard>
    </PageLayout>
  );
}
