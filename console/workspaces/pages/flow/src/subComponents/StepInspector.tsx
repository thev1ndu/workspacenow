import { Button } from "@carbon/react";
import { TrashBin } from "@workspacenow/icons";
import type { ConditionOperator, Workflow, WorkflowStep } from "@workspacenow/types";
import { SelectInput, TextInput } from "@workspacenow/views";
import { OPERATORS, STEP_KINDS } from "./FlowNodes";

export interface InspectorOptions {
  agents: Array<{ value: string; label: string }>;
  operations: Array<{ value: string; label: string }>;
  permissions: Array<{ value: string; label: string }>;
  events: Array<{ value: string; label: string }>;
}

const OPERATOR_OPTIONS = (Object.keys(OPERATORS) as ConditionOperator[]).map((value) => ({ value, label: OPERATORS[value] }));
const TEMPLATE_HINT = "Insert values from the run with {{field}}, e.g. {{productName}}.";

/** Settings for one step; every change is applied to the draft at once. */
export function StepInspector({ step, options, onChange, onDelete }: { step: WorkflowStep; options: InspectorOptions; onChange: (step: WorkflowStep) => void; onDelete: () => void }) {
  const kind = STEP_KINDS.find((k) => k.kind === step.kind)!;
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        <kind.icon className="size-3.5" />
        {kind.label} step
      </div>
      <TextInput label="Name" required value={step.name} onChange={(name) => onChange({ ...step, name })} />
      {step.kind === "agent" && (
        <>
          <SelectInput label="Agent" required value={step.agentId} onChange={(agentId) => onChange({ ...step, agentId })} options={options.agents} placeholder="Choose an agent" />
          <TextInput label="Instructions" required multiline rows={4} value={step.prompt} onChange={(prompt) => onChange({ ...step, prompt })} helperText={TEMPLATE_HINT} />
        </>
      )}
      {step.kind === "approval" && (
        <>
          <SelectInput label="Approver needs" required value={step.permission} onChange={(permission) => onChange({ ...step, permission: permission as typeof step.permission })} options={options.permissions} />
          <TextInput label="What to check" multiline rows={3} value={step.description} onChange={(description) => onChange({ ...step, description })} />
          <p className="text-xs text-muted">Drag from the red handle on the node's right to choose what happens when it is rejected; otherwise a rejection ends the run.</p>
        </>
      )}
      {step.kind === "operation" && (
        <SelectInput
          label="Business operation"
          required
          value={step.businessOperation}
          onChange={(businessOperation) => onChange({ ...step, businessOperation })}
          options={options.operations}
          placeholder="Choose an operation"
        />
      )}
      {step.kind === "notify" && (
        <>
          <TextInput label="Channel" required value={step.channel} onChange={(channel) => onChange({ ...step, channel })} helperText="For example email:store-managers or slack:#ops." />
          <TextInput label="Message" required multiline rows={3} value={step.message} onChange={(message) => onChange({ ...step, message })} helperText={TEMPLATE_HINT} />
        </>
      )}
      {step.kind === "condition" && (
        <>
          <TextInput
            label="Value to check"
            required
            value={step.field}
            onChange={(field) => onChange({ ...step, field })}
            helperText="A field from the trigger or an earlier step, e.g. quantity, order.total or approval."
          />
          <SelectInput label="Test" value={step.operator} onChange={(operator) => onChange({ ...step, operator: operator as ConditionOperator })} options={OPERATOR_OPTIONS} />
          {step.operator !== "exists" && <TextInput label="Compare with" required value={step.value} onChange={(value) => onChange({ ...step, value })} />}
          <p className="text-xs text-muted">Connect the green handle for "yes" and the red one for "no".</p>
        </>
      )}
      {step.kind === "wait" && (
        <TextInput label="Minutes" type="number" required value={String(step.minutes)} onChange={(minutes) => onChange({ ...step, minutes: Number(minutes) })} />
      )}
      <div>
        <Button size="sm" kind="danger--ghost" onClick={onDelete}>
          <TrashBin className="size-4" aria-hidden />
          Delete step
        </Button>
      </div>
    </div>
  );
}

const TRIGGER_KINDS = [
  { value: "manual", label: "Run by hand" },
  { value: "entity-event", label: "When an event happens" },
  { value: "schedule", label: "On a schedule" },
];

/** What starts the workflow. */
export function TriggerInspector({ trigger, events, onChange }: { trigger: Workflow["trigger"]; events: InspectorOptions["events"]; onChange: (trigger: Workflow["trigger"]) => void }) {
  return (
    <div className="grid gap-4">
      <p className="text-xs font-medium text-muted">Trigger</p>
      <SelectInput
        label="Starts"
        value={trigger.kind}
        onChange={(kind) =>
          onChange(kind === "entity-event" ? { kind, event: events[0]?.value ?? "" } : kind === "schedule" ? { kind, cron: "0 9 * * 1" } : { kind: "manual" })
        }
        options={TRIGGER_KINDS}
      />
      {trigger.kind === "entity-event" && <SelectInput label="Event" required value={trigger.event} onChange={(event) => onChange({ kind: "entity-event", event })} options={events} />}
      {trigger.kind === "schedule" && (
        <TextInput label="Cron" required value={trigger.cron} onChange={(cron) => onChange({ kind: "schedule", cron })} helperText="Minute hour day month weekday, e.g. 0 9 * * 1 for Mondays at 9:00." />
      )}
    </div>
  );
}
