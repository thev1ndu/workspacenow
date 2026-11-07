import { useState } from "react";
import { Button, Checkbox, Modal } from "@heroui/react";
import { useCreateAlertRule, useListSLOs, useListWebhooks, useUpdateAlertRule } from "@workspacenow/api-client";
import type { AlertRule, AlertRuleInput } from "@workspacenow/types";
import { SelectInput, TextInput } from "@workspacenow/views";

const SOURCES = [
  { value: "audit", label: "Audit action (e.g. approval.decision)" },
  { value: "event", label: "Platform event (e.g. Stock.LowStockReached)" },
  { value: "slo", label: "SLO burn rate (threshold = burn rate × 100)" },
];

/** Creates or edits an alert rule; the platform validates source-specific fields the same way. */
export function AlertRuleDialog({ onClose, rule }: { onClose: () => void; rule?: AlertRule }) {
  const [name, setName] = useState(rule?.name ?? "");
  const [source, setSource] = useState<AlertRule["source"]>(rule?.source ?? "audit");
  const [action, setAction] = useState(rule?.action ?? "");
  const [outcome, setOutcome] = useState(rule?.outcome ?? "");
  const [threshold, setThreshold] = useState(String(rule?.threshold ?? 5));
  const [windowMinutes, setWindowMinutes] = useState(String(rule?.windowMinutes ?? 60));
  const [webhookId, setWebhookId] = useState(rule?.webhookId ?? "");
  const [sloId, setSloId] = useState(rule?.sloId ?? "");
  const [active, setActive] = useState(rule?.active ?? true);
  const webhooks = useListWebhooks();
  const slos = useListSLOs();
  const create = useCreateAlertRule();
  const update = useUpdateAlertRule();
  const pending = create.isPending || update.isPending;

  const thresholdN = Number(threshold);
  const windowN = Number(windowMinutes);
  const problems: string[] = [];
  if (!name.trim()) problems.push("Name is required");
  if (!(thresholdN > 0)) problems.push(source === "slo" ? "Threshold is burn rate × 100 (e.g. 600 = 6×)" : "Threshold must be at least 1");
  if (!(windowN > 0)) problems.push("Window must be at least 1 minute");
  if (source !== "slo" && !action.trim()) problems.push("The action or event type to match is required");
  if (source === "slo" && !sloId && !action.trim()) problems.push("Pick an SLO or enter the operation name");

  const body: AlertRuleInput = {
    name: name.trim(),
    source,
    action: action.trim(),
    outcome: source === "audit" && outcome ? outcome : undefined,
    threshold: Math.trunc(thresholdN),
    windowMinutes: Math.trunc(windowN),
    webhookId: webhookId || undefined,
    sloId: source === "slo" ? sloId || undefined : undefined,
    active,
  };

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{rule ? "Edit alert rule" : "New alert rule"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="grid gap-4">
            <TextInput label="Name" required value={name} onChange={setName} placeholder="Denied approvals" />
            <SelectInput label="Watches" required value={source} onChange={(v) => setSource(v as AlertRule["source"])} options={SOURCES} />
            {source === "slo" ? (
              <SelectInput
                label="SLO"
                value={sloId}
                onChange={setSloId}
                options={(slos.data?.items ?? []).map((s) => ({ value: s.id, label: `${s.operation} (${(s.targetSuccess * 100).toFixed(1)}% / p95 ${s.targetP95Ms} ms)` }))}
                placeholder="Pick an SLO…"
              />
            ) : null}
            <TextInput
              label={source === "slo" ? "Operation (optional when an SLO is picked)" : source === "event" ? "Event type" : "Audit action"}
              value={action}
              onChange={setAction}
              placeholder={source === "event" ? "Stock.LowStockReached" : "approval.decision"}
            />
            {source === "audit" && (
              <SelectInput
                label="Outcome"
                value={outcome}
                onChange={setOutcome}
                options={[
                  { value: "", label: "Any outcome" },
                  { value: "denied", label: "Denied only" },
                  { value: "allowed", label: "Allowed only" },
                ]}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label={source === "slo" ? "Burn-rate threshold ×100" : "Threshold (count)"}
                type="number"
                required
                value={threshold}
                onChange={setThreshold}
                placeholder={source === "slo" ? "600" : "5"}
              />
              <TextInput label="Window (minutes)" type="number" required value={windowMinutes} onChange={setWindowMinutes} placeholder="60" />
            </div>
            <SelectInput
              label="Notify via webhook"
              value={webhookId}
              onChange={setWebhookId}
              options={[{ value: "", label: "No webhook (event only)" }, ...(webhooks.data?.items ?? []).map((w) => ({ value: w.id, label: w.name }))]}
            />
            <Checkbox isSelected={active} onChange={setActive}>
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <span className="text-sm">Active</span>
              </Checkbox.Content>
            </Checkbox>
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
                (rule ? update.mutate({ ruleId: rule.id, body }, { onSuccess: onClose }) : create.mutate(body, { onSuccess: onClose }))
              }
            >
              {rule ? "Save changes" : "Create alert"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
