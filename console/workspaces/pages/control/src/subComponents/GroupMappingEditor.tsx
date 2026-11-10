import { Add, TrashCan } from "@carbon/react/icons";
import { useEffect, useState } from "react";
import { Button, IconButton, Select, SelectItem, TextInput } from "@carbon/react";

import { useCan, useListGroupMappings, useListRoles, useUpdateGroupMappings } from "@workspacenow/api-client";
import type { GroupRoleMapping } from "@workspacenow/types";
import { QueryState, SectionCard, TableSkeleton } from "@workspacenow/views";

import { ControlTable } from "./ControlTable";
import { ManageNotice } from "./ManageNotice";

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
    <SectionCard title="Group to role mappings" subtitle="Group claims in the OIDC token decide each user's WorkspaceNow roles." flush>
      {!canManage && <ManageNotice padded />}
      <QueryState query={roles} skeleton={<TableSkeleton rows={4} columns={3} />}>
        {(roleList) => {
          const indexed = rows.map((row, index) => ({ row, index }));
          return (
            <ControlTable
              label="Group to role mappings"
              rows={indexed}
              rowId={(item) => String(item.index)}
              emptyMessage="No mappings yet. Add one to grant a role from an identity-provider group."
              paginate={false}
              columns={[
                {
                  key: "group",
                  header: "Identity-provider group",
                  cell: ({ row, index }) => (
                    <TextInput
                      id={`mapping-group-${index}`}
                      labelText="Group"
                      hideLabel
                      size="sm"
                      placeholder="group-name"
                      value={row.group}
                      onChange={(e) => setRow(index, { group: e.target.value })}
                    />
                  ),
                },
                {
                  key: "role",
                  header: "WorkspaceNow role",
                  cell: ({ row, index }) => (
                    <Select id={`mapping-role-${index}`} labelText="Role" hideLabel size="sm" value={row.roleId} onChange={(e) => setRow(index, { roleId: e.target.value })}>
                      <SelectItem value="" text="Choose a role" />
                      {roleList.items.map((role) => (
                        <SelectItem key={role.id} value={role.id} text={role.name} />
                      ))}
                    </Select>
                  ),
                },
                {
                  key: "remove",
                  header: "Actions",
                  cell: ({ index }) => (
                    <IconButton size="sm" kind="ghost" label="Remove mapping" onClick={() => setRows((prev) => prev.filter((_r, i) => i !== index))}>
                      <TrashCan />
                    </IconButton>
                  ),
                },
              ]}
              toolbarActions={
                <>
                  <Button kind="ghost" onClick={() => setRows((prev) => [...prev, { group: "", roleId: "" }])} renderIcon={Add}>
                    Add
                  </Button>
                  <Button kind="secondary" disabled={!dirty} onClick={() => setRows(mappings.data?.items ?? [])}>
                    Discard
                  </Button>
                  <Button kind="primary" disabled={!dirty || invalid || update.isPending} onClick={() => update.mutate(rows)}>
                    Save
                  </Button>
                </>
              }
            />
          );
        }}
      </QueryState>
    </SectionCard>
  );
}
