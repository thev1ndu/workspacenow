import { useEffect, useState } from "react";
import { Alert, Button, Checkbox, Chip, Modal } from "@heroui/react";
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
    <Modal.Backdrop isOpen={user !== null} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Roles for {user?.name ?? ""}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="grid gap-4">
            {!canManage && (
              <Alert>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    Saving needs <code className="font-mono text-xs">control.manage</code>. You can still try; the platform will deny and audit it.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}
            {user && (
              <p className="text-xs text-muted">
                Groups from the IdP already grant:{" "}
                {user.roles.length ? (
                  user.roles.map((r) => (
                    <Chip key={r} size="sm" variant="secondary" className="mr-1">
                      {r}
                    </Chip>
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
                      <Checkbox isSelected={selected.includes(r.id)} onChange={() => toggle(r.id)}>
                        <span className="font-medium">{r.name}</span>
                        <span className="block text-xs text-muted">{r.description}</span>
                      </Checkbox>
                    </li>
                  ))}
                </ul>
              )}
            </QueryState>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onClose}>
              Cancel
            </Button>
            <Button
              isDisabled={!user || !dirty}
              isPending={update.isPending}
              onPress={() => user && update.mutate({ userId: user.id, roleIds: selected }, { onSuccess: onClose })}
            >
              Save roles
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
