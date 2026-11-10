import { useState } from "react";
import { Column, Grid, Modal, Stack } from "@carbon/react";
import { useCreateIntegration, useListSecrets, useUpdateIntegration } from "@workspacenow/api-client";
import type { Integration, IntegrationInput } from "@workspacenow/types";
import { SelectInput, TextInput } from "@workspacenow/views";

import common from "../common.module.scss";

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
    { value: CUSTOM, label: "Custom reference..." },
  ];

  return (
    <Modal
      open
      size="md"
      modalHeading={integration ? "Edit integration" : "New integration"}
      onRequestClose={onClose}
      primaryButtonText={integration ? "Save changes" : "Create integration"}
      primaryButtonDisabled={problems.length > 0}
      loadingStatus={pending ? "active" : "inactive"}
      onRequestSubmit={() =>
        integration
          ? update.mutate({ integrationId: integration.id, body }, { onSuccess: onClose })
          : create.mutate(body, { onSuccess: onClose })
      }
      secondaryButtonText="Cancel"
      onSecondarySubmit={onClose}
    >
      <Stack gap={5}>
        <TextInput label="Name" required value={name} onChange={setName} placeholder="ERP database" />
        <Grid narrow>
          <Column sm={4} md={4} lg={8}>
            <SelectInput label="Kind" required value={kind} onChange={(v) => setKind(v as IntegrationInput["kind"])} options={KINDS} />
          </Column>
          <Column sm={4} md={4} lg={8}>
            <SelectInput label="Retry policy" value={retryPolicy} onChange={setRetryPolicy} options={RETRIES} />
          </Column>
        </Grid>
        <TextInput label="Target" required value={target} onChange={setTarget} placeholder="https://erp.example.com/api or db.internal:5432" />
        <TextInput label="Timeout (ms)" type="number" required value={timeoutMs} onChange={setTimeoutMs} placeholder="5000" />
        <SelectInput label="Credential (OpenBao reference)" value={secretChoice} onChange={setSecretChoice} options={secretOptions} />
        {secretChoice === CUSTOM && (
          <TextInput label="Custom secret reference" value={customRef} onChange={setCustomRef} placeholder="vault://integrations/my-cred" />
        )}
        <p className={common.secondary}>
          The platform stores only the reference; the secret itself stays in OpenBao and is resolved when the integration is used or tested.
        </p>
        {problems.length > 0 && (
          <ul className={common.list}>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </Stack>
    </Modal>
  );
}
