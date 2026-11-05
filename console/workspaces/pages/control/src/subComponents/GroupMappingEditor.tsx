import { useEffect, useState } from "react";
import { Alert, Button, Input, ListBox, Select, Separator, TextField } from "@heroui/react";
import { Plus, TrashBin } from "@workspacenow/icons";
import { useCan, useListGroupMappings, useListRoles, useUpdateGroupMappings } from "@workspacenow/api-client";
import type { GroupRoleMapping } from "@workspacenow/types";
import { QueryState, SectionCard } from "@workspacenow/views";

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
          <Button size="sm" variant="ghost" onPress={() => setRows((prev) => [...prev, { group: "", roleId: "" }])}>
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
          <Button size="sm" variant="tertiary" isDisabled={!dirty} onPress={() => setRows(mappings.data?.items ?? [])}>
            Discard
          </Button>
          <Button size="sm" isDisabled={!dirty || invalid} isPending={update.isPending} onPress={() => update.mutate(rows)}>
            Save
          </Button>
        </>
      }
      flush
    >
      {!canManage && (
        <div className="p-4 pb-0">
          <Alert>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                Saving needs <code className="font-mono text-xs">control.manage</code>. You can still try; the platform will deny and audit it.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}
      <QueryState query={roles}>
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
                  {index > 0 && <Separator className="mb-2" />}
                  <div className="grid grid-cols-[1fr_1fr_2rem] items-center gap-3">
                    <TextField aria-label="Group" value={row.group} onChange={(value) => setRow(index, { group: value })}>
                      <Input variant="secondary" placeholder="group-name" className="font-mono" />
                    </TextField>
                    <Select variant="secondary"
                      aria-label="Role"
                      placeholder="Choose a role"
                      value={row.roleId || null}
                      onChange={(key) => setRow(index, { roleId: key == null ? "" : String(key) })}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {roleList.items.map((role) => (
                            <ListBox.Item key={role.id} id={role.id} textValue={role.name}>
                              {role.name}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label="Remove mapping"
                      onPress={() => setRows((prev) => prev.filter((_r, i) => i !== index))}
                    >
                      <TrashBin className="size-4" />
                    </Button>
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
