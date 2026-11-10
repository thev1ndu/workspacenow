import { Add, Edit, Notification, TrashCan } from "@carbon/react/icons";
import { useState } from "react";
import { Button, IconButton, InlineNotification, Stack, Tag } from "@carbon/react";

import { useAckAlertFire, useCan, useDeleteAlertRule, useListAlertFires, useListAlertRules, useListSLOs } from "@workspacenow/api-client";
import type { AlertFire, AlertRule, Slo } from "@workspacenow/types";
import { PageLayout, QueryState, SectionCard, StatusChip, TableSkeleton, errorMessage, formatDateTime } from "@workspacenow/views";

import styles from "./control.module.scss";
import { AlertRuleDialog } from "./subComponents/AlertRuleDialog";
import { ControlTable } from "./subComponents/ControlTable";
import { SloDialog } from "./subComponents/SloDialog";

const SOURCE_LABEL: Record<AlertRule["source"], string> = {
  audit: "Audit",
  event: "Event",
  slo: "SLO burn rate",
};

const ruleId = (rule: AlertRule) => rule.id;
const fireId = (fire: AlertFire) => fire.id;
const sloRowId = (slo: Slo) => slo.id;

/** Alert rules, their fires, SLOs and backup records: the ops surface of the control workspace. */
export function AlertsPage() {
  const canManage = useCan("control.manage");
  const rules = useListAlertRules();
  const slos = useListSLOs();
  const [selected, setSelected] = useState<AlertRule>();
  const [editing, setEditing] = useState<AlertRule | "new" | undefined>();
  const [definingSlo, setDefiningSlo] = useState(false);
  const del = useDeleteAlertRule();
  const fires = useListAlertFires(selected?.id);
  const ack = useAckAlertFire();

  const ruleColumns = [
    { key: "name", header: "Rule", cell: (rule: AlertRule) => <span className={styles.name}>{rule.name}</span> },
    {
      key: "source",
      header: "Source",
      cell: (rule: AlertRule) => (
        <Tag size="sm" type="gray">
          {SOURCE_LABEL[rule.source]}
        </Tag>
      ),
    },
    {
      key: "match",
      header: "Match",
      cell: (rule: AlertRule) => (
        <span className={styles.mono}>
          {rule.source === "slo" ? (slos.data?.items.find((s) => s.id === rule.sloId)?.operation ?? rule.action) : rule.action}
          {rule.outcome ? ` | ${rule.outcome}` : ""}
        </span>
      ),
    },
    { key: "threshold", header: "Threshold", cell: (rule: AlertRule) => <span className={styles.tabular}>{rule.threshold}</span> },
    { key: "window", header: "Window", cell: (rule: AlertRule) => <span className={styles.tabular}>{rule.windowMinutes} min</span> },
    { key: "active", header: "Active", cell: (rule: AlertRule) => <StatusChip status={rule.active ? "active" : "draft"} /> },
    {
      key: "actions",
      header: "Actions",
      cell: (rule: AlertRule) => (
        <div className={styles.actions}>
          <IconButton size="sm" kind={selected?.id === rule.id ? "secondary" : "ghost"} label={`Show fires of ${rule.name}`} onClick={() => setSelected(rule)}>
            <Notification />
          </IconButton>
          <IconButton size="sm" kind="ghost" label={`Edit ${rule.name}`} disabled={!canManage} onClick={() => setEditing(rule)}>
            <Edit />
          </IconButton>
          <IconButton size="sm" kind="ghost" label={`Delete ${rule.name}`} disabled={!canManage || del.isPending} onClick={() => del.mutate(rule.id)}>
            <TrashCan />
          </IconButton>
        </div>
      ),
    },
  ];

  const fireColumns = [
    { key: "firedAt", header: "Fired at", cell: (fire: AlertFire) => <span className={`${styles.nowrap} ${styles.muted}`}>{formatDateTime(fire.firedAt)}</span> },
    { key: "count", header: "Count", cell: (fire: AlertFire) => <span className={styles.tabular}>{fire.count}</span> },
    {
      key: "status",
      header: "Status",
      cell: (fire: AlertFire) => (
        <div className={styles.tags}>
          <StatusChip status={fire.status === "firing" ? "firing" : "acked"} />
          {fire.ackedBy ? <span className={styles.caption}>by {fire.ackedBy}</span> : null}
        </div>
      ),
    },
    {
      key: "ack",
      header: "Actions",
      cell: (fire: AlertFire) =>
        fire.status === "firing" && selected ? (
          <Button size="sm" kind="tertiary" disabled={!canManage || ack.isPending} onClick={() => ack.mutate({ ruleId: selected.id, fireId: fire.id })}>
            Ack
          </Button>
        ) : null,
    },
  ];

  const sloColumns = [
    { key: "operation", header: "Operation", cell: (slo: Slo) => <span className={styles.mono}>{slo.operation}</span> },
    { key: "success", header: "Success", cell: (slo: Slo) => <span className={styles.tabular}>{(slo.targetSuccess * 100).toFixed(1)}%</span> },
    { key: "p95", header: "p95", cell: (slo: Slo) => <span className={styles.tabular}>{`<= ${slo.targetP95Ms} ms`}</span> },
    { key: "window", header: "Window", cell: (slo: Slo) => <span className={styles.tabular}>{slo.windowMinutes} min</span> },
  ];

  return (
    <PageLayout
      title="Alerts and SLOs"
      description="Alert rules over audit actions, platform events or SLO burn rates. Webhook is the only notification channel for now; fires also appear in the events stream."
      actions={
        <>
          <Button kind="secondary" disabled={!canManage} onClick={() => setDefiningSlo(true)} renderIcon={Add}>
            Define SLO
          </Button>
          <Button kind="primary" disabled={!canManage} onClick={() => setEditing("new")} renderIcon={Add}>
            New alert
          </Button>
        </>
      }
    >
      <Stack gap={6}>
        {!canManage && (
          <InlineNotification kind="info" lowContrast hideCloseButton title="Read-only access" subtitle="Managing alerts needs control.manage. The rules, fires and SLOs below are read-only for you." />
        )}
        {!!del.error && <InlineNotification kind="error" lowContrast hideCloseButton title="Could not delete the rule" subtitle={errorMessage(del.error)} />}

        <SectionCard title="Alert rules" subtitle="A rule fires once per window when the count crosses its threshold; an open fire is not re-fired until acked." flush>
          <QueryState query={rules} skeleton={<TableSkeleton columns={7} />}>
            {(data) => (
              <ControlTable
                label="Alert rules"
                rows={data.items}
                rowId={ruleId}
                columns={ruleColumns}
                emptyMessage="No alert rules yet. Create one to watch audit actions, events or SLO burn rates."
                searchText={(rule) => `${rule.name} ${rule.action} ${rule.source} ${rule.outcome ?? ""}`}
                searchLabel="Search alert rules"
                rowTone={(rule) => (selected?.id === rule.id ? "selected" : undefined)}
                batchAction={canManage ? { label: "Delete", icon: TrashCan, onAction: (selectedRules) => selectedRules.forEach((rule) => del.mutate(rule.id)) } : undefined}
              />
            )}
          </QueryState>
        </SectionCard>

        {selected && (
          <SectionCard title={`Fires of "${selected.name}"`} subtitle="Select another rule above to see its fires." flush>
            <QueryState query={fires} skeleton={<TableSkeleton columns={4} />}>
              {(data) => (
                <ControlTable
                  label="Alert fires"
                  rows={data.items}
                  rowId={fireId}
                  columns={fireColumns}
                  emptyMessage="No fires yet. The rule has not crossed its threshold in the window."
                />
              )}
            </QueryState>
          </SectionCard>
        )}

        <SectionCard title="SLOs" subtitle='Service-level objectives per business operation; alert rules with source "SLO burn rate" watch these.' flush>
          <QueryState query={slos} skeleton={<TableSkeleton columns={4} />}>
            {(data) => (
              <ControlTable
                label="SLOs"
                rows={data.items}
                rowId={sloRowId}
                columns={sloColumns}
                emptyMessage="No SLOs defined yet."
                searchText={(slo) => slo.operation}
                searchLabel="Search SLOs"
              />
            )}
          </QueryState>
        </SectionCard>
      </Stack>

      {editing && <AlertRuleDialog onClose={() => setEditing(undefined)} rule={editing === "new" ? undefined : editing} />}
      {definingSlo && <SloDialog onClose={() => setDefiningSlo(false)} />}
    </PageLayout>
  );
}
