import { useEffect, useState } from "react";
import { Button, Checkbox, InlineNotification, Modal, Tag } from "@carbon/react";
import { useCan, useListRoles, useUpdateUserRoles, type UserWithRoles } from "@workspacenow/api-client";
import { QueryState, TableSkeleton } from "@workspacenow/views";

interface Props {
  user: UserWithRoles | null;
  onClose: () => void;
}

/** Dialog that sets the roles explicitly assigned to one user (group-mapped roles stay). */
export function UserRolesEditor({ user, onClose }: Props) {
  const roles = useListRoles();
  const update = useUpdateUserRoles();
  const canManage = useCan("control.manage");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (user) setSelected(user.roleIds ?? []);
  }, [user]);

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...(user?.roleIds ?? [])].sort());

  return (
    <Modal
      open={user !== null}
      onRequestClose={onClose}
      modalHeading={`Roles for ${user?.name ?? ""}`}
      size="lg"
      hasScrollingContent
      passiveModal
    >
      <div className="grid gap-4">
        {!canManage && (
          <InlineNotification kind="info" lowContrast hideCloseButton>
            Saving needs <code className="font-mono text-xs">control.manage</code>. You can still try; the platform will deny and audit it.
          </InlineNotification>
        )}
        {user && (
          <p className="text-xs text-muted">
            Groups from the IdP already grant:{" "}
            {user.roles.length ? (
              user.roles.map((r) => (
                <Tag key={r} size="sm" type="gray" className="mr-1">
                  {r}
                </Tag>
              ))
            ) : (
              "none"
            )}
          </p>
        )}
        <QueryState query={roles} skeleton={<TableSkeleton rows={5} columns={1} />}>
          {(roleList) => (
            <ul className="grid gap-2">
              {roleList.items.map((r) => (
                <li key={r.id}>
                  <Checkbox
                    id={`user-role-${r.id}`}
                    checked={selected.includes(r.id)}
                    onChange={() => toggle(r.id)}
                    labelText={
                      <>
                        <span className="font-medium">{r.name}</span>
                        <span className="block text-xs text-muted">{r.description}</span>
                      </>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </div>
      <div className="flex justify-end gap-2 pt-6">
        <Button kind="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          kind="primary"
          disabled={!user || !dirty || update.isPending}
          onClick={() => user && update.mutate({ userId: user.id, roleIds: selected }, { onSuccess: onClose })}
        >
          Save roles
        </Button>
      </div>
    </Modal>
  );
}
