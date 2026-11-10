import { Add, TrashCan } from "@carbon/react/icons";
import { useState } from "react";
import { Button, Checkbox, CheckboxGroup, IconButton, Modal, Stack, Tag } from "@carbon/react";

import { useCan, useCreateGroup, useDeleteGroup, useListGroups, useListUsers, useUpdateGroup } from "@workspacenow/api-client";
import type { Group, GroupInput } from "@workspacenow/types";
import { QueryState, SectionCard, TableSkeleton, TextInput } from "@workspacenow/views";

import styles from "../control.module.scss";
import { ControlTable } from "./ControlTable";
import { ManageNotice } from "./ManageNotice";

const rowId = (group: Group) => group.id;

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

  const columns = [
    {
      key: "group",
      header: "Group",
      cell: (g: Group) => (
        <>
          <p className={styles.name}>{g.name}</p>
          <p className={styles.caption}>{g.description}</p>
        </>
      ),
    },
    {
      key: "members",
      header: "Members",
      cell: (g: Group) => (
        <div className={styles.tags}>
          {g.memberIds.map((m) => (
            <Tag key={m} size="sm" type="gray">
              {userName(m)}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (g: Group) => (
        <div className={styles.actions}>
          <Button size="sm" kind="ghost" onClick={() => setEditing({ group: g, input: { name: g.name, description: g.description, memberIds: g.memberIds } })}>
            Edit
          </Button>
          <IconButton size="sm" kind="ghost" label={`Delete group ${g.name}`} disabled={remove.isPending} onClick={() => remove.mutate(g.id)}>
            <TrashCan />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <SectionCard
      title="WorkspaceNow groups"
      subtitle="Groups live here, not in the IdP. Map their names to roles below; members can also be IdP group claims."
      flush
    >
      {!canManage && <ManageNotice padded />}
      <QueryState query={groups} skeleton={<TableSkeleton rows={3} columns={3} />}>
        {(data) => (
          <ControlTable
            label="WorkspaceNow groups"
            rows={data.items}
            rowId={rowId}
            columns={columns}
            emptyMessage="No groups yet."
            searchText={(g) => `${g.name} ${g.description ?? ""} ${g.memberIds.map(userName).join(" ")}`}
            searchLabel="Search groups"
            batchAction={{ label: "Delete", icon: TrashCan, onAction: (selected) => selected.forEach((g) => remove.mutate(g.id)) }}
            toolbarActions={
              <Button kind="primary" onClick={() => setEditing({ group: null, input: { name: "", description: "", memberIds: [] } })} renderIcon={Add}>
                New group
              </Button>
            }
          />
        )}
      </QueryState>
      <Modal
        open={editing !== null}
        onRequestClose={() => setEditing(null)}
        onRequestSubmit={save}
        modalHeading={editing?.group ? `Edit ${editing.group.name}` : "New group"}
        primaryButtonText="Save group"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!editing || !editing.input.name.trim() || create.isPending || update.isPending}
        size="md"
        hasScrollingContent
      >
        {editing && (
          <Stack gap={5}>
            <TextInput label="Name" required value={editing.input.name} onChange={(v) => setEditing({ ...editing, input: { ...editing.input, name: v } })} />
            <TextInput label="Description" value={editing.input.description ?? ""} onChange={(v) => setEditing({ ...editing, input: { ...editing.input, description: v } })} />
            <QueryState query={users} skeleton={<TableSkeleton rows={4} columns={1} />}>
              {(userList) => (
                <CheckboxGroup legendText="Members">
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
                      labelText={u.name}
                      helperText={u.email}
                    />
                  ))}
                </CheckboxGroup>
              )}
            </QueryState>
          </Stack>
        )}
      </Modal>
    </SectionCard>
  );
}
