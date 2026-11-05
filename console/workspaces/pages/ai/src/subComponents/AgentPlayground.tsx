import { useState } from "react";
import { Alert, Button, Form, Input, TextField } from "@heroui/react";
import { PaperPlane } from "@workspacenow/icons";
import { useRunAgent } from "@workspacenow/api-client";
import type { Agent, AgentRun } from "@workspacenow/types";
import { NoDataFound, SectionCard } from "@workspacenow/views";
import { RunTranscript } from "./RunTranscript";

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
      <div className="grid gap-5">
        {runs.length === 0 ? (
          <NoDataFound message="Ask the agent something, or start from an example." />
        ) : (
          <div className="grid gap-6 divide-y divide-separator">
            {runs.map((r) => (
              <div key={r.id} className="pb-6">
                <RunTranscript run={r} />
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <Button key={example} size="sm" variant="secondary" isDisabled={run.isPending} onPress={() => send(example)}>
              {example}
            </Button>
          ))}
        </div>
        <Form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(prompt);
          }}
        >
          <TextField className="flex-1" aria-label={`Message ${agent.name}`} value={prompt} onChange={setPrompt} isDisabled={run.isPending}>
            <Input variant="secondary" placeholder={`Message ${agent.name}`} />
          </TextField>
          <Button type="submit" isPending={run.isPending} isDisabled={!prompt.trim()}>
            <PaperPlane className="size-3.5" aria-hidden />
            Send
          </Button>
        </Form>
        {agent.status !== "active" && (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>This agent is {agent.status}; the platform will refuse to run it.</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </div>
    </SectionCard>
  );
}
