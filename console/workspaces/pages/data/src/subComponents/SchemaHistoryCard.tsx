import { useState } from "react";
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
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
              <TableContainer aria-label="Schema versions">
                <Table className="min-w-[640px]">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Version</TableHeader>
                      <TableHeader>By</TableHeader>
                      <TableHeader>Note</TableHeader>
                      <TableHeader>At</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((v) => (
                      <TableRow key={v.version} id={String(v.version)}>
                        <TableCell className="font-medium tabular-nums">v{v.version}</TableCell>
                        <TableCell>{v.actor}</TableCell>
                        <TableCell className="text-muted">{v.note || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted">{formatDateTime(v.migratedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <div className="flex flex-wrap items-end gap-2 px-5 pb-5">
                <SelectInput label="From" value={from === undefined ? "" : String(from)} onChange={(v) => setFrom(Number(v))} options={versionOptions} />
                <SelectInput label="To" value={to === undefined ? "" : String(to)} onChange={(v) => setTo(Number(v))} options={versionOptions} />
                <Button size="sm" disabled={from === undefined || to === undefined} onClick={() => void compare()}>
                  Diff
                </Button>
              </div>
              {!!error && <p className="px-5 pb-5 text-sm text-danger">{error}</p>}
              {diff && (
                <div className="flex flex-wrap gap-2 border-t border-separator px-5 py-4">
                  <span className="text-xs text-muted self-center">v{diff.from} → v{diff.to}:</span>
                  {diff.added.map((f) => (
                    <Tag key={f} size="sm" type="green">
                      + {f}
                    </Tag>
                  ))}
                  {diff.removed.map((f) => (
                    <Tag key={f} size="sm" type="red">
                      − {f}
                    </Tag>
                  ))}
                  {diff.changed.map((c) => (
                    <Tag key={c.field} size="sm" type="warm-gray" title={`${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`}>
                      ~ {c.field}
                    </Tag>
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
