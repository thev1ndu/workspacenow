import { Table, Tooltip } from "@heroui/react";
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Role permissions" className="min-w-[960px]">
                  <Table.Header>
                    <Table.Column id="role" isRowHeader className="min-w-48">
                      Role
                    </Table.Column>
                    {permissions.map((p) => (
                      <Table.Column key={p} id={p} className="px-1 text-center align-bottom">
                        <span className="inline-block rotate-180 font-mono text-[11px] whitespace-nowrap [writing-mode:vertical-rl]">{p}</span>
                      </Table.Column>
                    ))}
                  </Table.Header>
                  <Table.Body>
                    {data.items.map((role) => (
                      <Table.Row key={role.id} id={role.id}>
                        <Table.Cell>
                          <Tooltip delay={300}>
                            <Tooltip.Trigger className="text-sm font-medium">{role.name}</Tooltip.Trigger>
                            <Tooltip.Content>{role.description}</Tooltip.Content>
                          </Tooltip>
                        </Table.Cell>
                        {permissions.map((p) => (
                          <Table.Cell key={p} className="px-1 text-center">
                            {role.permissions.includes(p) ? (
                              <Check className="mx-auto size-4 text-success" aria-label={`${role.name} holds ${p}`} />
                            ) : null}
                          </Table.Cell>
                        ))}
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          );
        }}
      </QueryState>
    </SectionCard>
  );
}
