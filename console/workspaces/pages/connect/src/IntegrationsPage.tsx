import { useState } from "react";
import { Alert, Button, Chip, Table } from "@heroui/react";
import { Eye, Key, Pencil, PlugConnection, Plus } from "@workspacenow/icons";
import { useCan, useListIntegrations, useListSecrets, useTestIntegration } from "@workspacenow/api-client";
import type { Integration } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TableSkeleton, formatRelative } from "@workspacenow/views";
import { IntegrationDialog } from "./subComponents/IntegrationDialog";
import { SecretValuesDialog } from "./subComponents/SecretValuesDialog";

export function IntegrationsPage() {
  const integrations = useListIntegrations();
  const secrets = useListSecrets();
  const test = useTestIntegration();
  const canManage = useCan("connect.manage");
  const canReadSecrets = useCan("control.manage");
  const [editing, setEditing] = useState<Integration | "new" | undefined>();
  const [viewingSecret, setViewingSecret] = useState<string>();

  return (
    <PageLayout
      title="Integrations"
      description="Connections to external systems, with retry and timeout policies. Credentials live in OpenBao; only references are stored here."
      actions={
        <Button isDisabled={!canManage} onPress={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden />
          New integration
        </Button>
      }
    >
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
                              <Button size="sm" variant="ghost" aria-label={`Edit ${i.name}`} isDisabled={!canManage} onPress={() => setEditing(i)}>
                                <Pencil className="size-3.5" aria-hidden />
                              </Button>
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

        <SectionCard
          title="OpenBao secrets"
          subtitle="Credential references integrations may use. Values are readable only by control.manage and are audited on read."
          flush
        >
          <QueryState query={secrets} skeleton={<TableSkeleton columns={2} />}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No secrets found in the configured OpenBao mount." />
              ) : (
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="OpenBao secrets" className="min-w-[520px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Reference</Table.Column>
                        <Table.Column className="text-right"> </Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((p) => (
                          <Table.Row key={p} id={p}>
                            <Table.Cell>
                              <Chip size="sm" variant="secondary" className="font-mono text-xs">
                                {p}
                              </Chip>
                            </Table.Cell>
                            <Table.Cell className="text-right">
                              <Button size="sm" variant="ghost" isDisabled={!canReadSecrets} onPress={() => setViewingSecret(p)}>
                                <Eye className="size-3.5" aria-hidden />
                                View values
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

      {editing && <IntegrationDialog onClose={() => setEditing(undefined)} integration={editing === "new" ? undefined : editing} />}
      {viewingSecret && <SecretValuesDialog path={viewingSecret} onClose={() => setViewingSecret(undefined)} />}
    </PageLayout>
  );
}
