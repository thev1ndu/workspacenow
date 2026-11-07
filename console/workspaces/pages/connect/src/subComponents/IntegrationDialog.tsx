import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { useCreateIntegration, useListSecrets, useUpdateIntegration } from "@workspacenow/api-client";
import type { Integration, IntegrationInput } from "@workspacenow/types";
import { SelectInput, TextInput } from "@workspacenow/views";

const KINDS = ["rest", "webhook", "database", "message-broker", "saas", "soap"].map((k) => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1).replace(/-/g, " ") }));
const RETRIES = ["None", "Linear 3x", "Exponential backoff"].map((r) => ({ value: r, label: r }));
const CUSTOM = "__custom__";

/** Creates or edits an integration; the credential is picked from OpenBao references, never typed in. */
export function IntegrationDialog({ onClose, integration }: { onClose: () => void; integration?: Integration }) {
  const [name, setName] = useState(integration?.name ?? "");
  const [kind, setKind] = useState<IntegrationInput["kind"]>(integration?.kind ?? "rest");
  const [target, setTarget] = useState(integration?.target ?? "");
  const [retryPolicy, setRetryPolicy] = useState(integration?.retryPolicy ?? "None");
  const [timeoutMs, setTimeoutMs] = useState(String(integration?.timeoutMs ?? 5000));
  const [secretRef, setSecretRef] = useState(integration?.secretRef ?? "");
  const [customRef, setCustomRef] = useState("");
  const [secretChoice, setSecretChoice] = useState<string>(integration?.secretRef ?? "");
  const secrets = useListSecrets();
  const create = useCreateIntegration();
  const update = useUpdateIntegration();
  const pending = create.isPending || update.isPending;

  const timeout = Number(timeoutMs);
  const ref = secretChoice === CUSTOM ? customRef.trim() : secretChoice;
  const problems: string[] = [];
  if (!name.trim()) problems.push("Name is required");
  if (!target.trim()) problems.push("Target URL or host is required");
  if (!(timeout > 0)) problems.push("Timeout must be a positive number of milliseconds");
  if (ref && !/^[a-z0-9-]+:\/\/|^\w+\/\S+$/.test(ref)) problems.push("Secret reference looks wrong (e.g. vault://integrations/delivery-hmac)");

  const body: IntegrationInput = {
    name: name.trim(),
    kind,
    target: target.trim(),
    retryPolicy,
    timeoutMs: Math.trunc(timeout),
    secretRef: ref,
    auth: integration?.auth,
  };

  const secretOptions = [
    { value: "", label: "No credential" },
    ...(secrets.data?.items ?? []).map((p) => ({ value: p, label: p })),
    { value: CUSTOM, label: "Custom reference…" },
  ];

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{integration ? "Edit integration" : "New integration"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="grid gap-4">
            <TextInput label="Name" required value={name} onChange={setName} placeholder="ERP database" />
            <div className="grid grid-cols-2 gap-4">
              <SelectInput label="Kind" required value={kind} onChange={(v) => setKind(v as IntegrationInput["kind"])} options={KINDS} />
              <SelectInput label="Retry policy" value={retryPolicy} onChange={setRetryPolicy} options={RETRIES} />
            </div>
            <TextInput label="Target" required value={target} onChange={setTarget} placeholder="https://erp.example.com/api or db.internal:5432" />
            <TextInput label="Timeout (ms)" type="number" required value={timeoutMs} onChange={setTimeoutMs} placeholder="5000" />
            <SelectInput label="Credential (OpenBao reference)" value={secretChoice} onChange={setSecretChoice} options={secretOptions} />
            {secretChoice === CUSTOM && (
              <TextInput label="Custom secret reference" value={customRef} onChange={setCustomRef} placeholder="vault://integrations/my-cred" />
            )}
            <p className="text-xs text-muted">The platform stores only the reference; the secret itself stays in OpenBao and is resolved when the integration is used or tested.</p>
            {problems.length > 0 && (
              <ul className="list-disc pl-5 text-sm text-danger">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Cancel
            </Button>
            <Button
              isDisabled={problems.length > 0}
              isPending={pending}
              onPress={() =>
                integration
                  ? update.mutate({ integrationId: integration.id, body }, { onSuccess: onClose })
                  : create.mutate(body, { onSuccess: onClose })
              }
            >
              {integration ? "Save changes" : "Create integration"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
