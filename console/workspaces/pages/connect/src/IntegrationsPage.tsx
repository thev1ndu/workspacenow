import { View, Edit, Plug, Add } from "@carbon/react/icons";
import { useState } from "react";
import { Button, CodeSnippet, InlineLoading, InlineNotification, Stack } from "@carbon/react";

import { useCan, useListIntegrations, useListSecrets, useTestIntegration } from "@workspacenow/api-client";
import type { Integration } from "@workspacenow/types";
import { PageLayout, QueryState, SectionCard, StatusChip, TableSkeleton, formatRelative } from "@workspacenow/views";
import { IntegrationDialog } from "./subComponents/IntegrationDialog";
import { PagedTable } from "./subComponents/ResourceTable";
import { SecretValuesDialog } from "./subComponents/SecretValuesDialog";

import common from "./common.module.scss";

const kindLabel = (kind: string) => kind.charAt(0).toUpperCase() + kind.slice(1).replace(/-/g, " ");

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
        <Button renderIcon={Add} disabled={!canManage} onClick={() => setEditing("new")}>
          New integration
        </Button>
      }
    >
      <Stack gap={6}>
        <InlineNotification
          className={common.notice}
          kind="info"
          lowContrast
          hideCloseButton
          subtitle="Credentials live in the configured secrets manager. WorkspaceNow stores only a reference, never the secret itself."
        />
        <SectionCard flush>
          <QueryState query={integrations}>
            {(data) => (
              <PagedTable
                label="Integrations"
                items={data.items}
                rowKey={(i) => i.id}
                emptyMessage="No integrations configured."
                searchPlaceholder="Search integrations"
                searchText={(i) => `${i.name} ${i.kind} ${i.target} ${i.secretRef} ${i.status} ${i.retryPolicy}`}
                columns={[
                  {
                    key: "name",
                    header: "Name",
                    cell: (i) => (
                      <Stack gap={1}>
                        <span>{i.name}</span>
                        <span className={common.secondary}>
                          {kindLabel(i.kind)} · tested {formatRelative(i.lastTestedAt)}
                        </span>
                      </Stack>
                    ),
                  },
                  {
                    key: "target",
                    header: "Target and secret",
                    cell: (i) => (
                      <Stack gap={1}>
                        <span className={`${common.mono} ${common.truncate}`} title={i.target}>
                          {i.target}
                        </span>
                        <span className={`${common.mono} ${common.secondary} ${common.truncate}`}>{i.secretRef}</span>
                      </Stack>
                    ),
                  },
                  { key: "status", header: "Status", cell: (i) => <StatusChip status={i.status} /> },
                  {
                    key: "policy",
                    header: "Policy",
                    cell: (i) => (
                      <Stack gap={1}>
                        <span>{i.retryPolicy}</span>
                        <span className={common.secondary}>Timeout {i.timeoutMs.toLocaleString()} ms</span>
                      </Stack>
                    ),
                  },
                  {
                    key: "actions",
                    header: "Actions",
                    end: true,
                    nowrap: true,
                    cell: (i) => (
                      <span className={common.inline}>
                        <Button
                          kind="ghost"
                          size="sm"
                          hasIconOnly
                          iconDescription={`Edit ${i.name}`}
                          renderIcon={Edit}
                          disabled={!canManage}
                          onClick={() => setEditing(i)}
                        />
                        {test.isPending && test.variables === i.id ? (
                          <InlineLoading description="Testing connection" />
                        ) : (
                          <Button kind="ghost" size="sm" renderIcon={Plug} onClick={() => test.mutate(i.id)}>
                            Test connection
                          </Button>
                        )}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </QueryState>
        </SectionCard>

        <SectionCard
          title="OpenBao secrets"
          subtitle="Credential references integrations may use. Values are readable only by control.manage and are audited on read."
          flush
        >
          <QueryState query={secrets} skeleton={<TableSkeleton columns={2} />}>
            {(data) => (
              <PagedTable
                label="OpenBao secrets"
                items={data.items}
                rowKey={(p) => p}
                emptyMessage="No secrets found in the configured OpenBao mount."
                searchPlaceholder="Search secrets"
                searchText={(p) => p}
                columns={[
                  {
                    key: "reference",
                    header: "Reference",
                    cell: (p) => (
                      <CodeSnippet type="inline" feedback="Copied">
                        {p}
                      </CodeSnippet>
                    ),
                  },
                  {
                    key: "actions",
                    header: "Actions",
                    end: true,
                    cell: (p) => (
                      <Button kind="ghost" size="sm" renderIcon={View} disabled={!canReadSecrets} onClick={() => setViewingSecret(p)}>
                        View values
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </QueryState>
        </SectionCard>
      </Stack>

      {editing && <IntegrationDialog onClose={() => setEditing(undefined)} integration={editing === "new" ? undefined : editing} />}
      {viewingSecret && <SecretValuesDialog path={viewingSecret} onClose={() => setViewingSecret(undefined)} />}
    </PageLayout>
  );
}
