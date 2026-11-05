import { Chip, Table } from "@heroui/react";
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
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Connections" className="min-w-[760px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Name</Table.Column>
                      <Table.Column>Engine</Table.Column>
                      <Table.Column>Host</Table.Column>
                      <Table.Column>Ownership</Table.Column>
                      <Table.Column>Environment</Table.Column>
                      <Table.Column>Status</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {data.items.map((c) => (
                        <Table.Row key={c.id} id={c.id}>
                          <Table.Cell className="font-medium">{c.name}</Table.Cell>
                          <Table.Cell>
                            <Chip size="sm" variant="secondary">
                              {c.engine}
                            </Chip>
                          </Table.Cell>
                          <Table.Cell className="font-mono text-xs">{c.host}</Table.Cell>
                          <Table.Cell className="text-muted">{c.managed ? "Managed by WorkspaceNow" : "External"}</Table.Cell>
                          <Table.Cell className="capitalize">{c.environment}</Table.Cell>
                          <Table.Cell>
                            <StatusChip status={c.status} />
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
      </SectionCard>
    </PageLayout>
  );
}
