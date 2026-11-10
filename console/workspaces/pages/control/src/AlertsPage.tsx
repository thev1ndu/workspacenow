import { useState, type ReactNode } from "react";
import { Button, InlineNotification, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { Bell, Pencil, Plus, TrashBin } from "@workspacenow/icons";
import {
  useAckAlertFire,
  useCan,
  useDeleteAlertRule,
  useListAlertFires,
  useListAlertRules,
  useListSLOs,
} from "@workspacenow/api-client";
import type { AlertRule } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TableSkeleton, errorMessage, formatDateTime } from "@workspacenow/views";
import { AlertRuleDialog } from "./subComponents/AlertRuleDialog";
import { SloDialog } from "./subComponents/SloDialog";

function Notice({ status, children }: { status?: "default" | "danger"; children: ReactNode }) {
  return (
    <InlineNotification kind={status === "danger" ? "error" : "info"} lowContrast hideCloseButton>
      {children}
    </InlineNotification>
  );
}

const SOURCE_LABEL: Record<AlertRule["source"], string> = {
  audit: "Audit",
  event: "Event",
  slo: "SLO burn rate",
};

/** Alert rules, their fires, SLOs and backup records — the ops surface of the control workspace. */
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

  return (
    <PageLayout
      title="Alerts and SLOs"
      description="Alert rules over audit actions, platform events or SLO burn rates. Webhook is the only notification channel for now; fires also appear in the events stream."
      actions={
        <>
          <Button kind="secondary" disabled={!canManage} onClick={() => setDefiningSlo(true)} renderIcon={(p) => <Plus className="size-4" aria-hidden {...p} />}>
            Define SLO
          </Button>
          <Button kind="primary" disabled={!canManage} onClick={() => setEditing("new")} renderIcon={(p) => <Plus className="size-4" aria-hidden {...p} />}>
            New alert
          </Button>
        </>
      }
    >
      <div className="grid gap-6">
        {!canManage && <Notice>Managing alerts needs control.manage. The rules, fires and SLOs below are read-only for you.</Notice>}
        {!!del.error && <Notice status="danger">{errorMessage(del.error)}</Notice>}

        <SectionCard title="Alert rules" subtitle="A rule fires once per window when the count crosses its threshold; an open fire is not re-fired until acked." flush>
          <QueryState query={rules} skeleton={<TableSkeleton columns={6} />}>
            {(data) =>
              data.items.length === 0 ? (
                <NoDataFound message="No alert rules yet. Create one to watch audit actions, events or SLO burn rates." />
              ) : (
                <div>
                  <TableContainer>
                    <Table aria-label="Alert rules" className="min-w-[900px]">
                      <TableHead>
                        <TableRow>
                          <TableHeader scope="row">Rule</TableHeader>
                          <TableHeader>Source</TableHeader>
                          <TableHeader>Match</TableHeader>
                          <TableHeader>Threshold</TableHeader>
                          <TableHeader>Window</TableHeader>
                          <TableHeader>Active</TableHeader>
                          <TableHeader>Actions</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.items.map((rule) => (
                          <TableRow key={rule.id} id={rule.id} className={selected?.id === rule.id ? "bg-default-hover" : undefined}>
                            <TableCell className="font-medium">{rule.name}</TableCell>
                            <TableCell>
                              <Tag size="sm" type="gray">
                                {SOURCE_LABEL[rule.source]}
                              </Tag>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {rule.source === "slo" ? (slos.data?.items.find((s) => s.id === rule.sloId)?.operation ?? rule.action) : rule.action}
                              {rule.outcome ? ` · ${rule.outcome}` : ""}
                            </TableCell>
                            <TableCell className="tabular-nums">{rule.threshold}</TableCell>
                            <TableCell className="tabular-nums">{rule.windowMinutes} min</TableCell>
                            <TableCell>
                              <StatusChip status={rule.active ? "active" : "draft"} />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  hasIconOnly
                                  size="sm"
                                  kind={selected?.id === rule.id ? "secondary" : "ghost"}
                                  iconDescription={`Show fires of ${rule.name}`}
                                  onClick={() => setSelected(rule)}
                                  renderIcon={(p) => <Bell className="size-4" {...p} />}
                                />
                                <Button
                                  hasIconOnly
                                  size="sm"
                                  kind="ghost"
                                  iconDescription={`Edit ${rule.name}`}
                                  disabled={!canManage}
                                  onClick={() => setEditing(rule)}
                                  renderIcon={(p) => <Pencil className="size-4" {...p} />}
                                />
                                <Button
                                  hasIconOnly
                                  size="sm"
                                  kind="ghost"
                                  iconDescription={`Delete ${rule.name}`}
                                  disabled={!canManage || del.isPending}
                                  onClick={() => del.mutate(rule.id)}
                                  renderIcon={(p) => <TrashBin className="size-4" {...p} />}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              )
            }
          </QueryState>
        </SectionCard>

        {selected && (
          <SectionCard
            title={`Fires of “${selected.name}”`}
            subtitle="Select a rule above to see its fires."
            flush
          >
            <QueryState query={fires} skeleton={<TableSkeleton columns={4} />}>
              {(data) =>
                data.items.length === 0 ? (
                  <NoDataFound message="No fires yet — the rule has not crossed its threshold in the window." />
                ) : (
                  <div>
                    <TableContainer>
                      <Table aria-label="Alert fires" className="min-w-[640px]">
                        <TableHead>
                          <TableRow>
                            <TableHeader>Fired at</TableHeader>
                            <TableHeader>Count</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader> </TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.items.map((fire) => (
                            <TableRow key={fire.id} id={fire.id}>
                              <TableCell className="whitespace-nowrap text-muted">{formatDateTime(fire.firedAt)}</TableCell>
                              <TableCell className="tabular-nums">{fire.count}</TableCell>
                              <TableCell>
                                <StatusChip status={fire.status === "firing" ? "firing" : "acked"} />
                                {fire.ackedBy ? <span className="text-xs text-muted"> by {fire.ackedBy}</span> : null}
                              </TableCell>
                              <TableCell>
                                {fire.status === "firing" && (
                                  <Button size="sm" kind="tertiary" disabled={!canManage || ack.isPending} onClick={() => ack.mutate({ ruleId: selected.id, fireId: fire.id })}>
                                    Ack
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                )
              }
            </QueryState>
          </SectionCard>
        )}

        <div className="grid items-start gap-6">
          <SectionCard title="SLOs" subtitle="Service-level objectives per business operation; alert rules with source “SLO burn rate” watch these." flush>
            <QueryState query={slos} skeleton={<TableSkeleton columns={4} />}>
              {(data) =>
                data.items.length === 0 ? (
                  <NoDataFound message="No SLOs defined yet." />
                ) : (
                  <div>
                    <TableContainer>
                      <Table aria-label="SLOs" className="min-w-[520px]">
                        <TableHead>
                          <TableRow>
                            <TableHeader scope="row">Operation</TableHeader>
                            <TableHeader>Success</TableHeader>
                            <TableHeader>p95</TableHeader>
                            <TableHeader>Window</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.items.map((slo) => (
                            <TableRow key={slo.id} id={slo.id}>
                              <TableCell className="font-mono text-xs">{slo.operation}</TableCell>
                              <TableCell className="tabular-nums">{(slo.targetSuccess * 100).toFixed(1)}%</TableCell>
                              <TableCell className="tabular-nums">≤ {slo.targetP95Ms} ms</TableCell>
                              <TableCell className="tabular-nums">{slo.windowMinutes} min</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                )
              }
            </QueryState>
          </SectionCard>

        </div>
      </div>

      {editing && <AlertRuleDialog onClose={() => setEditing(undefined)} rule={editing === "new" ? undefined : editing} />}
      {definingSlo && <SloDialog onClose={() => setDefiningSlo(false)} />}
    </PageLayout>
  );
}
