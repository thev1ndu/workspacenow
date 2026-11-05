import { Alert, Button, Table } from "@heroui/react";
import { Key, PlugConnection } from "@workspacenow/icons";
import { useListIntegrations, useTestIntegration } from "@workspacenow/api-client";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, formatRelative } from "@workspacenow/views";

export function IntegrationsPage() {
  const integrations = useListIntegrations();
  const test = useTestIntegration();

  return (
    <PageLayout title="Integrations" description="Connections to external systems, with retry and timeout policies.">
      <div className="grid gap-6">
        <Alert>
          <Alert.Indicator>
            <Key className="size-4" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Description>
              Credentials live in the configured secrets manager. WorkspaceNow stores only a reference, never the secret itself.
            </Alert.Description>
          </Alert.Content>
        </Alert>
        <SectionCard flush>
          <QueryState query={integrations}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No integrations configured." />
              ) : (
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Integrations" className="min-w-[860px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Name</Table.Column>
                        <Table.Column>Target and secret</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>Policy</Table.Column>
                        <Table.Column className="text-right">Actions</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((i) => (
                          <Table.Row key={i.id} id={i.id}>
                            <Table.Cell>
                              <p className="font-medium">{i.name}</p>
                              <p className="mt-0.5 text-xs text-muted">
                                {i.kind.charAt(0).toUpperCase() + i.kind.slice(1).replace(/-/g, " ")} · tested {formatRelative(i.lastTestedAt)}
                              </p>
                            </Table.Cell>
                            <Table.Cell className="max-w-[380px]">
                              <p className="truncate font-mono text-xs" title={i.target}>
                                {i.target}
                              </p>
                              <p className="mt-0.5 truncate font-mono text-xs text-muted">{i.secretRef}</p>
                            </Table.Cell>
                            <Table.Cell>
                              <StatusChip status={i.status} />
                            </Table.Cell>
                            <Table.Cell>
                              <p>{i.retryPolicy}</p>
                              <p className="mt-0.5 text-xs text-muted">Timeout {i.timeoutMs.toLocaleString()} ms</p>
                            </Table.Cell>
                            <Table.Cell className="text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                isPending={test.isPending && test.variables === i.id}
                                onPress={() => test.mutate(i.id)}
                              >
                                <PlugConnection className="size-3.5" aria-hidden />
                                Test connection
                              </Button>
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
      </div>
    </PageLayout>
  );
}
