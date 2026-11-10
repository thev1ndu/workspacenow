import { OverflowMenuHorizontal } from "@carbon/react/icons";
import type { ReactNode } from "react";
import {
  OverflowMenu,
  OverflowMenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";

import type { Entity, EntityField, EntityRecord, FieldValue } from "@workspacenow/types";
import { NoDataFound, StatusChip, formatCurrency, formatDateTime, formatRelative } from "@workspacenow/views";

/** Lifecycle fields read best as coloured status chips; other choices are plain values. */
const isStatusField = (field: EntityField) => field.type === "enum" && /^(status|state|stage)$/i.test(field.name);

const isNumeric = (field: EntityField) => field.type === "number" || field.type === "integer";

export function formatFieldValue(field: EntityField, value: FieldValue, labels: Record<string, Record<string, string>>): ReactNode {
  if (value === null || value === undefined || value === "") return <span className="text-muted">—</span>;
  if (field.type === "reference") return labels[field.reference ?? ""]?.[String(value)] ?? String(value);
  if (isStatusField(field)) return <StatusChip status={String(value)} />;
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "number" && /cost|price|total/i.test(field.name)) return <span className="tabular-nums">{formatCurrency(value)}</span>;
  if (field.type === "number" || field.type === "integer") return <span className="tabular-nums">{String(value)}</span>;
  return String(value);
}

export interface RecordAction {
  id: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onAction: () => void;
}

/** Records of one entity, with columns generated from its definition and a menu of actions per row. */
export function RecordsTable({
  entity,
  records,
  labels,
  onOpen,
  actions,
}: {
  entity: Entity;
  records: EntityRecord[];
  labels: Record<string, Record<string, string>>;
  onOpen?: (record: EntityRecord) => void;
  actions?: (record: EntityRecord) => RecordAction[];
}) {
  if (records.length === 0) return <NoDataFound message={`No ${entity.label.toLowerCase()} records yet.`} />;
  const fields = entity.fields.filter((f) => f.type !== "text").slice(0, 7);
  return (
    <TableContainer aria-label={`${entity.label} records`}>
      <Table className="min-w-[640px]">
        <TableHead>
          <TableRow>
            <TableHeader>Id</TableHeader>
            {fields.map((f) => (
              <TableHeader key={f.name} id={f.name} className={`whitespace-nowrap ${isNumeric(f) ? "text-right" : ""}`}>
                {f.label}
              </TableHeader>
            ))}
            <TableHeader className="text-right whitespace-nowrap">Updated</TableHeader>
            {actions && (
              <TableHeader className="sticky right-0 w-px bg-surface">
                <span className="sr-only">Actions</span>
              </TableHeader>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record) => (
            <TableRow
              key={record.id}
              id={record.id}
              className={onOpen ? "cursor-pointer" : undefined}
              onClick={onOpen ? () => onOpen(record) : undefined}
            >
              <TableCell className="font-mono text-xs whitespace-nowrap text-muted">{record.id}</TableCell>
              {fields.map((f) => {
                const shown = formatFieldValue(f, record.values[f.name], labels);
                return (
                  // Cells stay on one line; long text truncates with the full value on hover.
                  <TableCell key={f.name} className={`whitespace-nowrap ${isNumeric(f) ? "text-right tabular-nums" : ""}`}>
                    {typeof shown === "string" ? (
                      <span className="block max-w-[240px] truncate" title={shown}>
                        {shown}
                      </span>
                    ) : (
                      shown
                    )}
                  </TableCell>
                );
              })}
              <TableCell className="text-right whitespace-nowrap text-muted">
                <span title={formatDateTime(record.updatedAt)}>{formatRelative(record.updatedAt)}</span>
              </TableCell>
              {actions && (
                // Pinned to the right edge so actions stay reachable when the table scrolls sideways.
                <TableCell className="sticky right-0 bg-surface">
                  <RowMenu record={record} actions={actions(record)} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function RowMenu({ record, actions }: { record: EntityRecord; actions: RecordAction[] }) {
  const regular = actions.filter((a) => !a.danger);
  const danger = actions.filter((a) => a.danger);
  const itemText = (a: RecordAction) => (
    <span className="flex items-center gap-2">
      <span className={a.danger ? "[&_svg]:size-4" : "text-muted [&_svg]:size-4"}>{a.icon}</span>
      {a.label}
    </span>
  );
  return (
    <OverflowMenu
      aria-label={`Actions for ${record.id}`}
      renderIcon={(p) => <OverflowMenuHorizontal className="size-4" {...p} />}
    >
      {regular.map((a) => (
        <OverflowMenuItem key={a.id} itemText={itemText(a)} onClick={a.onAction} />
      ))}
      {danger.map((a, i) => (
        <OverflowMenuItem
          key={a.id}
          itemText={itemText(a)}
          onClick={a.onAction}
          isDelete
          hasDivider={i === 0 && regular.length > 0}
        />
      ))}
    </OverflowMenu>
  );
}
