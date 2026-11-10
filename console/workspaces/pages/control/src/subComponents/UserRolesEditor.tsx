import { useEffect, useState } from "react";
import { Checkbox, CheckboxGroup, Modal, Stack, Tag } from "@carbon/react";
import { useCan, useListRoles, useUpdateUserRoles, type UserWithRoles } from "@workspacenow/api-client";
import { QueryState, TableSkeleton } from "@workspacenow/views";

import styles from "../control.module.scss";
import { ManageNotice } from "./ManageNotice";

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
      onRequestSubmit={() => user && update.mutate({ userId: user.id, roleIds: selected }, { onSuccess: onClose })}
      modalHeading={`Roles for ${user?.name ?? ""}`}
      primaryButtonText="Save roles"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={!user || !dirty || update.isPending}
      size="md"
      hasScrollingContent
    >
      <Stack gap={5}>
        {!canManage && <ManageNotice />}
        {user && (
          <div className={styles.tags}>
            <span className={styles.caption}>Groups from the IdP already grant:</span>
            {user.roles.length ? (
              user.roles.map((r) => (
                <Tag key={r} size="sm" type="gray">
                  {r}
                </Tag>
              ))
            ) : (
              <span className={styles.caption}>none</span>
            )}
          </div>
        )}
        <QueryState query={roles} skeleton={<TableSkeleton rows={5} columns={1} />}>
          {(roleList) => (
            <CheckboxGroup legendText="Roles assigned directly">
              {roleList.items.map((r) => (
                <Checkbox
                  key={r.id}
                  id={`user-role-${r.id}`}
                  checked={selected.includes(r.id)}
                  onChange={() => toggle(r.id)}
                  labelText={r.name}
                  helperText={r.description}
                />
              ))}
            </CheckboxGroup>
          )}
        </QueryState>
      </Stack>
    </Modal>
  );
}
