import { Download } from "@carbon/react/icons";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useId, useState } from "react";
import {
  Button,
  ButtonSet,
  ComboBox,
  DatePicker,
  DatePickerInput,
  FileUploaderButton,
  Form,
  FormItem,
  FormLabel,
  InlineLoading,
  InlineNotification,
  Modal,
  NumberInput,
  Stack,
  Toggle,
} from "@carbon/react";
import { useQueries } from "@tanstack/react-query";
import { useAuthHooks } from "@workspacenow/auth";
import { downloadRecordFile, listRecords, uploadRecordFile, useListRecords } from "@workspacenow/api-client";
import type { Entity, EntityField, EntityRecord, FieldValue, FileRef } from "@workspacenow/types";
import { SelectInput, TextInput, errorMessage, type SelectOption } from "@workspacenow/views";

import common from "../common.module.scss";

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
  const id = useId();
  const { data, error } = useListRecords({ entityName: field.reference });
  const options: SelectOption[] = (data?.items ?? []).map((r) => ({ value: r.id, label: `${recordLabel(r)} (${r.id})` }));
  return (
    <ComboBox
      id={id}
      titleText={field.required ? `${field.label} *` : field.label}
      placeholder="Search records"
      items={options}
      itemToString={(item) => item?.label ?? ""}
      selectedItem={options.find((o) => o.value === value) ?? null}
      onChange={({ selectedItem }) => onChange(selectedItem?.value ?? "")}
      shouldFilterItem={({ item, inputValue }) => item.label.toLowerCase().includes((inputValue ?? "").toLowerCase())}
      helperText={error ? undefined : `References ${field.reference}`}
      invalid={!!error}
      invalidText={error ? `You cannot read ${field.reference} records: ${errorMessage(error)}` : undefined}
    />
  );
}

/** A file field: uploads into object storage, the record stores only the FileRef; use the button to download. */
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
    <FormItem>
      <FormLabel>{field.label}</FormLabel>
      <Stack gap={3}>
        <div className={common.row}>
          <FileUploaderButton
            labelText={ref ? "Replace file" : "Choose file"}
            buttonKind="tertiary"
            size="md"
            disableLabelChanges
            disabled={busy || !recordId}
            name={field.name}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
          {busy && <InlineLoading description="Uploading..." />}
          {ref && (
            <Button kind="ghost" size="md" renderIcon={Download} onClick={() => void download()}>
              {ref.name} ({Math.round(ref.sizeBytes / 1024)} KB)
            </Button>
          )}
        </div>
        {!!error && <InlineNotification kind="error" lowContrast hideCloseButton title={error} />}
        {!recordId && <p className={common.helper}>Save the record first, then attach a file</p>}
      </Stack>
    </FormItem>
  );
}

function NumberField({ field, value, onChange }: { field: EntityField; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <NumberInput
      id={id}
      label={field.required ? `${field.label} *` : field.label}
      value={value}
      allowEmpty
      step={field.type === "integer" ? 1 : 0.01}
      helperText={field.unique ? "Must be unique" : undefined}
      onChange={(_e, state) => onChange(String(state.value))}
    />
  );
}

function DateField({ field, value, onChange }: { field: EntityField; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <DatePicker datePickerType="single" dateFormat="Y-m-d" value={value.slice(0, 10)} onChange={(_dates, dateStr) => onChange(dateStr)}>
      <DatePickerInput
        id={id}
        labelText={field.required ? `${field.label} *` : field.label}
        placeholder="yyyy-mm-dd"
        helperText={field.unique ? "Must be unique" : undefined}
      />
    </DatePicker>
  );
}

function BooleanField({ field, value, onChange }: { field: EntityField; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return <Toggle id={id} labelText={field.required ? `${field.label} *` : field.label} labelA="No" labelB="Yes" toggled={value === "true"} onToggle={(checked) => onChange(String(checked))} />;
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
        <FormItem>
          <FormLabel>{field.label}</FormLabel>
          {recordId ? (
            <QRCodeSVG value={`${entityName ?? ""}/${recordId}`} size={160} marginSize={2} />
          ) : (
            <p className={common.helper}>Save the record first - the QR code is generated from its id</p>
          )}
        </FormItem>
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
          placeholder="Choose an option"
          options={(field.enumValues ?? []).map((v) => ({ value: v, label: v }))}
        />
      );
    case "boolean":
      return <BooleanField field={field} value={value} onChange={onChange} />;
    case "number":
    case "integer":
      return <NumberField field={field} value={value} onChange={onChange} />;
    case "date":
      return <DateField field={field} value={value} onChange={onChange} />;
    default:
      return (
        <TextInput
          label={field.label}
          required={field.required}
          value={value}
          onChange={onChange}
          multiline={field.type === "text"}
          rows={field.type === "text" ? 3 : undefined}
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

/** Form state for an entity's record, reset whenever the entity or record changes. */
function useRecordValues(entity: Entity, record?: EntityRecord) {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(entity, record));
  useEffect(() => setValues(initialValues(entity, record)), [entity, record]);
  const toPayload = (): Record<string, FieldValue> => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" ? null : v]));
  return { values, setValues, toPayload };
}

type RecordValues = ReturnType<typeof useRecordValues>;

/** One input per field of the entity definition. */
function RecordFields({ entity, record, state }: { entity: Entity; record?: EntityRecord; state: RecordValues }) {
  return (
    <>
      {entity.fields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          value={state.values[field.name] ?? ""}
          onChange={(v) => state.setValues((prev) => ({ ...prev, [field.name]: v }))}
          entityName={entity.name}
          recordId={record?.id}
        />
      ))}
    </>
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
  const state = useRecordValues(entity, record);
  return (
    <Form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(state.toPayload());
      }}
    >
      <Stack gap={6}>
        <RecordFields entity={entity} record={record} state={state} />
        {!!error && <ErrorAlert error={error} />}
        <ButtonSet>
          {onCancel && (
            <Button kind="secondary" type="button" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button kind="primary" type="submit" disabled={isPending}>
            {submitLabel}
          </Button>
        </ButtonSet>
      </Stack>
    </Form>
  );
}

/** A rejected save, as the platform explained it. */
export function ErrorAlert({ error }: { error: unknown }) {
  return <InlineNotification kind="error" lowContrast hideCloseButton title={errorMessage(error)} />;
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
  const state = useRecordValues(entity, record);
  return (
    <Modal
      open={open}
      size="md"
      modalLabel={entity.label}
      modalHeading={record ? `Edit ${entity.label.toLowerCase()} ${record.id}` : `New ${entity.label.toLowerCase()}`}
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isPending}
      onRequestClose={onClose}
      onRequestSubmit={() => onSubmit(state.toPayload())}
    >
      <Stack gap={6}>
        <RecordFields entity={entity} record={record} state={state} />
        {!!error && <ErrorAlert error={error} />}
      </Stack>
    </Modal>
  );
}
