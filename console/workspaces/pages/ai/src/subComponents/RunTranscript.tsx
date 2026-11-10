import { Chat, Tools } from "@carbon/react/icons";
import {
  Accordion,
  AccordionItem,
  InlineNotification,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
  Tile,
} from "@carbon/react";

import { buildPath, routes, type AgentRun, type ToolCall } from "@workspacenow/types";
import { JsonView, LinkButton, StatusChip, formatDateTime, formatNumber } from "@workspacenow/views";

import common from "../common.module.scss";
import styles from "./RunTranscript.module.scss";

function ToolCallDetail({ call }: { call: ToolCall }) {
  return (
    <Stack gap={4}>
      <div className={styles.callHead}>
        <Tools size={16} aria-hidden />
        <span className={`${common.mono} ${styles.callName}`}>{call.tool}</span>
        <StatusChip status={call.outcome === "error" ? "failed" : call.outcome} label={call.outcome === "error" ? "Error" : undefined} />
      </div>
      <Stack gap={3}>
        <span className={common.secondary}>Input</span>
        <JsonView value={call.input} />
      </Stack>
      {call.reason && (
        <InlineNotification
          className={common.notice}
          kind={call.outcome === "denied" ? "error" : "warning"}
          lowContrast
          hideCloseButton
          subtitle={call.reason}
        />
      )}
      {call.output !== undefined && (
        <Accordion>
          <AccordionItem title="Output">
            <JsonView value={call.output} />
          </AccordionItem>
        </Accordion>
      )}
    </Stack>
  );
}

/** One agent run: reasoning, every tool call and the platform's decision on it, and the answer. */
export function RunTranscript({ run, agentName }: { run: AgentRun; agentName?: string }) {
  return (
    <Stack gap={5}>
      <div className={styles.header}>
        <StatusChip status={run.status} />
        <span className={common.secondary}>
          {agentName ? `${agentName} · ` : ""}
          {run.trigger === "workflow" ? "Workflow" : "Manual"} · {formatDateTime(run.startedAt)} · {(run.durationMs / 1000).toFixed(1)} s ·{" "}
          {formatNumber(run.tokens)} tokens
        </span>
        <span className={styles.spacer} />
        <LinkButton size="sm" variant="ghost" href={buildPath(routes.control.trace, { traceId: run.traceId })}>
          View trace
        </LinkButton>
      </div>
      <Tile>
        <span className={common.label}>Prompt</span>
        <p>{run.prompt}</p>
      </Tile>
      {run.steps.length > 0 && (
        <StructuredListWrapper aria-label="Run steps">
          <StructuredListHead>
            <StructuredListRow head>
              <StructuredListCell head className={styles.stepCell}>
                Step
              </StructuredListCell>
              <StructuredListCell head>Detail</StructuredListCell>
            </StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {run.steps.map((step, index) => (
              <StructuredListRow key={index}>
                <StructuredListCell noWrap className={styles.stepCell}>
                  <Stack gap={2}>
                    <span className={common.secondary}>Step {index + 1}</span>
                    <Tag size="sm" type="gray">
                      {step.kind === "thought" ? "Thought" : "Tool call"}
                    </Tag>
                  </Stack>
                </StructuredListCell>
                <StructuredListCell>
                  {step.kind === "thought" ? <p className={styles.thought}>{step.text}</p> : <ToolCallDetail call={step.call} />}
                </StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      )}
      <Tile>
        <div className={styles.answer}>
          <Chat size={16} aria-hidden />
          <p>{run.answer}</p>
        </div>
      </Tile>
    </Stack>
  );
}
