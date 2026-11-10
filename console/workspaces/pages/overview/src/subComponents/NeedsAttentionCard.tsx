import { Activity, CheckmarkFilled, WarningFilled } from "@carbon/react/icons";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { ContainedList, ContainedListItem } from "@carbon/react";

import { useCan, useListApprovals, useListExecutions, useListHealth, useListWorkflows } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { ListSkeleton, Loading, NoDataFound, SectionCard, StatusChip, formatRelative } from "@workspacenow/views";

import styles from "./NeedsAttentionCard.module.scss";

const MAX_ITEMS = 6;

interface AttentionItem {
  id: string;
  href: string;
  icon: ComponentType;
  title: string;
  detail: string;
  status: string;
}

/** What someone should act on now, across Flow and Control: pending approvals, failed executions and unhealthy resources. */
export function NeedsAttentionCard() {
  const approvals = useListApprovals({ status: "pending" });
  // failed executions are only listed to people who may read workflows
  const flowManager = useCan("flow.manage");
  const auditor = useCan("audit.read");
  const seesFlow = flowManager || auditor;
  const executions = useListExecutions({}, { enabled: seesFlow });
  const workflows = useListWorkflows({ enabled: seesFlow });
  const health = useListHealth();
  const navigate = useNavigate();
  const workflowName = (id: string) => workflows.data?.items.find((w) => w.id === id)?.name ?? id;

  const items: AttentionItem[] = [
    ...(approvals.data?.items ?? []).map((a) => ({
      id: `approval-${a.id}`,
      href: routes.flow.approvals,
      icon: CheckmarkFilled,
      title: a.title,
      detail: `Approval requested ${formatRelative(a.requestedAt)}`,
      status: "pending",
    })),
    ...(executions.data?.items ?? [])
      .filter((e) => e.status === "failed")
      .map((e) => ({
        id: `execution-${e.id}`,
        href: buildPath(routes.flow.execution, { executionId: e.id }),
        icon: WarningFilled,
        title: workflowName(e.workflowId),
        detail: `Execution ${e.id} failed ${formatRelative(e.endedAt ?? e.startedAt)}`,
        status: "failed",
      })),
    ...(health.data?.items ?? [])
      .filter((s) => s.status !== "healthy")
      .sort((a, b) => (a.status === "down" ? -1 : 0) - (b.status === "down" ? -1 : 0))
      .map((s) => ({
        id: `health-${s.kind}-${s.resource}`,
        href: routes.control.root,
        icon: Activity,
        title: s.resource,
        detail: s.detail,
        status: s.status,
      })),
  ];
  const loading = approvals.isPending || (seesFlow && executions.isPending) || health.isPending;

  return (
    <SectionCard
      title="Needs attention"
      subtitle={loading ? undefined : items.length === 0 ? "Nothing waiting on anyone" : `${items.length} item${items.length === 1 ? "" : "s"} across Flow and Control`}
      flush
    >
      {loading ? (
        <Loading>
          <ListSkeleton />
        </Loading>
      ) : items.length === 0 ? (
        <NoDataFound message="All clear: no pending approvals, failed executions or unhealthy resources." />
      ) : (
        <ContainedList aria-label="Needs attention" kind="on-page">
          {items.slice(0, MAX_ITEMS).map((item) => (
            <ContainedListItem key={item.id} renderIcon={item.icon} onClick={() => navigate(item.href)}>
              <span className={styles.row}>
                <span className={styles.text}>
                  <span className={styles.title}>{item.title}</span>
                  <span className={styles.detail}>{item.detail}</span>
                </span>
                <StatusChip status={item.status} />
              </span>
            </ContainedListItem>
          ))}
        </ContainedList>
      )}
    </SectionCard>
  );
}
