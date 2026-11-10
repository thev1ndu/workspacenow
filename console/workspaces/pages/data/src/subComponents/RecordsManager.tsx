import { View, Edit, TrashCan } from "@carbon/react/icons";
import { useState } from "react";
import { Modal } from "@carbon/react";

import { useDeleteRecord, useUpdateRecord } from "@workspacenow/api-client";
import type { Entity, EntityRecord } from "@workspacenow/types";
import { DetailList, TablePager, formatDateTime, formatRelative, usePagedSearch } from "@workspacenow/views";
import { RecordFormDialog, recordLabel } from "./RecordForm";
import { RecordsTable, formatFieldValue, type RecordAction } from "./RecordsTable";

import common from "../common.module.scss";

/** Read-only details for records owned by an external system, which cannot be edited here. */
function RecordViewDialog({
  entity,
  record,
  labels,
  onClose,
}: {
  entity: Entity;
  record: EntityRecord;
  labels: Record<string, Record<string, string>>;
  onClose: () => void;
}) {
  return (
    <Modal open passiveModal size="md" modalLabel={`${entity.label} ${record.id}`} modalHeading={recordLabel(record)} onRequestClose={onClose}>
      <DetailList
        items={[
          ...entity.fields.map((f) => ({
            label: f.label,
            value: formatFieldValue(f, record.values[f.name], labels),
            fullWidth: f.type === "text",
          })),
          { label: "Created", value: `${formatDateTime(record.createdAt)} by ${record.createdBy}` },
          { label: "Updated", value: formatRelative(record.updatedAt) },
        ]}
      />
    </Modal>
  );
}

function ConfirmDelete({
  entity,
  records,
  isPending,
  onCancel,
  onConfirm,
}: {
  entity: Entity;
  records: EntityRecord[];
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [first] = records;
  const many = records.length > 1;
  return (
    <Modal
      open
      danger
      size="sm"
      modalLabel={entity.label}
      modalHeading={many ? `Delete ${records.length} ${entity.label.toLowerCase()} records?` : `Delete ${recordLabel(first)}?`}
      primaryButtonText="Delete"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isPending}
      onRequestClose={onCancel}
      onRequestSubmit={onConfirm}
    >
      <p className={common.helper}>
        {many
          ? `This permanently removes ${records.length} ${entity.label.toLowerCase()} records. Each is refused while other records or a pending approval still use it.`
          : `This permanently removes ${entity.label.toLowerCase()} ${first.id}. It is refused while other records or a pending approval still use it.`}
      </p>
    </Modal>
  );
}

/**
 * Records with their full lifecycle: click a row or use its menu to edit or delete it. Records of
 * external entities are read-only, so they open as details instead. Every action runs as the user
 * through the entity's governed operations.
 */
export function RecordsManager({
  entity,
  records,
  labels,
  extraActions,
  search,
  onSearchChange,
  page,
  total,
  pageSize,
  onPageChange,
}: {
  entity: Entity;
  records: EntityRecord[];
  labels: Record<string, Record<string, string>>;
  /** Entity-specific actions, such as recording a sale against stock. */
  extraActions?: (record: EntityRecord) => RecordAction[];
  /** Server-side search + paging, owned by the page; when omitted the manager pages locally. */
  search?: string;
  onSearchChange?: (value: string) => void;
  page?: number;
  total?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}) {
  const readOnly = entity.scope === "external";
  // Local fallback for embedded previews (studio) that do not drive server paging.
  const local = usePagedSearch(records, 15, (r) => `${r.id} ${recordLabel(r)} ${JSON.stringify(r.values)}`);
  const searching = search !== undefined;
  const shown = searching ? records : local.pageItems;
  const shownSearch = searching ? search! : local.search;
  const onSearch = searching ? onSearchChange! : local.setSearch;
  const pg = searching ? page! : local.page;
  const totalN = searching ? total! : local.total;
  const ps = searching ? pageSize! : local.pageSize;
  const onPg = searching ? onPageChange! : local.setPage;
  const updateRecord = useUpdateRecord();
  const deleteRecord = useDeleteRecord();
  const [viewing, setViewing] = useState<EntityRecord | null>(null);
  const [editing, setEditing] = useState<EntityRecord | null>(null);
  const [deleting, setDeleting] = useState<EntityRecord[]>([]);

  const actions = (record: EntityRecord): RecordAction[] =>
    readOnly
      ? [{ id: "view", label: "View", icon: <View />, onAction: () => setViewing(record) }]
      : [
          { id: "edit", label: "Edit", icon: <Edit />, onAction: () => setEditing(record) },
          ...(extraActions?.(record) ?? []),
          { id: "delete", label: "Delete", icon: <TrashCan />, danger: true, onAction: () => setDeleting([record]) },
        ];

  const confirmDelete = async () => {
    // Each delete settles on its own, so one refused record does not stop the rest.
    for (const record of deleting) {
      try {
        await deleteRecord.mutateAsync({ entityName: entity.name, recordId: record.id });
      } catch {
        // The failure is reported as a notification by the mutation.
      }
    }
    setDeleting([]);
  };

  return (
    <>
      <RecordsTable
        entity={entity}
        records={shown}
        labels={labels}
        onOpen={readOnly ? setViewing : setEditing}
        actions={actions}
        search={{ value: shownSearch, onChange: onSearch }}
        onBatchDelete={readOnly ? undefined : setDeleting}
      />
      <TablePager page={pg} totalPages={Math.max(1, Math.ceil(totalN / ps))} total={totalN} pageSize={ps} onPageChange={onPg} />

      {viewing && <RecordViewDialog entity={entity} record={viewing} labels={labels} onClose={() => setViewing(null)} />}

      {editing && (
        <RecordFormDialog
          open
          entity={entity}
          record={editing}
          onClose={() => {
            setEditing(null);
            updateRecord.reset();
          }}
          isPending={updateRecord.isPending}
          error={updateRecord.error}
          onSubmit={(values) => updateRecord.mutate({ entityName: entity.name, recordId: editing.id, values }, { onSuccess: () => setEditing(null) })}
        />
      )}

      {deleting.length > 0 && (
        <ConfirmDelete entity={entity} records={deleting} isPending={deleteRecord.isPending} onCancel={() => setDeleting([])} onConfirm={() => void confirmDelete()} />
      )}
    </>
  );
}
