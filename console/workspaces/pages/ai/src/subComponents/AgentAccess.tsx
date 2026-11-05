import { useState } from "react";
import { Alert, Button, Checkbox, CheckboxGroup, Description } from "@heroui/react";
import { useListMcpTools, useUpdateAgent } from "@workspacenow/api-client";
import type { Agent, Permission } from "@workspacenow/types";
import { QueryState, SectionCard } from "@workspacenow/views";

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

  return (
    <div className="grid gap-6">
      <Alert>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>
            Two checks guard every tool call: the tool must be assigned here, and the agent's own service identity must hold the permission of
            the business operation behind it. Agents never inherit the permissions of the user or workflow that invokes them.
          </Alert.Description>
        </Alert.Content>
      </Alert>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <SectionCard title="Assigned MCP tools" subtitle="Tool-level authorization">
          <QueryState query={allTools}>
            {(data) => (
              <CheckboxGroup aria-label="Assigned MCP tools" value={tools} onChange={setTools} className="grid gap-3">
                {data.items.map((tool) => (
                  <Checkbox key={`${tool.serverId}-${tool.name}`} value={tool.name}>
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="font-mono text-sm">{tool.name}</span>
                    </Checkbox.Content>
                    <Description>{tool.permission ? `Requires ${tool.permission}` : `External · ${tool.description}`}</Description>
                  </Checkbox>
                ))}
              </CheckboxGroup>
            )}
          </QueryState>
        </SectionCard>
        <SectionCard title="Service identity permissions" subtitle="What the agent itself may do">
          <CheckboxGroup
            aria-label="Service identity permissions"
            value={permissions}
            onChange={setPermissions}
            className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
          >
            {PERMISSIONS.map((permission) => (
              <Checkbox key={permission} value={permission}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span className="font-mono text-sm">{permission}</span>
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
        </SectionCard>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="tertiary"
          isDisabled={!dirty}
          onPress={() => {
            setTools(agent.tools);
            setPermissions(agent.permissions);
          }}
        >
          Discard
        </Button>
        <Button
          isDisabled={!dirty}
          isPending={update.isPending}
          onPress={() => update.mutate({ agentId: agent.id, tools, permissions: permissions as Permission[] })}
        >
          Save access
        </Button>
      </div>
    </div>
  );
}
