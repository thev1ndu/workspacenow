import { useState, type Dispatch, type SetStateAction } from "react";
import { Button, Checkbox, CheckboxGroup, Column, Grid, InlineNotification, Stack } from "@carbon/react";
import { useListMcpTools, useUpdateAgent } from "@workspacenow/api-client";
import type { Agent, Permission } from "@workspacenow/types";
import { ListSkeleton, QueryState, SectionCard } from "@workspacenow/views";

import common from "../common.module.scss";

const PERMISSIONS: Permission[] = [
  "inventory.read",
  "inventory.write",
  "supplier.read",
  "supplier.write",
  "procurement.read",
  "procurement.request",
  "procurement.approve",
  "procurement.order",
  "audit.read",
  "studio.manage",
  "connect.manage",
  "data.manage",
  "ai.manage",
  "flow.manage",
  "control.manage",
  "deployment.promote",
];

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

export function AgentAccess({ agent }: { agent: Agent }) {
  const [tools, setTools] = useState<string[]>(agent.tools);
  const [permissions, setPermissions] = useState<string[]>(agent.permissions);
  const allTools = useListMcpTools();
  const update = useUpdateAgent();

  const dirty = !sameSet(tools, agent.tools) || !sameSet(permissions, agent.permissions);

  const toggle = (setter: Dispatch<SetStateAction<string[]>>, value: string, checked: boolean) =>
    setter((previous) => (checked ? [...previous, value] : previous.filter((v) => v !== value)));

  return (
    <Stack gap={6}>
      <InlineNotification
        className={common.notice}
        kind="info"
        lowContrast
        hideCloseButton
        subtitle="Two checks guard every tool call: the tool must be assigned here, and the agent's own service identity must hold the permission of the business operation behind it. Agents never inherit the permissions of the user or workflow that invokes them."
      />
      <Grid fullWidth withRowGap>
        <Column sm={4} md={8} lg={8}>
          <SectionCard title="Assigned MCP tools" subtitle="Tool-level authorization">
            <QueryState query={allTools} skeleton={<ListSkeleton rows={5} />}>
              {(data) => (
                <CheckboxGroup legendText={<span className="cds--visually-hidden">Assigned MCP tools</span>}>
                  {data.items.map((tool) => (
                    <Checkbox
                      key={`${tool.serverId}-${tool.name}`}
                      id={`tool-${tool.serverId}-${tool.name}`}
                      checked={tools.includes(tool.name)}
                      onChange={(_e, { checked }) => toggle(setTools, tool.name, checked)}
                      labelText={
                        <>
                          <span className={common.mono}>{tool.name}</span>
                          <span className={`${common.secondary} ${common.block}`}>
                            {tool.permission ? `Requires ${tool.permission}` : `External · ${tool.description}`}
                          </span>
                        </>
                      }
                    />
                  ))}
                </CheckboxGroup>
              )}
            </QueryState>
          </SectionCard>
        </Column>
        <Column sm={4} md={8} lg={8}>
          <SectionCard title="Service identity permissions" subtitle="What the agent itself may do">
            <CheckboxGroup legendText={<span className="cds--visually-hidden">Service identity permissions</span>}>
              {PERMISSIONS.map((permission) => (
                <Checkbox
                  key={permission}
                  id={`permission-${permission}`}
                  checked={permissions.includes(permission)}
                  onChange={(_e, { checked }) => toggle(setPermissions, permission, checked)}
                  labelText={<span className={common.mono}>{permission}</span>}
                />
              ))}
            </CheckboxGroup>
          </SectionCard>
        </Column>
      </Grid>
      <div className={common.actions}>
        <Button
          kind="tertiary"
          disabled={!dirty}
          onClick={() => {
            setTools(agent.tools);
            setPermissions(agent.permissions);
          }}
        >
          Discard
        </Button>
        <Button
          kind="primary"
          disabled={!dirty || update.isPending}
          onClick={() => update.mutate({ agentId: agent.id, tools, permissions: permissions as Permission[] })}
        >
          Save access
        </Button>
      </div>
    </Stack>
  );
}
