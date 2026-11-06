import { Alert, Chip, Table } from "@heroui/react";
import { useListModelProviders } from "@workspacenow/api-client";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, formatNumber } from "@workspacenow/views";

export function ModelsPage() {
  const providers = useListModelProviders();
  return (
    <PageLayout title="Models" description="Model gateway: providers, routing and usage.">
      <div className="grid gap-6">
        <Alert>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              WorkspaceNow does not require a particular model provider. Use hosted providers with your own API credentials, or point the
              gateway at self-hosted endpoints inside your network.
            </Alert.Description>
          </Alert.Content>
        </Alert>
        <SectionCard flush>
          <QueryState query={providers}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No model providers configured." />
              ) : (
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Model providers" className="min-w-[960px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Provider</Table.Column>
                        <Table.Column>Kind</Table.Column>
                        <Table.Column>Endpoint</Table.Column>
                        <Table.Column>Models</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column className="text-right">Tokens this month</Table.Column>
                        <Table.Column className="text-right">Cost this month</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((p) => (
                          <Table.Row key={p.id} id={p.id}>
                            <Table.Cell className="font-medium whitespace-nowrap">{p.name}</Table.Cell>
                            <Table.Cell>
                              <Chip size="sm" variant="secondary" className="whitespace-nowrap">
                                {p.kind === "hosted" ? "Hosted" : "Self-hosted"}
                              </Chip>
                            </Table.Cell>
                            <Table.Cell className="max-w-60 truncate font-mono text-xs" title={p.endpoint}>
                              {p.endpoint}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex max-w-80 flex-wrap gap-1">
                                {p.models.map((m) => (
                                  <Chip key={m} size="sm" variant="secondary" className="font-mono whitespace-nowrap">
                                    {m}
                                  </Chip>
                                ))}
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <StatusChip status={p.status} />
                            </Table.Cell>
                            <Table.Cell className="text-right tabular-nums">{formatNumber(p.tokensThisMonth)}</Table.Cell>
                            <Table.Cell className="text-right tabular-nums">${p.costThisMonthUsd.toFixed(2)}</Table.Cell>
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
      </div>
    </PageLayout>
  );
}
