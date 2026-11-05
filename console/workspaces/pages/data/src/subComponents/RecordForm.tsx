import { useEffect, useState } from "react";
import { Alert, Button, Modal } from "@heroui/react";
import { useQueries } from "@tanstack/react-query";
import { useAuthHooks } from "@workspacenow/auth";
import { listRecords, useListRecords } from "@workspacenow/api-client";
import type { Entity, EntityField, EntityRecord, FieldValue } from "@workspacenow/types";
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

export function FieldInput({ field, value, onChange }: { field: EntityField; value: string; onChange: (v: string) => void }) {
  switch (field.type) {
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
