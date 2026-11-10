import { InlineNotification, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { useListModelProviders } from "@workspacenow/api-client";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, formatNumber } from "@workspacenow/views";

export function ModelsPage() {
  const providers = useListModelProviders();
  return (
    <PageLayout title="Models" description="Model gateway: providers, routing and usage.">
      <div className="grid gap-6">
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          subtitle="WorkspaceNow does not require a particular model provider. Use hosted providers with your own API credentials, or point the gateway at self-hosted endpoints inside your network."
        />
        <SectionCard flush>
          <QueryState query={providers}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No model providers configured." />
              ) : (
                <TableContainer aria-label="Model providers">
                  <Table className="min-w-[960px]">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Provider</TableHeader>
                        <TableHeader>Kind</TableHeader>
                        <TableHeader>Endpoint</TableHeader>
                        <TableHeader>Models</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader className="text-right">Tokens this month</TableHeader>
                        <TableHeader className="text-right">Cost this month</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.items.map((p) => (
                        <TableRow key={p.id} id={p.id}>
                          <TableCell className="font-medium whitespace-nowrap">{p.name}</TableCell>
                          <TableCell>
                            <Tag size="sm" type="gray" className="whitespace-nowrap">
                              {p.kind === "hosted" ? "Hosted" : "Self-hosted"}
                            </Tag>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <span className="block max-w-60 truncate" title={p.endpoint}>
                              {p.endpoint}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex max-w-80 flex-wrap gap-1">
                              {p.models.map((m) => (
                                <Tag key={m} size="sm" type="gray" className="font-mono whitespace-nowrap">
                                  {m}
                                </Tag>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusChip status={p.status} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(p.tokensThisMonth)}</TableCell>
                          <TableCell className="text-right tabular-nums">${p.costThisMonthUsd.toFixed(2)}</TableCell>
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
    </PageLayout>
  );
}
