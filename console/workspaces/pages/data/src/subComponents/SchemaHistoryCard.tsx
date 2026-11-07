import { useState } from "react";
import { Button, Chip, Table } from "@heroui/react";
import { useAuthHooks } from "@workspacenow/auth";
import { diffEntityVersions, useListEntityVersions } from "@workspacenow/api-client";
import type { Entity, EntityVersionDiff } from "@workspacenow/types";
import { NoDataFound, QueryState, SectionCard, SelectInput, TableSkeleton, errorMessage, formatDateTime } from "@workspacenow/views";

/** Schema history: the entity's migration snapshots and a field-level diff between two versions. */
export function SchemaHistoryCard({ entity }: { entity: Entity }) {
  const versions = useListEntityVersions({ entityName: entity.name });
  const { getToken } = useAuthHooks();
  const [from, setFrom] = useState<number>();
  const [to, setTo] = useState<number>();
  const [diff, setDiff] = useState<EntityVersionDiff>();
  const [error, setError] = useState<string>();

  const versionOptions = (versions.data?.items ?? []).map((v) => ({ value: String(v.version), label: `v${v.version}${v.note ? ` — ${v.note}` : ""}` }));
  const compare = async () => {
    if (from === undefined || to === undefined) return;
    setError(undefined);
    try {
      setDiff(await diffEntityVersions({ entityName: entity.name, from, to }, getToken));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <SectionCard title="Schema history" subtitle="One immutable snapshot per migration; compare two versions field by field." flush>
      <QueryState query={versions} skeleton={<TableSkeleton columns={4} />}>
        {(data) =>
          data.items.length === 0 ? (
            <NoDataFound message="No migrations yet — the current definition is version 1." />
          ) : (
            <div className="grid gap-4">
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Schema versions" className="min-w-[640px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Version</Table.Column>
                      <Table.Column>By</Table.Column>
                      <Table.Column>Note</Table.Column>
                      <Table.Column>At</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {data.items.map((v) => (
                        <Table.Row key={v.version} id={String(v.version)}>
                          <Table.Cell className="font-medium tabular-nums">v{v.version}</Table.Cell>
                          <Table.Cell>{v.actor}</Table.Cell>
                          <Table.Cell className="text-muted">{v.note || "—"}</Table.Cell>
                          <Table.Cell className="whitespace-nowrap text-muted">{formatDateTime(v.migratedAt)}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
              <div className="flex flex-wrap items-end gap-2 px-5 pb-5">
                <SelectInput label="From" value={from === undefined ? "" : String(from)} onChange={(v) => setFrom(Number(v))} options={versionOptions} />
                <SelectInput label="To" value={to === undefined ? "" : String(to)} onChange={(v) => setTo(Number(v))} options={versionOptions} />
                <Button size="sm" isDisabled={from === undefined || to === undefined} onPress={() => void compare()}>
                  Diff
                </Button>
              </div>
              {!!error && <p className="px-5 pb-5 text-sm text-danger">{error}</p>}
              {diff && (
                <div className="flex flex-wrap gap-2 border-t border-separator px-5 py-4">
                  <span className="text-xs text-muted self-center">v{diff.from} → v{diff.to}:</span>
                  {diff.added.map((f) => (
                    <Chip key={f} size="sm" variant="soft" color="success">
                      + {f}
                    </Chip>
                  ))}
                  {diff.removed.map((f) => (
                    <Chip key={f} size="sm" variant="soft" color="danger">
                      − {f}
                    </Chip>
                  ))}
                  {diff.changed.map((c) => (
                    <Chip key={c.field} size="sm" variant="soft" color="warning" title={`${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`}>
                      ~ {c.field}
                    </Chip>
                  ))}
                  {diff.added.length + diff.removed.length + diff.changed.length === 0 && <span className="text-sm text-muted">no field changes</span>}
                </div>
              )}
            </div>
          )
        }
      </QueryState>
    </SectionCard>
  );
}
