import { useState } from "react";
import { Alert, Button, Checkbox, Chip, Modal, Table } from "@heroui/react";
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
        <Button size="sm" onPress={() => setEditing({ group: null, input: { name: "", description: "", memberIds: [] } })}>
          <Plus className="size-4" aria-hidden />
          New group
        </Button>
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
      <QueryState query={groups} skeleton={<TableSkeleton rows={3} columns={3} />}>
        {(data) => (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="WorkspaceNow groups">
                <Table.Header>
                  <Table.Column isRowHeader>Group</Table.Column>
                  <Table.Column>Members</Table.Column>
                  <Table.Column aria-label="Actions" />
                </Table.Header>
                <Table.Body>
                  {data.items.map((g) => (
                    <Table.Row key={g.id} id={g.id}>
                      <Table.Cell>
                        <p className="font-medium">{g.name}</p>
                        <p className="text-xs text-muted">{g.description}</p>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1">
                          {g.memberIds.map((m) => (
                            <Chip key={m} size="sm" variant="secondary">
                              {userName(m)}
                            </Chip>
                          ))}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onPress={() => setEditing({ group: g, input: { name: g.name, description: g.description, memberIds: g.memberIds } })}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            isPending={remove.isPending}
                            onPress={() => remove.mutate(g.id)}
                            aria-label={`Delete group ${g.name}`}
                          >
                            <TrashBin className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </QueryState>
      <Modal.Backdrop isOpen={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{editing?.group ? `Edit ${editing.group.name}` : "New group"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="grid gap-4">
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
                            isSelected={editing.input.memberIds.includes(u.id)}
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
                          >
                            {u.name} <span className="text-xs text-muted">{u.email}</span>
                          </Checkbox>
                        ))}
                      </div>
                    )}
                  </QueryState>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                isDisabled={!editing || !editing.input.name.trim()}
                isPending={create.isPending || update.isPending}
                onPress={save}
              >
                Save group
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </SectionCard>
  );
}
