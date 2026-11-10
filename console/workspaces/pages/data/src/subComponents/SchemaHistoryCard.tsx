import { useState } from "react";
import { Button, InlineNotification, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { useAuthHooks } from "@workspacenow/auth";
import { diffEntityVersions, useListEntityVersions } from "@workspacenow/api-client";
import type { Entity, EntityVersionDiff } from "@workspacenow/types";
import { NoDataFound, QueryState, SectionCard, SelectInput, TableSkeleton, errorMessage, formatDateTime } from "@workspacenow/views";

import common from "../common.module.scss";
import styles from "./SchemaHistoryCard.module.scss";

/** Schema history: the entity's migration snapshots and a field-level diff between two versions. */
export function SchemaHistoryCard({ entity }: { entity: Entity }) {
  const versions = useListEntityVersions({ entityName: entity.name });
  const { getToken } = useAuthHooks();
  const [from, setFrom] = useState<number>();
  const [to, setTo] = useState<number>();
  const [diff, setDiff] = useState<EntityVersionDiff>();
  const [error, setError] = useState<string>();

  const versionOptions = (versions.data?.items ?? []).map((v) => ({ value: String(v.version), label: `v${v.version}${v.note ? ` - ${v.note}` : ""}` }));
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
            <NoDataFound message="No migrations yet. The current definition is version 1." />
          ) : (
            <>
              <TableContainer aria-label="Schema versions">
                <Table>
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
                        <TableCell className={common.numeric}>v{v.version}</TableCell>
                        <TableCell>{v.actor}</TableCell>
                        <TableCell className={common.muted}>{v.note || "-"}</TableCell>
                        <TableCell className={`${common.nowrap} ${common.muted}`}>{formatDateTime(v.migratedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <div className={styles.compare}>
                <SelectInput label="From" value={from === undefined ? "" : String(from)} onChange={(v) => setFrom(v === "" ? undefined : Number(v))} options={versionOptions} placeholder="Select version" />
                <SelectInput label="To" value={to === undefined ? "" : String(to)} onChange={(v) => setTo(v === "" ? undefined : Number(v))} options={versionOptions} placeholder="Select version" />
                <Button disabled={from === undefined || to === undefined} onClick={() => void compare()}>
                  Diff
                </Button>
              </div>
              {!!error && (
                <div className={styles.notice}>
                  <InlineNotification kind="error" lowContrast hideCloseButton title={error} />
                </div>
              )}
              {diff && (
                <div className={styles.diff}>
                  <span className={common.muted}>
                    v{diff.from} to v{diff.to}:
                  </span>
                  {diff.added.map((f) => (
                    <Tag key={f} size="sm" type="green">
                      + {f}
                    </Tag>
                  ))}
                  {diff.removed.map((f) => (
                    <Tag key={f} size="sm" type="red">
                      - {f}
                    </Tag>
                  ))}
                  {diff.changed.map((c) => (
                    <Tag key={c.field} size="sm" type="warm-gray" title={`${JSON.stringify(c.from)} to ${JSON.stringify(c.to)}`}>
                      ~ {c.field}
                    </Tag>
                  ))}
                  {diff.added.length + diff.removed.length + diff.changed.length === 0 && <span className={common.helper}>no field changes</span>}
                </div>
              )}
            </>
          )
        }
      </QueryState>
    </SectionCard>
  );
}
