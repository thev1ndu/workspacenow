import { InlineNotification, Stack, Tag } from "@carbon/react";
import { useListModelProviders } from "@workspacenow/api-client";
import { PageLayout, QueryState, SectionCard, StatusChip, formatNumber } from "@workspacenow/views";
import { PagedTable } from "./subComponents/ResourceTable";

import common from "./common.module.scss";

export function ModelsPage() {
  const providers = useListModelProviders();
  return (
    <PageLayout title="Models" description="Model gateway: providers, routing and usage.">
      <Stack gap={6}>
        <InlineNotification
          className={common.notice}
          kind="info"
          lowContrast
          hideCloseButton
          subtitle="WorkspaceNow does not require a particular model provider. Use hosted providers with your own API credentials, or point the gateway at self-hosted endpoints inside your network."
        />
        <SectionCard flush>
          <QueryState query={providers}>
            {(data) => (
              <PagedTable
                label="Model providers"
                items={data.items}
                rowKey={(p) => p.id}
                emptyMessage="No model providers configured."
                searchPlaceholder="Search providers"
                searchText={(p) => `${p.name} ${p.kind} ${p.endpoint} ${p.models.join(" ")} ${p.status}`}
                columns={[
                  { key: "name", header: "Provider", nowrap: true, cell: (p) => p.name },
                  {
                    key: "kind",
                    header: "Kind",
                    cell: (p) => (
                      <Tag size="sm" type="gray">
                        {p.kind === "hosted" ? "Hosted" : "Self-hosted"}
                      </Tag>
                    ),
                  },
                  {
                    key: "endpoint",
                    header: "Endpoint",
                    cell: (p) => (
                      <span className={`${common.mono} ${common.truncate}`} title={p.endpoint}>
                        {p.endpoint}
                      </span>
                    ),
                  },
                  {
                    key: "models",
                    header: "Models",
                    cell: (p) => (
                      <div className={common.wrap}>
                        {p.models.map((m) => (
                          <Tag key={m} size="sm" type="gray">
                            {m}
                          </Tag>
                        ))}
                      </div>
                    ),
                  },
                  { key: "status", header: "Status", cell: (p) => <StatusChip status={p.status} /> },
                  { key: "tokens", header: "Tokens this month", end: true, cell: (p) => <span className={common.numeric}>{formatNumber(p.tokensThisMonth)}</span> },
                  { key: "cost", header: "Cost this month", end: true, cell: (p) => <span className={common.numeric}>${p.costThisMonthUsd.toFixed(2)}</span> },
                ]}
              />
            )}
          </QueryState>
        </SectionCard>
      </Stack>
    </PageLayout>
  );
}
