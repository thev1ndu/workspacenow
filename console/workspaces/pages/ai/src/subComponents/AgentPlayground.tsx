import { Send } from "@carbon/react/icons";
import { useId, useState } from "react";
import { Button, InlineLoading, InlineNotification, Stack, TextInput as CarbonTextInput } from "@carbon/react";

import { useRunAgent } from "@workspacenow/api-client";
import type { Agent, AgentRun } from "@workspacenow/types";
import { NoDataFound, SectionCard } from "@workspacenow/views";
import { RunTranscript } from "./RunTranscript";

import common from "../common.module.scss";
import styles from "./AgentPlayground.module.scss";

const EXAMPLES = [
  "Prepare purchase requests for low-stock items",
  "Which suppliers do we use?",
  "What is the replenishment policy?",
  "Approve the pending purchase request",
  "Track shipment SH-2231",
];

/** Talk to the agent; every tool call goes through the platform and shows the decision. */
export function AgentPlayground({ agent }: { agent: Agent }) {
  const [prompt, setPrompt] = useState("");
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const run = useRunAgent();
  const inputId = useId();

  const send = (text: string) => {
    const value = text.trim();
    if (!value) return;
    run.mutate(
      { agentId: agent.id, prompt: value },
      {
        onSuccess: (result) => {
          setRuns((previous) => [...previous, result]);
          setPrompt("");
        },
      },
    );
  };

  return (
    <SectionCard title="Playground" subtitle={`Runs as ${agent.name}'s service identity on your behalf. Writes are real and audited.`}>
      <Stack gap={5}>
        {runs.length === 0 ? (
          <NoDataFound message="Ask the agent something, or start from an example." />
        ) : (
          <Stack gap={6}>
            {runs.map((r) => (
              <div key={r.id} className={styles.run}>
                <RunTranscript run={r} />
              </div>
            ))}
          </Stack>
        )}
        {run.isPending && <InlineLoading description={`Running ${agent.name}`} />}
        <div className={common.wrap}>
          {EXAMPLES.map((example) => (
            <Button key={example} kind="tertiary" size="sm" disabled={run.isPending} onClick={() => send(example)}>
              {example}
            </Button>
          ))}
        </div>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            send(prompt);
          }}
        >
          <CarbonTextInput
            id={inputId}
            className={styles.input}
            labelText={`Message ${agent.name}`}
            hideLabel
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={run.isPending}
            placeholder={`Message ${agent.name}`}
          />
          <Button type="submit" kind="primary" renderIcon={Send} disabled={!prompt.trim() || run.isPending}>
            Send
          </Button>
        </form>
        {agent.status !== "active" && (
          <InlineNotification
            className={common.notice}
            kind="warning"
            lowContrast
            hideCloseButton
            subtitle={`This agent is ${agent.status}; the platform will refuse to run it.`}
          />
        )}
      </Stack>
    </SectionCard>
  );
}
