import { Button, Checkbox, Chip, Input, ListBox, Select, TextField, Tooltip } from "@heroui/react";
import { Plus, TrashBin } from "@workspacenow/icons";
import { useListDepartments } from "@workspacenow/api-client";
import { planOperations, toEntityName, toFieldName, type ApplicationPlan, type AppPage, type EntityField, type FieldType } from "@workspacenow/types";
import { SectionCard, SelectInput, TextInput } from "@workspacenow/views";

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
  { value: "file", label: "File (stored in object storage)" },
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

/* Compact controls for table-like rows, labelled for assistive technology only. */

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
  return (
    <TextField aria-label={label} value={value} onChange={onChange} isDisabled={isDisabled} className="min-w-0">
      <Input variant="secondary" placeholder={placeholder} className={mono ? "font-mono text-xs" : undefined} />
    </TextField>
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
  return (
    <Select
      variant="secondary"
      aria-label={label}
      value={value || null}
      onChange={(key) => onChange(key == null ? "" : String(key))}
      placeholder="Select…"
      isDisabled={isDisabled}
      className="min-w-0"
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((o) => (
            <ListBox.Item key={o.value} id={o.value} textValue={o.label}>
              {o.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function Flag({ label, isSelected, onChange }: { label: string; isSelected: boolean; onChange: (v: boolean) => void }) {
  return (
    <Checkbox isSelected={isSelected} onChange={onChange}>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <span className="text-xs text-muted">{label}</span>
      </Checkbox.Content>
    </Checkbox>
  );
}

function RemoveButton({ label, onPress, isDisabled }: { label: string; onPress: () => void; isDisabled?: boolean }) {
  return (
    <Tooltip delay={300}>
      <Button isIconOnly size="sm" variant="ghost" aria-label={label} isDisabled={isDisabled} onPress={onPress}>
        <TrashBin className="size-4" />
      </Button>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

function FieldRow({
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
}) {
  // The name follows the label until someone edits it by hand, or once the field exists.
  const autoName = !locked && field.name === toFieldName(field.label);
  return (
    <div className="grid grid-cols-2 items-center gap-2 border-t border-separator px-5 py-3 md:grid-cols-[1.2fr_1fr_1fr_1.4fr_auto_auto]">
      <CellInput label="Field label" value={field.label} onChange={(label) => onChange({ ...field, label, name: autoName ? toFieldName(label) : field.name })} />
      <CellInput label="Field name" value={field.name} onChange={(name) => onChange({ ...field, name })} mono isDisabled={locked} />
      <CellSelect
        label="Field type"
        value={field.type}
        options={FIELD_TYPES}
        isDisabled={locked}
        onChange={(type) =>
          onChange({ ...field, type: type as FieldType, enumValues: type === "enum" ? field.enumValues ?? [] : undefined, reference: type === "reference" ? field.reference : undefined })
        }
      />
      <div className="min-w-0">
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
          <span className="text-xs text-muted">—</span>
        )}
      </div>
      <div className="flex gap-3">
        <Flag label="Required" isSelected={!!field.required} onChange={(required) => onChange({ ...field, required })} />
        <Flag label="Unique" isSelected={!!field.unique} onChange={(unique) => onChange({ ...field, unique })} />
      </div>
      <RemoveButton label={locked ? "Saved fields cannot be removed" : `Remove ${field.label || "field"}`} onPress={onRemove} isDisabled={!canRemove || locked} />
    </div>
  );
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
      <div className="grid gap-4 px-5 pt-1 pb-5 md:grid-cols-[1fr_1fr_2fr]">
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
      <div className="hidden grid-cols-[1.2fr_1fr_1fr_1.4fr_auto_auto] gap-2 border-t border-separator px-5 py-2 text-xs text-muted md:grid">
        <span>Field</span>
        <span>Name</span>
        <span>Type</span>
        <span>Options</span>
        <span className="w-[150px]">Rules</span>
        <span className="w-8" />
      </div>
      {entity.fields.map((field, i) => (
        <FieldRow
          key={i}
          field={field}
          referenceOptions={referenceOptions}
          onChange={(f) => setField(i, f)}
          onRemove={() => onChange({ ...entity, fields: entity.fields.filter((_, j) => j !== i) })}
          canRemove={entity.fields.length > 1}
          locked={savedFields?.some((f) => f.name === field.name)}
        />
      ))}
      <div className="border-t border-separator px-5 py-3">
        <Button
          size="sm"
          variant="ghost"
          onPress={() => onChange({ ...entity, fields: [...entity.fields, { name: `field${entity.fields.length + 1}`, label: `Field ${entity.fields.length + 1}`, type: "string" }] })}
        >
          <Plus className="size-3.5" aria-hidden />
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
    <div className="col-span-full grid gap-2 md:grid-cols-[auto_1fr_auto_1fr] md:items-center">
      <span className="text-xs text-muted">QR code holds</span>
      <CellSelect label="QR code holds" value={scan.matchField} options={matchOptions} onChange={(matchField) => onChange({ ...page, scan: { ...scan, matchField } })} />
      <span className="text-xs text-muted">When scanned</span>
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

function PageRow({
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
}) {
  return (
    <div className="grid grid-cols-2 items-center gap-2 border-t border-separator px-5 py-3 md:grid-cols-[2fr_1fr_1fr_auto]">
      <CellInput label="Page title" value={page.title} onChange={(title) => onChange({ ...page, title })} />
      <CellSelect
        label="Page kind"
        value={page.kind}
        options={PAGE_KINDS}
        onChange={(kind) => onChange({ ...page, kind: kind as AppPage["kind"], scan: kind === "scan" ? (page.scan ?? { matchField: "id" }) : undefined })}
      />
      <CellSelect
        label="Page entity"
        value={page.entity ?? ""}
        options={entityOptions}
        // A different entity has different fields, so its scan settings start over.
        onChange={(entity) => onChange({ ...page, entity, scan: page.kind === "scan" ? { matchField: "id" } : undefined })}
      />
      <RemoveButton label={`Remove ${page.title || "page"}`} onPress={onRemove} />
      {page.kind === "scan" && <ScanSettings page={page} entity={entities.find((e) => e.name === page.entity)} onChange={onChange} />}
    </div>
  );
}

function ChipList({ items, mono }: { items: string[]; mono?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Chip key={item} size="sm" variant="secondary" className={mono ? "font-mono" : undefined}>
          {item}
        </Chip>
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
    <div className="grid gap-6">
      <SectionCard title="Application">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Name" required value={plan.name} onChange={(name) => onChange({ ...plan, name })} placeholder="Customer Support" />
          <SelectInput
            label="Owner"
            required
            value={plan.ownerDepartmentId}
            onChange={(ownerDepartmentId) => onChange({ ...plan, ownerDepartmentId })}
            options={(departments.data?.items ?? []).map((d) => ({ value: d.id, label: d.name }))}
          />
          <div className="md:col-span-2">
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
        <Button variant="secondary" onPress={() => onChange({ ...plan, entities: [...plan.entities, newEntity(plan.entities.map((e) => e.name))] })}>
          <Plus className="size-4" aria-hidden />
          Add entity
        </Button>
      </div>

      <SectionCard
        title="Pages"
        subtitle="What users see when they open the application."
        actions={
          <Button
            size="sm"
            variant="secondary"
            isDisabled={entityOptions.length === 0}
            onPress={() => {
              const first = plan.entities[0];
              onChange({ ...plan, pages: [...plan.pages, { title: first ? `${first.label}s` : "", kind: "list", entity: first?.name }] });
            }}
          >
            <Plus className="size-3.5" aria-hidden />
            Add page
          </Button>
        }
        flush
      >
        {plan.pages.length === 0 ? (
          <p className="border-t border-separator px-5 py-6 text-sm text-muted">No pages yet. Add a list or a form for an entity.</p>
        ) : (
          plan.pages.map((page, i) => (
            <PageRow
              key={i}
              page={page}
              entityOptions={entityOptions}
              entities={plan.entities}
              onChange={(next) => onChange({ ...plan, pages: plan.pages.map((p, j) => (j === i ? next : p)) })}
              onRemove={() => onChange({ ...plan, pages: plan.pages.filter((_, j) => j !== i) })}
            />
          ))
        )}
      </SectionCard>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <SectionCard title="API operations" subtitle="Generated for every entity when the plan is applied.">
          {operations.length ? <ChipList items={operations} mono /> : <p className="text-sm text-muted">None</p>}
        </SectionCard>
        {plan.workflows.length > 0 && (
          <SectionCard title="Suggested workflows" subtitle="Build these in Flow once the application exists.">
            <ChipList items={plan.workflows} />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
