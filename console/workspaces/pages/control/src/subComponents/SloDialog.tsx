import { useState } from "react";
import { InlineNotification, Modal, NumberInput, Stack, UnorderedList, ListItem } from "@carbon/react";
import { useCreateSLO } from "@workspacenow/api-client";
import { TextInput } from "@workspacenow/views";

/** Defines an SLO for one business operation; measured from the per-minute invoke counters. */
export function SloDialog({ onClose }: { onClose: () => void }) {
  const [operation, setOperation] = useState("");
  const [targetSuccess, setTargetSuccess] = useState("0.999");
  const [targetP95Ms, setTargetP95Ms] = useState("500");
  const [windowMinutes, setWindowMinutes] = useState("10080");
  const create = useCreateSLO();

  const success = Number(targetSuccess);
  const p95 = Number(targetP95Ms);
  const window = Number(windowMinutes);
  const problems: string[] = [];
  if (!operation.trim()) problems.push("Operation is required (e.g. inventory.checkout)");
  if (!(success > 0 && success <= 1)) problems.push("Success target must be between 0 and 1 (e.g. 0.999)");
  if (!(p95 > 0)) problems.push("p95 target must be a positive number of milliseconds");
  if (!(window > 0)) problems.push("Window must be a positive number of minutes");

  const submit = () =>
    create.mutate(
      { operation: operation.trim(), targetSuccess: success, targetP95Ms: Math.trunc(p95), windowMinutes: Math.trunc(window) },
      { onSuccess: onClose },
    );

  return (
    <Modal
      open
      onRequestClose={onClose}
      onRequestSubmit={submit}
      modalHeading="Define SLO"
      primaryButtonText="Define SLO"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={problems.length > 0 || create.isPending}
      size="md"
    >
      <Stack gap={5}>
        <TextInput label="Business operation" required value={operation} onChange={setOperation} placeholder="inventory.checkout" />
        <NumberInput
          id="slo-success"
          label="Success target (0-1)"
          min={0}
          max={1}
          step={0.001}
          allowEmpty
          value={targetSuccess}
          onChange={(_event, state) => setTargetSuccess(String(state.value))}
        />
        <NumberInput id="slo-p95" label="p95 target (ms)" min={1} step={50} allowEmpty value={targetP95Ms} onChange={(_event, state) => setTargetP95Ms(String(state.value))} />
        <NumberInput id="slo-window" label="Window (min)" min={1} step={60} allowEmpty value={windowMinutes} onChange={(_event, state) => setWindowMinutes(String(state.value))} />
        {problems.length > 0 && (
          <InlineNotification kind="warning" lowContrast hideCloseButton title="Check before saving">
            <UnorderedList>
              {problems.map((p) => (
                <ListItem key={p}>{p}</ListItem>
              ))}
            </UnorderedList>
          </InlineNotification>
        )}
      </Stack>
    </Modal>
  );
}
