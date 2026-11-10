import { Grid, Add, QrCode, ShoppingCart } from "@carbon/react/icons";
import { useState } from "react";
import { Button, IconButton, InlineNotification } from "@carbon/react";
import { Close } from "@carbon/react/icons";

import { useCreateRecord, useGetEntity, useListRecords } from "@workspacenow/api-client";
import type { AppPage, EntityRecord } from "@workspacenow/types";
import { Metric, MetricGrid, NoDataFound, QueryState, SectionCard } from "@workspacenow/views";
import { RecordForm, RecordFormDialog, RecordsManager, useReferenceLabels } from "@workspacenow/data";
import { QrCodeDialog } from "./QrCodeDialog";
import { SaleDialog } from "./SaleDialog";
import { ScanPage } from "./ScanPage";
import { TillPage } from "./TillPage";

/**
 * Renders one blueprint page from its entity definition, the way the shared runtime would.
 * `qrField` is set when the application scans this entity, so each record can show its QR code.
 */
export function PreviewPageRenderer({ page, qrField }: { page: AppPage; qrField?: string }) {
  const entity = useGetEntity({ entityName: page.entity });
  const records = useListRecords({ entityName: page.entity });
  const labels = useReferenceLabels(entity.data);
  const createRecord = useCreateRecord();
  const [creating, setCreating] = useState(false);
  const [selling, setSelling] = useState<EntityRecord | null>(null);
  const [showingQr, setShowingQr] = useState<EntityRecord | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);

  if (!page.entity) return <NoDataFound message="This page is not bound to an entity." />;

  return (
    <QueryState query={entity}>
      {(e) => {
        const readOnly = e.scope === "external";
        if (page.kind === "form") {
          return (
            <SectionCard title={page.title} subtitle={`Creates a ${e.label.toLowerCase()} through ${e.name}.create`}>
              {saved && (
                <div className="mb-4 flex items-start gap-2">
                  <InlineNotification kind="success" lowContrast hideCloseButton title={`Saved ${saved}.`} className="flex-1" />
                  <IconButton kind="ghost" label="Dismiss" aria-label="Dismiss" onClick={() => setSaved(null)}>
                    <Close size={16} aria-hidden />
                  </IconButton>
                </div>
              )}
              <RecordForm
                key={formKey}
                entity={e}
                isPending={createRecord.isPending}
                error={createRecord.error}
                submitLabel={`Create ${e.label.toLowerCase()}`}
                onSubmit={(values) =>
                  createRecord.mutate(
                    { entityName: e.name, values },
                    {
                      onSuccess: (record) => {
                        setSaved(record.id);
                        setFormKey((k) => k + 1);
                      },
                    },
                  )
                }
              />
            </SectionCard>
          );
        }
        if (page.kind === "pos") return <TillPage />;
        if (page.kind === "scan") {
          return page.scan ? <ScanPage title={page.title} entity={e} scan={page.scan} /> : <NoDataFound message="This scan page has no QR field set." />;
        }
        if (page.kind === "dashboard") {
          return (
            <MetricGrid columns={3}>
              <Metric label={`${e.label} records`} value={records.data?.total ?? "—"} icon={<Grid />} />
            </MetricGrid>
          );
        }
        return (
          <SectionCard
            title={page.title}
            actions={
              !readOnly && (
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Add className="size-3.5" aria-hidden />
                  New {e.label.toLowerCase()}
                </Button>
              )
            }
            flush
          >
            <QueryState query={records}>
              {(data) => (
                <RecordsManager
                  entity={e}
                  records={data.items}
                  labels={labels}
                  extraActions={(record) => [
                    ...(qrField ? [{ id: "qr", label: "QR code", icon: <QrCode />, onAction: () => setShowingQr(record) }] : []),
                    ...(e.name === "Stock" ? [{ id: "sale", label: "Record sale", icon: <ShoppingCart />, onAction: () => setSelling(record) }] : []),
                  ]}
                />
              )}
            </QueryState>
            {creating && (
              <RecordFormDialog
                open
                entity={e}
                onClose={() => {
                  setCreating(false);
                  createRecord.reset();
                }}
                isPending={createRecord.isPending}
                error={createRecord.error}
                onSubmit={(values) => createRecord.mutate({ entityName: e.name, values }, { onSuccess: () => setCreating(false) })}
              />
            )}
            {showingQr && (
              <QrCodeDialog
                title={`${e.label} ${showingQr.id}`}
                code={qrField === "id" ? showingQr.id : String(showingQr.values[qrField!] ?? "")}
                onClose={() => setShowingQr(null)}
              />
            )}
            {selling && (
              <SaleDialog
                stock={selling}
                label={labels.Product?.[String(selling.values.product)] ?? String(selling.values.product)}
                onClose={() => setSelling(null)}
              />
            )}
          </SectionCard>
        );
      }}
    </QueryState>
  );
}
