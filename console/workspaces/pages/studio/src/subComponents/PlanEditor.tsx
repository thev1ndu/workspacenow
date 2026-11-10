import { Add, TrashCan } from "@carbon/react/icons";
import { Fragment, useId, useState, type ReactNode } from "react";
import { Button, DataTable, Select, SelectItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag, TextInput as CarbonTextInput, Toggle, Column, Grid } from "@carbon/react";

import { useCreateDepartment, useListDepartments } from "@workspacenow/api-client";
import { planOperations, toEntityName, toFieldName, type ApplicationPlan, type AppPage, type EntityField, type FieldType } from "@workspacenow/types";
import { NoDataFound, SectionCard, SelectInput, TextInput } from "@workspacenow/views";
import shared from "../shared.module.scss";

import styles from "./PlanEditor.module.scss";

type PlannedEntity = ApplicationPlan["entities"][number];
type PlannedPage = ApplicationPlan["pages"][number];

const FIELD_TYPES: Array<{ value: FieldType; label: string }> = [
  { value: "string", label: "Text" },
  { value: "text", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "integer", label: "Whole number" },
  { value: "boolean", label: "Yes / no" },
  { value: "date", label: "Date" },
  { value: "enum", label: "Choice" },
  { value: "reference", label: "Reference" },
  { value: "file", label: "File" },
  { value: "qr", label: "QR code" },
];

const PAGE_KINDS: Array<{ value: AppPage["kind"]; label: string }> = [
  { value: "list", label: "List" },
  { value: "form", label: "Form" },
  { value: "dashboard", label: "Dashboard" },
  { value: "scan", label: "QR scan" },
];

const NO_ACTION = "none";

/** A blank plan for building an application by hand. */
export function blankPlan(ownerDepartmentId = ""): ApplicationPlan {
  return {
    prompt: "",
    name: "",
    description: "",
    ownerDepartmentId,
    entities: [newEntity([])],
    pages: [],
    operations: [],
    workflows: [],
    permissions: [],
  };
}

function newEntity(taken: string[]): PlannedEntity {
  let n = 1;
  while (taken.includes(`Item${n === 1 ? "" : n}`)) n += 1;
  const label = n === 1 ? "Item" : `Item ${n}`;
  return { name: toEntityName(label), label, description: "", fields: [{ name: "name", label: "Name", type: "string", required: true }], relationships: [] };
}

/* Compact controls for table cells, labelled for assistive technology only. */

function CellInput({
  label,
  value,
  onChange,
  mono,
  placeholder,
  isDisabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  placeholder?: string;
  isDisabled?: boolean;
}) {
  const id = useId();
  return (
    <CarbonTextInput
      id={id}
      size="sm"
      labelText={label}
      hideLabel
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={isDisabled}
      placeholder={placeholder}
      className={mono ? styles.mono : undefined}
    />
  );
}

function CellSelect({
  label,
  value,
  onChange,
  options,
  isDisabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  isDisabled?: boolean;
}) {
  const id = useId();
  return (
    <Select id={id} size="sm" labelText={label} hideLabel value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={isDisabled}>
      <SelectItem value="" text="Select…" hidden />
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value} text={o.label} />
      ))}
    </Select>
  );
}

function CellToggle({ label, isSelected, onChange }: { label: string; isSelected: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return <Toggle id={id} size="sm" labelText={label} hideLabel labelA="No" labelB="Yes" toggled={isSelected} onToggle={onChange} />;
}

function RemoveButton({ label, onPress, isDisabled }: { label: string; onPress: () => void; isDisabled?: boolean }) {
  return <Button hasIconOnly renderIcon={TrashCan} iconDescription={label} size="sm" kind="ghost" aria-label={label} disabled={isDisabled} onClick={onPress} />;
}

interface GridColumn {
  key: string;
  header: string;
}

interface GridRowContent {
  cells: ReactNode[];
  /** A full-width row under this one, for settings that do not fit a column. */
  extra?: ReactNode;
}

/** An editable grid: a Carbon DataTable whose cells hold inline controls, one row per entry of `count`. */
function EditableGrid({ label, columns, count, row }: { label: string; columns: GridColumn[]; count: number; row: (index: number) => GridRowContent }) {
  const rows = Array.from({ length: count }, (_, i) => ({ id: String(i) }));
  return (
    <DataTable rows={rows} headers={columns} size="lg">
      {({ rows: tableRows, headers, getTableProps, getHeaderProps, getRowProps }) => (
        <TableContainer aria-label={label}>
          <Table {...getTableProps()} aria-label={label}>
            <TableHead>
              <TableRow>
                {headers.map((header) => {
                  const { key, ...props } = getHeaderProps({ header });
                  return (
                    <TableHeader key={key} {...props}>
                      {header.key === "remove" ? <span className="cds--visually-hidden">Actions</span> : header.header}
                    </TableHeader>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((tableRow) => {
                const { key, ...props } = getRowProps({ row: tableRow });
                const content = row(Number(tableRow.id));
                return (
                  <Fragment key={key}>
                    <TableRow {...props}>
                      {content.cells.map((cell, i) => (
                        <TableCell key={columns[i].key}>{cell}</TableCell>
                      ))}
                    </TableRow>
                    {content.extra && (
                      <TableRow>
                        <TableCell colSpan={columns.length}>{content.extra}</TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  );
}

const FIELD_COLUMNS: GridColumn[] = [
  { key: "label", header: "Field" },
  { key: "name", header: "Name" },
  { key: "type", header: "Type" },
  { key: "options", header: "Options" },
  { key: "required", header: "Required" },
  { key: "unique", header: "Unique" },
  { key: "remove", header: "Remove" },
];

function fieldRow({
  field,
  referenceOptions,
  onChange,
  onRemove,
  canRemove,
  locked,
}: {
  field: EntityField;
  referenceOptions: Array<{ value: string; label: string }>;
  onChange: (field: EntityField) => void;
  onRemove: () => void;
  canRemove: boolean;
  /** Already saved with records depending on it: name, type and target stay fixed and it cannot be removed. */
  locked?: boolean;
}): GridRowContent {
  // The name follows the label until someone edits it by hand, or once the field exists.
  const autoName = !locked && field.name === toFieldName(field.label);
  return {
    cells: [
      <div className={styles.control}>
        <CellInput label="Field label" value={field.label} onChange={(label) => onChange({ ...field, label, name: autoName ? toFieldName(label) : field.name })} />
      </div>,
      <div className={styles.control}>
        <CellInput label="Field name" value={field.name} onChange={(name) => onChange({ ...field, name })} mono isDisabled={locked} />
      </div>,
      <div className={styles.control}>
        <CellSelect
          label="Field type"
          value={field.type}
          options={FIELD_TYPES}
          isDisabled={locked}
          onChange={(type) =>
            onChange({ ...field, type: type as FieldType, enumValues: type === "enum" ? field.enumValues ?? [] : undefined, reference: type === "reference" ? field.reference : undefined })
          }
        />
      </div>,
      <div className={styles.controlWide}>
        {field.type === "enum" ? (
          <CellInput
            label="Choices, comma separated"
            placeholder="open, closed"
            value={(field.enumValues ?? []).join(", ")}
            onChange={(v) => onChange({ ...field, enumValues: v.split(",").map((x) => x.trim()).filter(Boolean) })}
          />
        ) : field.type === "reference" ? (
          <CellSelect label="Refers to" value={field.reference ?? ""} options={referenceOptions} onChange={(reference) => onChange({ ...field, reference })} isDisabled={locked} />
        ) : (
          <span className={shared.helper}>-</span>
        )}
      </div>,
      <CellToggle label={`Required: ${field.label || "field"}`} isSelected={!!field.required} onChange={(required) => onChange({ ...field, required })} />,
      <CellToggle label={`Unique: ${field.label || "field"}`} isSelected={!!field.unique} onChange={(unique) => onChange({ ...field, unique })} />,
      <RemoveButton label={locked ? "Saved fields cannot be removed" : `Remove ${field.label || "field"}`} onPress={onRemove} isDisabled={!canRemove || locked} />,
    ],
  };
}

function EntityEditor({
  entity,
  referenceOptions,
  onChange,
  onRemove,
  canRemove,
  savedFields,
}: {
  entity: PlannedEntity;
  referenceOptions: Array<{ value: string; label: string }>;
  onChange: (entity: PlannedEntity) => void;
  onRemove: () => void;
  canRemove: boolean;
  /** The entity's fields as saved, when it already exists; undefined for an entity new in this plan. */
  savedFields?: EntityField[];
}) {
  const locked = !!savedFields;
  const autoName = !locked && entity.name === toEntityName(entity.label);
  const setField = (i: number, field: EntityField) => onChange({ ...entity, fields: entity.fields.map((f, j) => (j === i ? field : f)) });
  return (
    <SectionCard
      title={`Entity: ${entity.label || "Unnamed"}`}
      actions={
        <RemoveButton label={locked ? "Saved entities cannot be removed" : `Remove ${entity.label || "entity"}`} onPress={onRemove} isDisabled={!canRemove || locked} />
      }
      flush
    >
      <div className={styles.entityMeta}>
        <TextInput label="Label" value={entity.label} onChange={(label) => onChange({ ...entity, label, name: autoName ? toEntityName(label) : entity.name })} />
        <TextInput
          label="Name"
          helperText={locked ? "Fixed once created" : "Used in APIs and operations"}
          value={entity.name}
          onChange={(name) => onChange({ ...entity, name })}
          disabled={locked}
        />
        <TextInput label="Description" value={entity.description} onChange={(description) => onChange({ ...entity, description })} />
      </div>
      <EditableGrid
        label={`Fields of ${entity.label || "entity"}`}
        columns={FIELD_COLUMNS}
        count={entity.fields.length}
        row={(i) =>
          fieldRow({
            field: entity.fields[i],
            referenceOptions,
            onChange: (f) => setField(i, f),
            onRemove: () => onChange({ ...entity, fields: entity.fields.filter((_, j) => j !== i) }),
            canRemove: entity.fields.length > 1,
            locked: savedFields?.some((f) => f.name === entity.fields[i].name),
          })
        }
      />
      <div className={styles.entityFooter}>
        <Button
          size="sm"
          kind="ghost"
          renderIcon={Add}
          onClick={() => onChange({ ...entity, fields: [...entity.fields, { name: `field${entity.fields.length + 1}`, label: `Field ${entity.fields.length + 1}`, type: "string" }] })}
        >
          Add field
        </Button>
      </div>
    </SectionCard>
  );
}

/** What a scan page's QR code holds, and the choice it sets on the record it finds. */
function ScanSettings({ page, entity, onChange }: { page: PlannedPage; entity?: PlannedEntity; onChange: (page: PlannedPage) => void }) {
  const scan = page.scan ?? { matchField: "id" };
  const matchOptions = [{ value: "id", label: "Record id" }, ...(entity?.fields ?? []).filter((f) => f.type === "string").map((f) => ({ value: f.name, label: f.label }))];
  const actionOptions = [
    { value: NO_ACTION, label: "Only look it up" },
    ...(entity?.fields ?? [])
      .filter((f) => f.type === "enum")
      .flatMap((f) => (f.enumValues ?? []).map((v) => ({ value: `${f.name}=${v}`, label: `Set ${f.label.toLowerCase()} to ${v.replace(/[-_]/g, " ")}` }))),
  ];
  return (
    <div className={styles.scan}>
      <span className={styles.scanLabel}>QR code holds</span>
      <CellSelect label="QR code holds" value={scan.matchField} options={matchOptions} onChange={(matchField) => onChange({ ...page, scan: { ...scan, matchField } })} />
      <span className={styles.scanLabel}>When scanned</span>
      <CellSelect
        label="When scanned"
        value={scan.onScan ? `${scan.onScan.field}=${scan.onScan.value}` : NO_ACTION}
        options={actionOptions}
        onChange={(choice) => {
          const [field, value] = choice.split("=");
          onChange({ ...page, scan: { matchField: scan.matchField, ...(choice === NO_ACTION || !value ? {} : { onScan: { field, value } }) } });
        }}
      />
    </div>
  );
}

const PAGE_COLUMNS: GridColumn[] = [
  { key: "title", header: "Page title" },
  { key: "kind", header: "Kind" },
  { key: "entity", header: "Entity" },
  { key: "remove", header: "Remove" },
];

function pageRow({
  page,
  entityOptions,
  entities,
  onChange,
  onRemove,
}: {
  page: PlannedPage;
  entityOptions: Array<{ value: string; label: string }>;
  entities: PlannedEntity[];
  onChange: (page: PlannedPage) => void;
  onRemove: () => void;
}): GridRowContent {
  return {
    cells: [
      <div className={styles.controlWide}>
        <CellInput label="Page title" value={page.title} onChange={(title) => onChange({ ...page, title })} />
      </div>,
      <div className={styles.control}>
        <CellSelect
          label="Page kind"
          value={page.kind}
          options={PAGE_KINDS}
          onChange={(kind) => onChange({ ...page, kind: kind as AppPage["kind"], scan: kind === "scan" ? (page.scan ?? { matchField: "id" }) : undefined })}
        />
      </div>,
      <div className={styles.control}>
        <CellSelect
          label="Page entity"
          value={page.entity ?? ""}
          options={entityOptions}
          // A different entity has different fields, so its scan settings start over.
          onChange={(entity) => onChange({ ...page, entity, scan: page.kind === "scan" ? { matchField: "id" } : undefined })}
        />
      </div>,
      <RemoveButton label={`Remove ${page.title || "page"}`} onPress={onRemove} />,
    ],
    extra: page.kind === "scan" ? <ScanSettings page={page} entity={entities.find((e) => e.name === page.entity)} onChange={onChange} /> : undefined,
  };
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className={shared.tags}>
      {items.map((item) => (
        <Tag key={item} size="sm" type="gray">
          {item}
        </Tag>
      ))}
    </div>
  );
}

/**
 * Edits an application plan before it is applied, whether the Application Architect drafted it or
 * someone started from scratch, or it describes an application that already exists. Renaming an
 * entity carries through to its pages and references. Entities and fields in `saved` already hold
 * records, so their identity is locked.
 */
export function PlanEditor({
  plan,
  onChange,
  existingEntities,
  saved,
}: {
  plan: ApplicationPlan;
  onChange: (plan: ApplicationPlan) => void;
  existingEntities: Array<{ name: string; label: string }>;
  saved?: PlannedEntity[];
}) {
  const departments = useListDepartments();
  const createDept = useCreateDepartment();
  const [newDeptName, setNewDeptName] = useState("");
  const entityOptions = plan.entities.filter((e) => e.name).map((e) => ({ value: e.name, label: e.label || e.name }));
  const referenceOptions = [...entityOptions, ...existingEntities.map((e) => ({ value: e.name, label: `${e.label} (existing)` }))];

  const setEntity = (i: number, next: PlannedEntity) => {
    const previous = plan.entities[i].name;
    const renamed = previous !== next.name;
    onChange({
      ...plan,
      entities: plan.entities.map((e, j) =>
        j === i ? next : renamed ? { ...e, fields: e.fields.map((f) => (f.reference === previous ? { ...f, reference: next.name } : f)) } : e,
      ),
      pages: renamed ? plan.pages.map((p) => (p.entity === previous ? { ...p, entity: next.name } : p)) : plan.pages,
    });
  };
  const removeEntity = (i: number) => {
    const removed = plan.entities[i].name;
    onChange({ ...plan, entities: plan.entities.filter((_, j) => j !== i), pages: plan.pages.filter((p) => p.entity !== removed) });
  };
  const operations = planOperations(plan.entities.filter((e) => e.name));

  return (
    <Stack gap={6}>
      <SectionCard title="Application">
        <div className={styles.appGrid}>
          <TextInput label="Name" required value={plan.name} onChange={(name) => onChange({ ...plan, name })} placeholder="Customer Support" />
          <SelectInput
            label="Owner"
            required
            value={plan.ownerDepartmentId}
            onChange={(ownerDepartmentId) => onChange({ ...plan, ownerDepartmentId })}
            options={[
              ...(departments.data?.items ?? []).map((d) => ({ value: d.id, label: d.name })),
              { value: "__new__", label: "+ New department…" },
            ]}
          />
          {plan.ownerDepartmentId === "__new__" && (
            <div className={`${styles.newDepartment} ${styles.span2}`}>
              <div className={styles.newDepartmentField}>
                <TextInput
                  label="New department name"
                  value={newDeptName}
                  onChange={setNewDeptName}
                  placeholder="e.g. Engineering"
                />
              </div>
              <Button
                kind="primary"
                disabled={!newDeptName.trim() || createDept.isPending}
                onClick={() =>
                  createDept.mutate(
                    { name: newDeptName.trim() },
                    { onSuccess: (d) => { setNewDeptName(""); onChange({ ...plan, ownerDepartmentId: d.id }); } },
                  )
                }
              >
                Create
              </Button>
            </div>
          )}
          <div className={styles.span2}>
            <TextInput label="Description" multiline rows={2} value={plan.description} onChange={(description) => onChange({ ...plan, description })} />
          </div>
        </div>
      </SectionCard>

      {plan.entities.map((entity, i) => (
        <EntityEditor
          key={i}
          entity={entity}
          referenceOptions={referenceOptions.filter((o) => o.value !== entity.name)}
          onChange={(next) => setEntity(i, next)}
          onRemove={() => removeEntity(i)}
          canRemove={plan.entities.length > 1}
          savedFields={saved?.find((s) => s.name === entity.name)?.fields}
        />
      ))}
      <div>
        <Button kind="secondary" renderIcon={Add} onClick={() => onChange({ ...plan, entities: [...plan.entities, newEntity(plan.entities.map((e) => e.name))] })}>
          Add entity
        </Button>
      </div>

      <SectionCard
        title="Pages"
        subtitle="What users see when they open the application."
        actions={
          <Button
            size="sm"
            kind="secondary"
            renderIcon={Add}
            disabled={entityOptions.length === 0}
            onClick={() => {
              const first = plan.entities[0];
              onChange({ ...plan, pages: [...plan.pages, { title: first ? `${first.label}s` : "", kind: "list", entity: first?.name }] });
            }}
          >
            Add page
          </Button>
        }
        flush
      >
        {plan.pages.length === 0 ? (
          <div className={styles.empty}>
            <NoDataFound message="No pages yet. Add a list or a form for an entity." />
          </div>
        ) : (
          <EditableGrid
            label="Pages"
            columns={PAGE_COLUMNS}
            count={plan.pages.length}
            row={(i) =>
              pageRow({
                page: plan.pages[i],
                entityOptions,
                entities: plan.entities,
                onChange: (next) => onChange({ ...plan, pages: plan.pages.map((p, j) => (j === i ? next : p)) }),
                onRemove: () => onChange({ ...plan, pages: plan.pages.filter((_, j) => j !== i) }),
              })
            }
          />
        )}
      </SectionCard>

      <Grid narrow withRowGap>
        <Column sm={4} md={4} lg={8}>
          <SectionCard title="API operations" subtitle="Generated for every entity when the plan is applied.">
            {operations.length ? <ChipList items={operations} /> : <p className={shared.body}>None</p>}
          </SectionCard>
        </Column>
        {plan.workflows.length > 0 && (
          <Column sm={4} md={4} lg={8}>
            <SectionCard title="Suggested workflows" subtitle="Build these in Flow once the application exists.">
              <ChipList items={plan.workflows} />
            </SectionCard>
          </Column>
        )}
      </Grid>
    </Stack>
  );
}
