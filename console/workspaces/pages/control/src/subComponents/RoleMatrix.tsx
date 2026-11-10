import { Checkbox } from "@carbon/react";

import { useListRoles } from "@workspacenow/api-client";
import type { Permission } from "@workspacenow/types";
import { QueryState, SectionCard } from "@workspacenow/views";

import styles from "../control.module.scss";
import { ControlTable } from "./ControlTable";

const rowId = (permission: Permission) => permission;

/** Permissions down the side, roles across the top; a checked box means the role holds the permission. */
export function RoleMatrix() {
  const roles = useListRoles();
  return (
    <SectionCard title="Roles and permissions" subtitle="What each role may do. Agents and workflows hold their own, narrower permissions." flush>
      <QueryState query={roles}>
        {(data) => {
          const permissions = [...new Set(data.items.flatMap((r) => r.permissions))];
          const columns = [
            { key: "permission", header: "Permission", cell: (permission: Permission) => <span className={styles.mono}>{permission}</span> },
            ...data.items.map((role) => ({
              key: role.id,
              header: <span title={role.description}>{role.name}</span>,
              cell: (permission: Permission) => (
                <div className={styles.checkbox}>
                  <Checkbox
                    id={`matrix-${role.id}-${permission}`}
                    labelText={`${role.name} holds ${permission}`}
                    hideLabel
                    readOnly
                    checked={role.permissions.includes(permission)}
                  />
                </div>
              ),
            })),
          ];
          return (
            <ControlTable
              label="Role permissions"
              rows={permissions}
              rowId={rowId}
              columns={columns}
              emptyMessage="No permissions defined."
              searchText={(permission) => permission}
              searchLabel="Search permissions"
              defaultPageSize={25}
            />
          );
        }}
      </QueryState>
    </SectionCard>
  );
}
