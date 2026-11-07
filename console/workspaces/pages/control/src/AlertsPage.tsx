import { useState, type ReactNode } from "react";
import { Alert, Button, Chip, Table } from "@heroui/react";
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
    <Alert status={status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
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
          <Button variant="secondary" isDisabled={!canManage} onPress={() => setDefiningSlo(true)}>
            <Plus className="size-4" aria-hidden />
            Define SLO
          </Button>
          <Button isDisabled={!canManage} onPress={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden />
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
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Alert rules" className="min-w-[900px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Rule</Table.Column>
                        <Table.Column>Source</Table.Column>
                        <Table.Column>Match</Table.Column>
                        <Table.Column>Threshold</Table.Column>
                        <Table.Column>Window</Table.Column>
                        <Table.Column>Active</Table.Column>
                        <Table.Column>Actions</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {data.items.map((rule) => (
                          <Table.Row key={rule.id} id={rule.id} className={selected?.id === rule.id ? "bg-default-hover" : undefined}>
                            <Table.Cell className="font-medium">{rule.name}</Table.Cell>
                            <Table.Cell>
                              <Chip size="sm" variant="secondary">
                                {SOURCE_LABEL[rule.source]}
                              </Chip>
                            </Table.Cell>
                            <Table.Cell className="font-mono text-xs">
                              {rule.source === "slo" ? (slos.data?.items.find((s) => s.id === rule.sloId)?.operation ?? rule.action) : rule.action}
                              {rule.outcome ? ` · ${rule.outcome}` : ""}
                            </Table.Cell>
                            <Table.Cell className="tabular-nums">{rule.threshold}</Table.Cell>
                            <Table.Cell className="tabular-nums">{rule.windowMinutes} min</Table.Cell>
                            <Table.Cell>
                              <StatusChip status={rule.active ? "active" : "draft"} />
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex gap-1">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant={selected?.id === rule.id ? "secondary" : "ghost"}
                                  aria-label={`Show fires of ${rule.name}`}
                                  onPress={() => setSelected(rule)}
                                >
                                  <Bell className="size-4" />
                                </Button>
                                <Button isIconOnly size="sm" variant="ghost" aria-label={`Edit ${rule.name}`} isDisabled={!canManage} onPress={() => setEditing(rule)}>
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`Delete ${rule.name}`}
                                  isDisabled={!canManage}
                                  isPending={del.isPending}
                                  onPress={() => del.mutate(rule.id)}
                                >
                                  <TrashBin className="size-4" />
                                </Button>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
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
                  <Table variant="secondary">
                    <Table.ScrollContainer>
                      <Table.Content aria-label="Alert fires" className="min-w-[640px]">
                        <Table.Header>
                          <Table.Column>Fired at</Table.Column>
                          <Table.Column>Count</Table.Column>
                          <Table.Column>Status</Table.Column>
                          <Table.Column> </Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {data.items.map((fire) => (
                            <Table.Row key={fire.id} id={fire.id}>
                              <Table.Cell className="whitespace-nowrap text-muted">{formatDateTime(fire.firedAt)}</Table.Cell>
                              <Table.Cell className="tabular-nums">{fire.count}</Table.Cell>
                              <Table.Cell>
                                <StatusChip status={fire.status === "firing" ? "firing" : "acked"} />
                                {fire.ackedBy ? <span className="text-xs text-muted"> by {fire.ackedBy}</span> : null}
                              </Table.Cell>
                              <Table.Cell>
                                {fire.status === "firing" && (
                                  <Button size="sm" variant="tertiary" isDisabled={!canManage} isPending={ack.isPending} onPress={() => ack.mutate({ ruleId: selected.id, fireId: fire.id })}>
                                    Ack
                                  </Button>
                                )}
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
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
                  <Table variant="secondary">
                    <Table.ScrollContainer>
                      <Table.Content aria-label="SLOs" className="min-w-[520px]">
                        <Table.Header>
                          <Table.Column isRowHeader>Operation</Table.Column>
                          <Table.Column>Success</Table.Column>
                          <Table.Column>p95</Table.Column>
                          <Table.Column>Window</Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {data.items.map((slo) => (
                            <Table.Row key={slo.id} id={slo.id}>
                              <Table.Cell className="font-mono text-xs">{slo.operation}</Table.Cell>
                              <Table.Cell className="tabular-nums">{(slo.targetSuccess * 100).toFixed(1)}%</Table.Cell>
                              <Table.Cell className="tabular-nums">≤ {slo.targetP95Ms} ms</Table.Cell>
                              <Table.Cell className="tabular-nums">{slo.windowMinutes} min</Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
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
