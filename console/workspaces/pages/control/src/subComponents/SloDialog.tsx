import { useState } from "react";
import { Button, Modal } from "@carbon/react";
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

  return (
    <Modal open onRequestClose={onClose} modalHeading="Define SLO" size="md" passiveModal>
      <div className="grid gap-4">
            <TextInput label="Business operation" required value={operation} onChange={setOperation} placeholder="inventory.checkout" />
            <div className="grid grid-cols-3 gap-4">
              <TextInput label="Success target (0–1)" type="number" required value={targetSuccess} onChange={setTargetSuccess} placeholder="0.999" />
              <TextInput label="p95 target (ms)" type="number" required value={targetP95Ms} onChange={setTargetP95Ms} placeholder="500" />
              <TextInput label="Window (min)" type="number" required value={windowMinutes} onChange={setWindowMinutes} placeholder="10080" />
            </div>
            {problems.length > 0 && (
              <ul className="list-disc pl-5 text-sm text-danger">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
      </div>
      <div className="flex justify-end gap-2 pt-6">
        <Button kind="tertiary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          kind="primary"
          disabled={problems.length > 0 || create.isPending}
          onClick={() =>
            create.mutate(
              { operation: operation.trim(), targetSuccess: success, targetP95Ms: Math.trunc(p95), windowMinutes: Math.trunc(window) },
              { onSuccess: onClose },
            )
          }
        >
          Define SLO
        </Button>
      </div>
    </Modal>
  );
}
