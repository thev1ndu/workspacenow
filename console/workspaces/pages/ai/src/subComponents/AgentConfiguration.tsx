import { useState } from "react";
import { Button, Column, Grid, Stack } from "@carbon/react";
import { useListDepartments, useListModelProviders, useUpdateAgent } from "@workspacenow/api-client";
import type { Agent } from "@workspacenow/types";
import { DetailList, SectionCard, SelectInput, TextInput } from "@workspacenow/views";

import common from "../common.module.scss";

export function AgentConfiguration({ agent }: { agent: Agent }) {
  const [instructions, setInstructions] = useState(agent.instructions);
  const [model, setModel] = useState(agent.model);
  const [status, setStatus] = useState(agent.status);
  const providers = useListModelProviders();
  const departments = useListDepartments();
  const update = useUpdateAgent();

  const modelOptions = (providers.data?.items ?? []).flatMap((p) => p.models.map((m) => ({ value: m, label: `${m} (${p.name})` })));
  if (!modelOptions.some((o) => o.value === model)) modelOptions.push({ value: model, label: model });
  const dirty = instructions !== agent.instructions || model !== agent.model || status !== agent.status;

  return (
    <Grid fullWidth withRowGap>
      <Column sm={4} md={8} lg={11}>
        <SectionCard title="Configuration">
          <Stack gap={5}>
            <TextInput label="Instructions" value={instructions} onChange={setInstructions} multiline rows={6} />
            <SelectInput label="Model" required value={model} onChange={setModel} options={modelOptions} />
            <SelectInput
              label="Status"
              required
              value={status}
              onChange={(v) => setStatus(v as Agent["status"])}
              options={[
                { value: "active", label: "Active" },
                { value: "disabled", label: "Disabled" },
              ]}
            />
            <div className={common.actions}>
              <Button
                kind="tertiary"
                disabled={!dirty}
                onClick={() => {
                  setInstructions(agent.instructions);
                  setModel(agent.model);
                  setStatus(agent.status);
                }}
              >
                Discard
              </Button>
              <Button
                kind="primary"
                disabled={!dirty || update.isPending}
                onClick={() => update.mutate({ agentId: agent.id, instructions, model, status })}
              >
                Save new version
              </Button>
            </div>
          </Stack>
        </SectionCard>
      </Column>
      <Column sm={4} md={8} lg={5}>
        <SectionCard title="Details">
          <DetailList
            items={[
              { label: "Kind", value: agent.kind === "platform" ? "Built-in platform agent" : "Business agent" },
              { label: "Owner", value: departments.data?.items.find((d) => d.id === agent.ownerDepartmentId)?.name ?? agent.ownerDepartmentId },
              { label: "Version", value: agent.version },
              { label: "Execution limit", value: `${agent.maxToolCallsPerRun} tool calls per run` },
              { label: "Identity", value: <span className={common.mono}>agent/{agent.id}</span> },
            ]}
          />
        </SectionCard>
      </Column>
    </Grid>
  );
}
