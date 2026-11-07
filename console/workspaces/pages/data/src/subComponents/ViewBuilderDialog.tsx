import { useState } from "react";
import { Button, Checkbox, Modal } from "@heroui/react";
import { Plus, TrashBin } from "@workspacenow/icons";
import { useCreateView, useDeleteView, useListViews, useUpdateView } from "@workspacenow/api-client";
import type { Entity, FilterOp, SavedView, SavedViewInput } from "@workspacenow/types";
import { SelectInput, TextInput } from "@workspacenow/views";

const OPS: Array<{ value: FilterOp["op"]; label: string }> = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "contains", label: "contains" },
  { value: "in", label: "in (comma list)" },
];

/** Visual query builder for saved views: filter rows + sort + limit, saved via the views API. */
export function ViewBuilderDialog({ entity, onClose }: { entity: Entity; onClose: () => void }) {
  const views = useListViews({ entityName: entity.name });
  const create = useCreateView();
  const update = useUpdateView();
  const del = useDeleteView();
  const [editing, setEditing] = useState<SavedView | "new" | undefined>();
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [filters, setFilters] = useState<FilterOp[]>([]);
  const [sortField, setSortField] = useState("");
  const [sortDesc, setSortDesc] = useState(false);
  const [limit, setLimit] = useState("100");

  const fieldOptions = entity.fields.map((f) => ({ value: f.name, label: `${f.label} (${f.name})` }));
  const startEdit = (v?: SavedView) => {
    setEditing(v ?? "new");
    setName(v?.name ?? "");
    setShared(v?.shared ?? false);
    setFilters(v?.filters ?? []);
    setSortField(v?.sortField ?? "");
    setSortDesc(v?.sortDesc ?? false);
    setLimit(String(v?.limit ?? 100));
  };
  const save = () => {
    const body: SavedViewInput = {
      name: name.trim(),
      filters: filters.filter((f) => f.field && f.op),
      sortField: sortField || undefined,
      sortDesc,
      limit: Math.max(Number(limit) || 100, 1),
      shared,
    };
    if (editing && editing !== "new") update.mutate({ entityName: entity.name, viewId: editing.id, body }, { onSuccess: () => startEdit(undefined) });
    else create.mutate({ entityName: entity.name, ...body }, { onSuccess: () => startEdit(undefined) });
  };
  const valid = name.trim().length > 0;

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Saved views for {entity.label}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {(views.data?.items ?? []).map((v) => (
                <Button key={v.id} size="sm" variant={editing === v ? "secondary" : "tertiary"} onPress={() => startEdit(v)}>
                  {v.name}
                  {v.shared ? " · shared" : ""}
                </Button>
              ))}
              <Button size="sm" variant="tertiary" onPress={() => startEdit()}>
                <Plus className="size-3.5" aria-hidden /> New view
              </Button>
            </div>
            {editing !== undefined && (
              <div className="grid gap-3 border-t border-separator pt-4">
                <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                  <TextInput label="View name" required value={name} onChange={setName} placeholder="Open orders" />
                  <Checkbox isSelected={shared} onChange={setShared}>
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="text-xs text-muted">Shared</span>
                    </Checkbox.Content>
                  </Checkbox>
                </div>
                {filters.map((f, i) => (
                  <div key={i} className="grid grid-cols-[1fr_140px_1fr_auto] items-center gap-2">
                    <SelectInput label="Field" value={f.field} onChange={(v) => setFilters((p) => p.map((x, j) => (j === i ? { ...x, field: v } : x)))} options={fieldOptions} />
                    <SelectInput label="Op" value={f.op} onChange={(v) => setFilters((p) => p.map((x, j) => (j === i ? { ...x, op: v as FilterOp["op"] } : x)))} options={OPS} />
                    <TextInput label="Value" value={String(f.value ?? "")} onChange={(v) => setFilters((p) => p.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                    <Button isIconOnly size="sm" variant="ghost" aria-label="Remove filter" onPress={() => setFilters((p) => p.filter((_, j) => j !== i))}>
                      <TrashBin className="size-4" />
                    </Button>
                  </div>
                ))}
                <div>
                  <Button size="sm" variant="ghost" onPress={() => setFilters((p) => [...p, { field: entity.fields[0]?.name ?? "", op: "eq", value: "" }])}>
                    <Plus className="size-3.5" aria-hidden /> Add filter
                  </Button>
                </div>
                <div className="grid grid-cols-[1fr_140px_140px] items-end gap-3">
                  <SelectInput label="Sort by" value={sortField} onChange={setSortField} options={[{ value: "", label: "None" }, ...fieldOptions]} />
                  <SelectInput
                    label="Direction"
                    value={sortDesc ? "desc" : "asc"}
                    onChange={(v) => setSortDesc(v === "desc")}
                    options={[
                      { value: "asc", label: "Ascending" },
                      { value: "desc", label: "Descending" },
                    ]}
                  />
                  <TextInput label="Limit" type="number" value={limit} onChange={setLimit} />
                </div>
                <div className="flex justify-end gap-2">
                  {editing !== "new" && (
                    <Button
                      variant="danger"
                      onPress={() => del.mutate({ entityName: entity.name, viewId: (editing as SavedView).id }, { onSuccess: () => startEdit(undefined) })}
                    >
                      Delete
                    </Button>
                  )}
                  <Button isDisabled={!valid} isPending={create.isPending || update.isPending} onPress={save}>
                    Save view
                  </Button>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
