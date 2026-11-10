import { useState } from "react";
import { Button, Checkbox, CheckboxGroup, InlineNotification } from "@carbon/react";
import { useListMcpTools, useUpdateAgent } from "@workspacenow/api-client";
import type { Agent, Permission } from "@workspacenow/types";
import { QueryState, SectionCard, ListSkeleton } from "@workspacenow/views";

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

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string, checked: boolean) =>
    setter((previous) => (checked ? [...previous, value] : previous.filter((v) => v !== value)));

  return (
    <div className="grid gap-6">
      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        subtitle="Two checks guard every tool call: the tool must be assigned here, and the agent's own service identity must hold the permission of the business operation behind it. Agents never inherit the permissions of the user or workflow that invokes them."
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <SectionCard title="Assigned MCP tools" subtitle="Tool-level authorization">
          <QueryState query={allTools} skeleton={<ListSkeleton rows={5} />}>
            {(data) => (
              <CheckboxGroup legendText={<span className="sr-only">Assigned MCP tools</span>} className="grid gap-3">
                {data.items.map((tool) => (
                  <Checkbox
                    key={`${tool.serverId}-${tool.name}`}
                    id={`tool-${tool.serverId}-${tool.name}`}
                    checked={tools.includes(tool.name)}
                    onChange={(_e, { checked }) => toggle(setTools, tool.name, checked)}
                    labelText={
                      <>
                        <span className="font-mono text-sm">{tool.name}</span>
                        <span className="block text-xs text-muted">
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
        <SectionCard title="Service identity permissions" subtitle="What the agent itself may do">
          <CheckboxGroup
            legendText={<span className="sr-only">Service identity permissions</span>}
            className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
          >
            {PERMISSIONS.map((permission) => (
              <Checkbox
                key={permission}
                id={`permission-${permission}`}
                checked={permissions.includes(permission)}
                onChange={(_e, { checked }) => toggle(setPermissions, permission, checked)}
                labelText={<span className="font-mono text-sm">{permission}</span>}
              />
            ))}
          </CheckboxGroup>
        </SectionCard>
      </div>
      <div className="flex justify-end gap-2">
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
    </div>
  );
}
