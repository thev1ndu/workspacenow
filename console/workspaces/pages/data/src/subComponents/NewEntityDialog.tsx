import { Add, TrashCan } from "@carbon/react/icons";
import { useId, useState } from "react";
import { Button, Checkbox, Heading, Modal, Stack } from "@carbon/react";

import { useNavigate } from "react-router-dom";
import { useCreateEntity, useListApplications, useListEntities } from "@workspacenow/api-client";
import { buildPath, routes, type EntityField, type EntityScope, type FieldType } from "@workspacenow/types";
import { SelectInput, TextInput } from "@workspacenow/views";
import { ErrorAlert } from "./RecordForm";
import { FIELD_TYPES } from "../constants";

import styles from "./NewEntityDialog.module.scss";

interface FieldRow {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  enumValues: string;
  reference: string;
}

const emptyRow = (): FieldRow => ({ name: "", label: "", type: "string", required: false, unique: false, enumValues: "", reference: "" });

export function toField(row: FieldRow): EntityField {
  return {
    name: row.name.trim(),
    label: row.label.trim() || row.name.trim(),
    type: row.type,
    required: row.required || undefined,
    unique: row.unique || undefined,
    enumValues: row.type === "enum" ? row.enumValues.split(",").map((v) => v.trim()).filter(Boolean) : undefined,
    reference: row.type === "reference" ? row.reference : undefined,
  };
}

/** One editable field definition row, shared by entity creation and "Add field". */
export function FieldRowEditor({
  row,
  onChange,
  entityOptions,
  onRemove,
}: {
  row: FieldRow;
  onChange: (row: FieldRow) => void;
  entityOptions: string[];
  onRemove?: () => void;
}) {
  return (
    <div className={styles.fieldRow}>
      <div className={styles.main}>
        <TextInput label="Name" required value={row.name} onChange={(name) => onChange({ ...row, name })} placeholder="camelCase" />
        <TextInput label="Label" value={row.label} onChange={(label) => onChange({ ...row, label })} />
        <SelectInput
          label="Type"
          required
          value={row.type}
          onChange={(type) => onChange({ ...row, type: type as FieldType })}
          options={FIELD_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
        />
        {onRemove ? <Button hasIconOnly kind="ghost" iconDescription="Remove field" onClick={onRemove} renderIcon={TrashCan} /> : <span />}
      </div>
      <div className={styles.flags}>
        <FlagCheckbox label="Required" isSelected={row.required} onChange={(required) => onChange({ ...row, required })} />
        <FlagCheckbox label="Unique" isSelected={row.unique} onChange={(unique) => onChange({ ...row, unique })} />
        {row.type === "enum" && (
          <div className={styles.extra}>
            <TextInput label="Values" value={row.enumValues} onChange={(enumValues) => onChange({ ...row, enumValues })} placeholder="open, closed" />
          </div>
        )}
        {row.type === "reference" && (
          <div className={styles.extra}>
            <SelectInput
              label="Target entity"
              required
              value={row.reference}
              onChange={(reference) => onChange({ ...row, reference })}
              options={entityOptions.map((e) => ({ value: e, label: e }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FlagCheckbox({ label, isSelected, onChange }: { label: string; isSelected: boolean; onChange: (value: boolean) => void }) {
  const id = useId();
  return (
    <Checkbox id={id} labelText={label} checked={isSelected} onChange={(e) => onChange(e.target.checked)} />
  );
}

export { emptyRow, type FieldRow };

export function NewEntityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const createEntity = useCreateEntity();
  const { data: apps } = useListApplications();
  const { data: entities } = useListEntities();
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<EntityScope>("organization");
  const [owner, setOwner] = useState("");
  const [rows, setRows] = useState<FieldRow[]>([{ ...emptyRow(), name: "name", label: "Name", required: true }]);

  const nameError = name && !/^[A-Z][A-Za-z0-9]*$/.test(name) ? "Use PascalCase, e.g. PurchaseRequest" : undefined;
  const rowsValid = rows.length > 0 && rows.every((r) => r.name.trim() && (r.type !== "reference" || r.reference));

  const submit = () =>
    createEntity.mutate(
      {
        name,
        label: label || name,
        description,
        scope,
        ownerApplicationId: owner || undefined,
        fields: rows.map(toField),
      },
      {
        onSuccess: (entity) => {
          onClose();
          navigate(buildPath(routes.data.entity, { entityName: entity.name }));
        },
      },
    );

  return (
    <Modal
      open={open}
      size="lg"
      modalHeading="New entity"
      primaryButtonText="Create entity"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={!name || !!nameError || !rowsValid || createEntity.isPending}
      onRequestClose={onClose}
      onRequestSubmit={submit}
    >
      <Stack gap={5}>
        <div className={styles.pair}>
          <TextInput label="Name" required value={name} onChange={setName} error={nameError} placeholder="Warehouse" />
          <TextInput label="Label" value={label} onChange={setLabel} placeholder="Warehouse" />
          <SelectInput
            label="Scope"
            required
            value={scope}
            onChange={(v) => setScope(v as EntityScope)}
            options={[
              { value: "organization", label: "Organization-shared" },
              { value: "application", label: "Application-scoped" },
            ]}
          />
          <SelectInput
            label="Owning application"
            value={owner}
            onChange={setOwner}
            options={(apps?.items ?? []).map((a) => ({ value: a.id, label: a.name }))}
            helperText="The application responsible for authoritative writes."
          />
        </div>
        <TextInput label="Description" value={description} onChange={setDescription} multiline rows={2} />
        <div className={styles.fieldsHeader}>
          <Heading className={styles.sectionTitle}>Fields</Heading>
          <Button size="sm" kind="secondary" onClick={() => setRows((prev) => [...prev, emptyRow()])} renderIcon={Add}>
            Add field
          </Button>
        </div>
        {rows.map((row, i) => (
          <FieldRowEditor
            key={i}
            row={row}
            entityOptions={(entities?.items ?? []).map((e) => e.name)}
            onChange={(next) => setRows((prev) => prev.map((r, j) => (j === i ? next : r)))}
            onRemove={rows.length > 1 ? () => setRows((prev) => prev.filter((_, j) => j !== i)) : undefined}
          />
        ))}
        {!!createEntity.error && <ErrorAlert error={createEntity.error} />}
      </Stack>
    </Modal>
  );
}
