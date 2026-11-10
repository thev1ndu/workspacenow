import { useState } from "react";
import { Button, InlineNotification, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { Eye, Pencil, PlugConnection, Plus } from "@workspacenow/icons";
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
        <Button disabled={!canManage} onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden />
          New integration
        </Button>
      }
    >
      <div className="grid gap-6">
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          subtitle="Credentials live in the configured secrets manager. WorkspaceNow stores only a reference, never the secret itself."
        />
        <SectionCard flush>
          <QueryState query={integrations}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No integrations configured." />
              ) : (
                <TableContainer>
                  <Table aria-label="Integrations" className="min-w-[860px]">
                    <TableHead>
                      <TableRow>
                        <TableHeader scope="col">Name</TableHeader>
                        <TableHeader scope="col">Target and secret</TableHeader>
                        <TableHeader scope="col">Status</TableHeader>
                        <TableHeader scope="col">Policy</TableHeader>
                        <TableHeader scope="col" className="text-right">
                          Actions
                        </TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.items.map((i) => (
                        <TableRow key={i.id} id={i.id}>
                          <TableCell>
                            <p className="font-medium">{i.name}</p>
                            <p className="mt-0.5 text-xs text-muted">
                              {i.kind.charAt(0).toUpperCase() + i.kind.slice(1).replace(/-/g, " ")} · tested {formatRelative(i.lastTestedAt)}
                            </p>
                          </TableCell>
                          <TableCell className="max-w-[380px]">
                            <p className="truncate font-mono text-xs" title={i.target}>
                              {i.target}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-xs text-muted">{i.secretRef}</p>
                          </TableCell>
                          <TableCell>
                            <StatusChip status={i.status} />
                          </TableCell>
                          <TableCell>
                            <p>{i.retryPolicy}</p>
                            <p className="mt-0.5 text-xs text-muted">Timeout {i.timeoutMs.toLocaleString()} ms</p>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              kind="ghost"
                              size="sm"
                              hasIconOnly
                              iconDescription={`Edit ${i.name}`}
                              renderIcon={() => <Pencil className="size-3.5" aria-hidden />}
                              disabled={!canManage}
                              onClick={() => setEditing(i)}
                            />
                            <Button
                              kind="ghost"
                              size="sm"
                              disabled={test.isPending && test.variables === i.id}
                              onClick={() => test.mutate(i.id)}
                            >
                              <PlugConnection className="size-3.5" aria-hidden />
                              Test connection
                            </Button>
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
                <TableContainer>
                  <Table aria-label="OpenBao secrets" className="min-w-[520px]">
                    <TableHead>
                      <TableRow>
                        <TableHeader scope="col">Reference</TableHeader>
                        <TableHeader scope="col" className="text-right">
                          {" "}
                        </TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.items.map((p) => (
                        <TableRow key={p} id={p}>
                          <TableCell>
                            <Tag size="sm" type="gray" className="font-mono text-xs">
                              {p}
                            </Tag>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button kind="ghost" size="sm" disabled={!canReadSecrets} onClick={() => setViewingSecret(p)}>
                              <Eye className="size-3.5" aria-hidden />
                              View values
                            </Button>
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
      </div>

      {editing && <IntegrationDialog onClose={() => setEditing(undefined)} integration={editing === "new" ? undefined : editing} />}
      {viewingSecret && <SecretValuesDialog path={viewingSecret} onClose={() => setViewingSecret(undefined)} />}
    </PageLayout>
  );
}
