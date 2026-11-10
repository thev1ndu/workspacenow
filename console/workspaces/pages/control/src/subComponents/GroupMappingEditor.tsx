import { Add, TrashCan } from "@carbon/react/icons";
import { useEffect, useState } from "react";
import { Button, InlineNotification, Select, SelectItem, TextInput } from "@carbon/react";

import { useCan, useListGroupMappings, useListRoles, useUpdateGroupMappings } from "@workspacenow/api-client";
import type { GroupRoleMapping } from "@workspacenow/types";
import { QueryState, SectionCard, TableSkeleton } from "@workspacenow/views";

/** Edits which identity-provider group grants which WorkspaceNow role. */
export function GroupMappingEditor() {
  const mappings = useListGroupMappings();
  const roles = useListRoles();
  const update = useUpdateGroupMappings();
  const canManage = useCan("control.manage");
  const [rows, setRows] = useState<GroupRoleMapping[]>([]);

  useEffect(() => {
    if (mappings.data) setRows(mappings.data.items);
  }, [mappings.data]);

  const dirty = JSON.stringify(rows) !== JSON.stringify(mappings.data?.items ?? []);
  const invalid = rows.some((r) => !r.group.trim() || !r.roleId);
  const setRow = (index: number, patch: Partial<GroupRoleMapping>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <SectionCard
      title="Group to role mappings"
      subtitle="Group claims in the OIDC token decide each user's WorkspaceNow roles."
      actions={
        <>
          <Button size="sm" kind="ghost" onClick={() => setRows((prev) => [...prev, { group: "", roleId: "" }])} renderIcon={(p) => <Add className="size-4" aria-hidden {...p} />}>
            Add
          </Button>
          <Button size="sm" kind="tertiary" disabled={!dirty} onClick={() => setRows(mappings.data?.items ?? [])}>
            Discard
          </Button>
          <Button size="sm" kind="primary" disabled={!dirty || invalid || update.isPending} onClick={() => update.mutate(rows)}>
            Save
          </Button>
        </>
      }
      flush
    >
      {!canManage && (
        <div className="p-4 pb-0">
          <InlineNotification kind="info" lowContrast hideCloseButton>
            Saving needs <code className="font-mono text-xs">control.manage</code>. You can still try; the platform will deny and audit it.
          </InlineNotification>
        </div>
      )}
      <QueryState query={roles} skeleton={<TableSkeleton rows={4} columns={2} />}>
        {(roleList) => (
          <div className="px-5 py-3">
            <div className="grid grid-cols-[1fr_1fr_2rem] gap-3 pb-2 text-xs font-medium text-muted">
              <span>Identity-provider group</span>
              <span>WorkspaceNow role</span>
              <span />
            </div>
            <div className="grid gap-2">
              {rows.map((row, index) => (
                <div key={index}>
                  {index > 0 && <hr className="mb-2 border-separator" />}
                  <div className="grid grid-cols-[1fr_1fr_2rem] items-center gap-3">
                    <TextInput
                      id={`mapping-group-${index}`}
                      aria-label="Group"
                      labelText="Group"
                      hideLabel
                      placeholder="group-name"
                      className="font-mono w-full"
                      value={row.group}
                      onChange={(e) => setRow(index, { group: e.target.value })}
                    />
                    <Select
                      id={`mapping-role-${index}`}
                      aria-label="Role"
                      labelText="Role"
                      hideLabel
                      className="w-full"
                      value={row.roleId}
                      onChange={(e) => setRow(index, { roleId: e.target.value })}
                    >
                      <SelectItem value="" text="Choose a role" />
                      {roleList.items.map((role) => (
                        <SelectItem key={role.id} value={role.id} text={role.name} />
                      ))}
                    </Select>
                    <Button
                      hasIconOnly
                      size="sm"
                      kind="ghost"
                      iconDescription="Remove mapping"
                      onClick={() => setRows((prev) => prev.filter((_r, i) => i !== index))}
                      renderIcon={(p) => <TrashCan className="size-4" {...p} />}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </QueryState>
    </SectionCard>
  );
}
