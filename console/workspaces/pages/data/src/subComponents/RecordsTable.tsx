import type { ReactNode } from "react";
import { Button, Dropdown, Label, Table } from "@heroui/react";
import { Ellipsis } from "@workspacenow/icons";
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
    <Table variant="secondary">
      <Table.ScrollContainer>
        <Table.Content
          aria-label={`${entity.label} records`}
          className="min-w-[640px]"
          onRowAction={onOpen ? (key) => {
            const record = records.find((r) => r.id === key);
            if (record) onOpen(record);
          } : undefined}
        >
          <Table.Header>
            <Table.Column isRowHeader>Id</Table.Column>
            {fields.map((f) => (
              <Table.Column key={f.name} id={f.name} className={`whitespace-nowrap ${isNumeric(f) ? "text-right" : ""}`}>
                {f.label}
              </Table.Column>
            ))}
            <Table.Column className="text-right whitespace-nowrap">Updated</Table.Column>
            {actions && (
              <Table.Column className="sticky right-0 w-px bg-surface">
                <span className="sr-only">Actions</span>
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body>
            {records.map((record) => (
              <Table.Row key={record.id} id={record.id} className={onOpen ? "cursor-pointer" : undefined}>
                <Table.Cell className="font-mono text-xs whitespace-nowrap text-muted">{record.id}</Table.Cell>
                {fields.map((f) => {
                  const shown = formatFieldValue(f, record.values[f.name], labels);
                  return (
                    // Cells stay on one line; long text truncates with the full value on hover.
                    <Table.Cell key={f.name} className={`whitespace-nowrap ${isNumeric(f) ? "text-right tabular-nums" : ""}`}>
                      {typeof shown === "string" ? (
                        <span className="block max-w-[240px] truncate" title={shown}>
                          {shown}
                        </span>
                      ) : (
                        shown
                      )}
                    </Table.Cell>
                  );
                })}
                <Table.Cell className="text-right whitespace-nowrap text-muted">
                  <span title={formatDateTime(record.updatedAt)}>{formatRelative(record.updatedAt)}</span>
                </Table.Cell>
                {actions && (
                  // Pinned to the right edge so actions stay reachable when the table scrolls sideways.
                  <Table.Cell className="sticky right-0 bg-surface">
                    <RowMenu record={record} actions={actions(record)} />
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

function RowMenu({ record, actions }: { record: EntityRecord; actions: RecordAction[] }) {
  const regular = actions.filter((a) => !a.danger);
  const danger = actions.filter((a) => a.danger);
  const run = (key: React.Key) => actions.find((a) => a.id === key)?.onAction();
  return (
    <Dropdown>
      <Button isIconOnly size="sm" variant="ghost" aria-label={`Actions for ${record.id}`}>
        <Ellipsis className="size-4" />
      </Button>
      <Dropdown.Popover placement="bottom end" className="min-w-44">
        <Dropdown.Menu aria-label={`Actions for ${record.id}`} onAction={run}>
          <Dropdown.Section>
            {regular.map((a) => (
              <Dropdown.Item key={a.id} id={a.id} textValue={a.label}>
                <span className="text-muted [&_svg]:size-4">{a.icon}</span>
                <Label>{a.label}</Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
          {danger.length > 0 ? (
            <Dropdown.Section>
              {danger.map((a) => (
                <Dropdown.Item key={a.id} id={a.id} textValue={a.label} variant="danger">
                  <span className="[&_svg]:size-4">{a.icon}</span>
                  <Label>{a.label}</Label>
                </Dropdown.Item>
              ))}
            </Dropdown.Section>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
