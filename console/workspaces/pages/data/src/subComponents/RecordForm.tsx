import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Alert, Button, Modal } from "@heroui/react";
import { useQueries } from "@tanstack/react-query";
import { useAuthHooks } from "@workspacenow/auth";
import { downloadRecordFile, listRecords, uploadRecordFile, useListRecords } from "@workspacenow/api-client";
import type { Entity, EntityField, EntityRecord, FieldValue, FileRef } from "@workspacenow/types";
import { SelectInput, TextInput, errorMessage } from "@workspacenow/views";

/** The human-readable name of a record, by the entity's most descriptive field. */
export function recordLabel(record: EntityRecord): string {
  const v = record.values;
  return String(v.name ?? v.orderNumber ?? v.sku ?? v.receipt ?? v.fullName ?? v.title ?? v.subject ?? v.tag ?? record.id);
}

/** Labels for every record an entity's reference fields can point to, keyed by entity then id. */
export function useReferenceLabels(entity?: Entity): Record<string, Record<string, string>> {
  const { getToken } = useAuthHooks();
  const targets = [...new Set((entity?.fields ?? []).filter((f) => f.type === "reference" && f.reference).map((f) => f.reference!))];
  const results = useQueries({
    queries: targets.map((entityName) => ({
      queryKey: ["records", { entityName }],
      queryFn: () => listRecords({ entityName }, getToken),
      retry: false,
    })),
  });
  const labels: Record<string, Record<string, string>> = {};
  targets.forEach((target, i) => {
    labels[target] = Object.fromEntries((results[i].data?.items ?? []).map((r) => [r.id, recordLabel(r)]));
  });
  return labels;
}

function ReferenceSelect({ field, value, onChange }: { field: EntityField; value: string; onChange: (v: string) => void }) {
  const { data, error } = useListRecords({ entityName: field.reference });
  return (
    <SelectInput
      label={field.label}
      required={field.required}
      value={value}
      onChange={onChange}
      helperText={error ? `You cannot read ${field.reference} records: ${errorMessage(error)}` : `References ${field.reference}`}
      options={(data?.items ?? []).map((r) => ({ value: r.id, label: `${recordLabel(r)} (${r.id})` }))}
    />
  );
}

/** A file field: uploads into object storage, the record stores only the FileRef; click the name to download. */
function FileInput({
  field,
  value,
  entityName,
  recordId,
  onChange,
}: {
  field: EntityField;
  value: string;
  entityName: string;
  recordId?: string;
  onChange: (v: string) => void;
}) {
  const { getToken } = useAuthHooks();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  let ref: FileRef | undefined;
  try {
    ref = value ? (JSON.parse(value) as FileRef) : undefined;
  } catch {
    ref = undefined;
  }
  const upload = async (f: File) => {
    if (!recordId) {
      setError("Save the record first, then attach a file");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const record = await uploadRecordFile({ entityName, recordId, field: field.name, name: f.name }, bytes, getToken);
      const v = record.values[field.name];
      onChange(typeof v === "string" ? v : "");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const download = async () => {
    if (!recordId) return;
    const res = await downloadRecordFile({ entityName, recordId, field: field.name }, getToken);
    const url = URL.createObjectURL(new Blob([res.bytes as BlobPart], { type: res.contentType }));
    const a = document.createElement("a");
    a.href = url;
    a.download = ref?.name ?? "file";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="grid gap-1">
      <label className="text-xs font-medium">{field.label}</label>
      <div className="flex items-center gap-2">
        <input
          type="file"
          aria-label={field.label}
          disabled={busy || !recordId}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        {busy && <span className="text-xs text-muted">Uploading…</span>}
        {ref && (
          <button type="button" className="text-xs text-accent underline" onClick={() => void download()}>
            {ref.name} ({Math.round(ref.sizeBytes / 1024)} KB)
          </button>
        )}
      </div>
      {!!error && <span className="text-xs text-danger">{error}</span>}
      {!recordId && <span className="text-xs text-muted">Save the record first, then attach a file</span>}
    </div>
  );
}

export function FieldInput({
  field,
  value,
  onChange,
  entityName,
  recordId,
}: {
  field: EntityField;
  value: string;
  onChange: (v: string) => void;
  entityName?: string;
  recordId?: string;
}) {
  switch (field.type) {
    case "qr":
      // QR fields render as a scannable code of the record id; the value is the record id itself.
      return (
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">{field.label}</span>
          {recordId ? (
            <QRCodeSVG value={`${entityName ?? ""}/${recordId}`} size={160} className="rounded-lg bg-white p-2" />
          ) : (
            <span className="text-xs text-muted">Save the record first — the QR code is generated from its id</span>
          )}
        </div>
      );
    case "file":
      return <FileInput field={field} value={value} entityName={entityName ?? ""} recordId={recordId} onChange={onChange} />;
    case "reference":
      return <ReferenceSelect field={field} value={value} onChange={onChange} />;
    case "enum":
      return (
        <SelectInput
          label={field.label}
          required={field.required}
          value={value}
          onChange={onChange}
          options={(field.enumValues ?? []).map((v) => ({ value: v, label: v }))}
        />
      );
    case "boolean":
      return (
        <SelectInput
          label={field.label}
          required={field.required}
          value={value}
          onChange={onChange}
          options={[
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]}
        />
      );
    default:
      return (
        <TextInput
          label={field.label}
          required={field.required}
          value={value}
          onChange={onChange}
          multiline={field.type === "text"}
          rows={field.type === "text" ? 3 : undefined}
          type={field.type === "number" || field.type === "integer" ? "number" : field.type === "date" ? "date" : undefined}
          helperText={field.unique ? "Must be unique" : undefined}
        />
      );
  }
}

function initialValues(entity: Entity, record?: EntityRecord): Record<string, string> {
  return Object.fromEntries(
    entity.fields.map((f) => {
      const v = record?.values[f.name] ?? f.defaultValue;
      return [f.name, v === null || v === undefined ? "" : String(v)];
    }),
  );
}

/** A form generated from the entity definition; the Entity Runtime validates on save. */
export function RecordForm({
  entity,
  record,
  onSubmit,
  isPending,
  error,
  submitLabel = "Save",
  onCancel,
}: {
  entity: Entity;
  record?: EntityRecord;
  onSubmit: (values: Record<string, FieldValue>) => void;
  isPending?: boolean;
  error?: unknown;
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(entity, record));
  useEffect(() => setValues(initialValues(entity, record)), [entity, record]);

  return (
    <div className="grid gap-4">
      {entity.fields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          value={values[field.name] ?? ""}
          onChange={(v) => setValues((prev) => ({ ...prev, [field.name]: v }))}
          entityName={entity.name}
          recordId={record?.id}
        />
      ))}
      {!!error && <ErrorAlert error={error} />}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="tertiary" onPress={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          isPending={isPending}
          onPress={() => onSubmit(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" ? null : v])))}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** A rejected save, as the platform explained it. */
export function ErrorAlert({ error }: { error: unknown }) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{errorMessage(error)}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function RecordFormDialog({
  open,
  entity,
  record,
  onClose,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  entity: Entity;
  record?: EntityRecord;
  onClose: () => void;
  onSubmit: (values: Record<string, FieldValue>) => void;
  isPending?: boolean;
  error?: unknown;
}) {
  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(next) => !next && onClose()}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{record ? `Edit ${entity.label.toLowerCase()} ${record.id}` : `New ${entity.label.toLowerCase()}`}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <RecordForm entity={entity} record={record} onSubmit={onSubmit} isPending={isPending} error={error} onCancel={onClose} />
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
