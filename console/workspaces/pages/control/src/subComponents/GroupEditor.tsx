import { useState } from "react";
import { Button, Checkbox, InlineNotification, Modal, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { Plus, TrashBin } from "@workspacenow/icons";
import {
  useCan,
  useCreateGroup,
  useDeleteGroup,
  useListGroups,
  useListUsers,
  useUpdateGroup,
} from "@workspacenow/api-client";
import type { Group, GroupInput } from "@workspacenow/types";
import { QueryState, SectionCard, TableSkeleton, TextInput } from "@workspacenow/views";

/** CRUD for WorkspaceNow-native groups: created and staffed here, not in the identity provider. */
export function GroupEditor() {
  const groups = useListGroups();
  const users = useListUsers();
  const create = useCreateGroup();
  const update = useUpdateGroup();
  const remove = useDeleteGroup();
  const canManage = useCan("control.manage");
  const [editing, setEditing] = useState<{ group: Group | null; input: GroupInput } | null>(null);

  const userName = (id: string) => users.data?.items.find((u) => u.id === id)?.name ?? id;
  const save = () => {
    if (!editing) return;
    const { group, input } = editing;
    if (group) update.mutate({ groupId: group.id, input }, { onSuccess: () => setEditing(null) });
    else create.mutate(input, { onSuccess: () => setEditing(null) });
  };

  return (
    <SectionCard
      title="WorkspaceNow groups"
      subtitle="Groups live here, not in the IdP. Map their names to roles below; members can also be IdP group claims."
      actions={
        <Button size="sm" kind="primary" onClick={() => setEditing({ group: null, input: { name: "", description: "", memberIds: [] } })} renderIcon={(p) => <Plus className="size-4" aria-hidden {...p} />}>
          New group
        </Button>
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
      <QueryState query={groups} skeleton={<TableSkeleton rows={3} columns={3} />}>
        {(data) => (
          <div>
            <TableContainer>
              <Table aria-label="WorkspaceNow groups">
                <TableHead>
                  <TableRow>
                    <TableHeader scope="row">Group</TableHeader>
                    <TableHeader>Members</TableHeader>
                    <TableHeader aria-label="Actions" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((g) => (
                    <TableRow key={g.id} id={g.id}>
                      <TableCell>
                        <p className="font-medium">{g.name}</p>
                        <p className="text-xs text-muted">{g.description}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {g.memberIds.map((m) => (
                            <Tag key={m} size="sm" type="gray">
                              {userName(m)}
                            </Tag>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" kind="ghost" onClick={() => setEditing({ group: g, input: { name: g.name, description: g.description, memberIds: g.memberIds } })}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            kind="ghost"
                            disabled={remove.isPending}
                            onClick={() => remove.mutate(g.id)}
                            aria-label={`Delete group ${g.name}`}
                            renderIcon={(p) => <TrashBin className="size-4" aria-hidden {...p} />}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </QueryState>
      <Modal
        open={editing !== null}
        onRequestClose={() => setEditing(null)}
        modalHeading={editing?.group ? `Edit ${editing.group.name}` : "New group"}
        size="md"
        hasScrollingContent
        passiveModal
      >
        <div className="grid gap-4">
          {editing && (
            <>
              <TextInput label="Name" required value={editing.input.name} onChange={(v) => setEditing({ ...editing, input: { ...editing.input, name: v } })} />
              <TextInput label="Description" value={editing.input.description ?? ""} onChange={(v) => setEditing({ ...editing, input: { ...editing.input, description: v } })} />
              <QueryState query={users} skeleton={<TableSkeleton rows={4} columns={1} />}>
                {(userList) => (
                  <div className="grid gap-2">
                    <p className="text-xs font-medium text-muted">Members</p>
                    {userList.items.map((u) => (
                      <Checkbox
                        key={u.id}
                        id={`group-member-${u.id}`}
                        checked={editing.input.memberIds.includes(u.id)}
                        onChange={() =>
                          setEditing({
                            ...editing,
                            input: {
                              ...editing.input,
                              memberIds: editing.input.memberIds.includes(u.id)
                                ? editing.input.memberIds.filter((m) => m !== u.id)
                                : [...editing.input.memberIds, u.id],
                            },
                          })
                        }
                        labelText={
                          <>
                            {u.name} <span className="text-xs text-muted">{u.email}</span>
                          </>
                        }
                      />
                    ))}
                  </div>
                )}
              </QueryState>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-6">
          <Button kind="ghost" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            disabled={!editing || !editing.input.name.trim() || create.isPending || update.isPending}
            onClick={save}
          >
            Save group
          </Button>
        </div>
      </Modal>
    </SectionCard>
  );
}
