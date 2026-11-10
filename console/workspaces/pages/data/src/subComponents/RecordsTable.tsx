import { OverflowMenuHorizontal, TrashCan } from "@carbon/react/icons";
import type { MouseEvent, ReactNode } from "react";
import {
  DataTable,
  OverflowMenu,
  OverflowMenuItem,
  Table,
  TableBatchAction,
  TableBatchActions,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from "@carbon/react";

import type { Entity, EntityField, EntityRecord, FieldValue } from "@workspacenow/types";
import { NoDataFound, StatusChip, formatCurrency, formatDateTime, formatRelative } from "@workspacenow/views";

import styles from "./RecordsTable.module.scss";

/** Lifecycle fields read best as coloured status chips; other choices are plain values. */
const isStatusField = (field: EntityField) => field.type === "enum" && /^(status|state|stage)$/i.test(field.name);

const isNumeric = (field: EntityField) => field.type === "number" || field.type === "integer";

export function formatFieldValue(field: EntityField, value: FieldValue, labels: Record<string, Record<string, string>>): ReactNode {
  if (value === null || value === undefined || value === "") return <span className={styles.empty}>-</span>;
  if (field.type === "reference") return labels[field.reference ?? ""]?.[String(value)] ?? String(value);
  if (isStatusField(field)) return <StatusChip status={String(value)} />;
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "number" && /cost|price|total/i.test(field.name)) return <span>{formatCurrency(value)}</span>;
  if (field.type === "number" || field.type === "integer") return <span>{String(value)}</span>;
  return String(value);
}

export interface RecordAction {
  id: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onAction: () => void;
}

export interface RecordsSearch {
  value: string;
  onChange: (value: string) => void;
}

/** Records of one entity, with columns generated from its definition and a menu of actions per row. */
export function RecordsTable({
  entity,
  records,
  labels,
  onOpen,
  actions,
  search,
  onBatchDelete,
}: {
  entity: Entity;
  records: EntityRecord[];
  labels: Record<string, Record<string, string>>;
  onOpen?: (record: EntityRecord) => void;
  actions?: (record: EntityRecord) => RecordAction[];
  /** Adds Carbon's table toolbar with a search field. */
  search?: RecordsSearch;
  /** Adds row selection and a batch Delete action in the toolbar. */
  onBatchDelete?: (records: EntityRecord[]) => void;
}) {
  if (records.length === 0 && !search) return <NoDataFound message={`No ${entity.label.toLowerCase()} records yet.`} />;
  const fields = entity.fields.filter((f) => f.type !== "text").slice(0, 7);
  const byId = new Map(records.map((r) => [r.id, r]));
  const headers = [{ key: "id", header: "Id" }, ...fields.map((f) => ({ key: f.name, header: f.label })), { key: "updatedAt", header: "Updated" }];
  const hasToolbar = !!search || !!onBatchDelete;
  // Clicks on the selection checkbox must not open the row.
  const opensRow = (record: EntityRecord) =>
    onOpen
      ? (ev: MouseEvent) => {
          if ((ev.target as Element).closest(".cds--table-column-checkbox")) return;
          onOpen(record);
        }
      : undefined;

  return (
    <>
      <DataTable rows={records.map((r) => ({ id: r.id }))} headers={headers}>
        {({ rows, headers: cols, getRowProps, getSelectionProps, getBatchActionProps, getToolbarProps, getTableProps, selectedRows }) => {
          const batch = getBatchActionProps();
          return (
            <TableContainer aria-label={`${entity.label} records`}>
              {hasToolbar && (
                <TableToolbar {...getToolbarProps()}>
                  {onBatchDelete && (
                    <TableBatchActions {...batch}>
                      <TableBatchAction
                        renderIcon={TrashCan}
                        onClick={() => {
                          onBatchDelete(selectedRows.flatMap((r) => byId.get(r.id) ?? []));
                          batch.onCancel();
                        }}
                      >
                        Delete
                      </TableBatchAction>
                    </TableBatchActions>
                  )}
                  <TableToolbarContent>
                    {search && (
                      <TableToolbarSearch
                        persistent
                        labelText="Search records"
                        placeholder="Id, values or label"
                        value={search.value}
                        onChange={(e, value) => search.onChange(value ?? (typeof e === "string" ? e : e.target.value))}
                      />
                    )}
                  </TableToolbarContent>
                </TableToolbar>
              )}
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {onBatchDelete && <TableSelectAll {...getSelectionProps()} />}
                    {cols.map((header, i) => {
                      const field = fields[i - 1];
                      const className = header.key === "updatedAt" ? styles.updated : field && isNumeric(field) ? styles.numeric : styles.cell;
                      return (
                        <TableHeader key={header.key} className={className}>
                          {header.header}
                        </TableHeader>
                      );
                    })}
                    {actions && (
                      <TableHeader className={styles.actions}>
                        <span className="cds--visually-hidden">Actions</span>
                      </TableHeader>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const record = byId.get(row.id);
                    if (!record) return null;
                    const { key, ...rowProps } = getRowProps({ row });
                    return (
                      <TableRow key={key} {...rowProps} className={onOpen ? styles.clickable : undefined} onClick={opensRow(record)}>
                        {onBatchDelete && <TableSelectRow {...getSelectionProps({ row })} />}
                        <TableCell className={styles.id}>{record.id}</TableCell>
                        {fields.map((f) => {
                          const shown = formatFieldValue(f, record.values[f.name], labels);
                          return (
                            <TableCell key={f.name} className={isNumeric(f) ? styles.numeric : styles.cell}>
                              {typeof shown === "string" ? (
                                <span className={styles.truncate} title={shown}>
                                  {shown}
                                </span>
                              ) : (
                                shown
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className={styles.updated}>
                          <span title={formatDateTime(record.updatedAt)}>{formatRelative(record.updatedAt)}</span>
                        </TableCell>
                        {actions && (
                          // Menu clicks stop here so they do not open the row.
                          <TableCell className={styles.actions} onClick={(ev: MouseEvent) => ev.stopPropagation()}>
                            <RowMenu record={record} actions={actions(record)} />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }}
      </DataTable>
      {records.length === 0 && <NoDataFound message={`No ${entity.label.toLowerCase()} records match.`} />}
    </>
  );
}

function RowMenu({ record, actions }: { record: EntityRecord; actions: RecordAction[] }) {
  const regular = actions.filter((a) => !a.danger);
  const danger = actions.filter((a) => a.danger);
  const itemText = (a: RecordAction) => (
    <span className={styles.menuItem}>
      {a.icon}
      {a.label}
    </span>
  );
  return (
    <OverflowMenu aria-label={`Actions for ${record.id}`} iconDescription={`Actions for ${record.id}`} renderIcon={OverflowMenuHorizontal} flipped size="sm">
      {regular.map((a) => (
        <OverflowMenuItem key={a.id} itemText={itemText(a)} onClick={a.onAction} />
      ))}
      {danger.map((a, i) => (
        <OverflowMenuItem key={a.id} itemText={itemText(a)} onClick={a.onAction} isDelete hasDivider={i === 0 && regular.length > 0} />
      ))}
    </OverflowMenu>
  );
}
