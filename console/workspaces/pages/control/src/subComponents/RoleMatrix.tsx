import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";
import { Check } from "@workspacenow/icons";
import { useListRoles } from "@workspacenow/api-client";
import { QueryState, SectionCard } from "@workspacenow/views";

export function RoleMatrix() {
  const roles = useListRoles();
  return (
    <SectionCard title="Roles and permissions" subtitle="What each role may do. Agents and workflows hold their own, narrower permissions." flush>
      <QueryState query={roles}>
        {(data) => {
          const permissions = [...new Set(data.items.flatMap((r) => r.permissions))];
          return (
            <div>
              <TableContainer>
                <Table aria-label="Role permissions" className="min-w-[960px]">
                  <TableHead>
                    <TableRow>
                      <TableHeader id="role" scope="row" className="min-w-48">
                        Role
                      </TableHeader>
                      {permissions.map((p) => (
                        <TableHeader key={p} id={p} className="px-1 text-center align-bottom">
                          <span className="inline-block rotate-180 font-mono text-[11px] whitespace-nowrap [writing-mode:vertical-rl]">{p}</span>
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((role) => (
                      <TableRow key={role.id} id={role.id}>
                        <TableCell>
                          <span className="text-sm font-medium" title={role.description}>
                            {role.name}
                          </span>
                        </TableCell>
                        {permissions.map((p) => (
                          <TableCell key={p} className="px-1 text-center">
                            {role.permissions.includes(p) ? (
                              <Check className="mx-auto size-4 text-success" aria-label={`${role.name} holds ${p}`} />
                            ) : null}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          );
        }}
      </QueryState>
    </SectionCard>
  );
}
