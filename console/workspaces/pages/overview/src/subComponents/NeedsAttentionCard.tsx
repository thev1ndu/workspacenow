import { Fragment, type ReactNode } from "react";
import { Link, Separator } from "@heroui/react";
import { ChevronRight, CircleCheck, CircleExclamation, Pulse } from "@workspacenow/icons";
import { useListApprovals, useListExecutions, useListHealth, useListWorkflows } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { NoDataFound, SectionCard, StatusChip, formatRelative, ListSkeleton, Loading } from "@workspacenow/views";

const MAX_ITEMS = 6;

interface AttentionItem {
  id: string;
  href: string;
  icon: ReactNode;
  title: string;
  detail: string;
  status: string;
}

/** What someone should act on now, across Flow and Control: pending approvals, failed executions and unhealthy resources. */
export function NeedsAttentionCard() {
  const approvals = useListApprovals({ status: "pending" });
  const executions = useListExecutions();
  const workflows = useListWorkflows();
  const health = useListHealth();
  const workflowName = (id: string) => workflows.data?.items.find((w) => w.id === id)?.name ?? id;

  const items: AttentionItem[] = [
    ...(approvals.data?.items ?? []).map((a) => ({
      id: `approval-${a.id}`,
      href: routes.flow.approvals,
      icon: <CircleCheck />,
      title: a.title,
      detail: `Approval requested ${formatRelative(a.requestedAt)}`,
      status: "pending",
    })),
    ...(executions.data?.items ?? [])
      .filter((e) => e.status === "failed")
      .map((e) => ({
        id: `execution-${e.id}`,
        href: buildPath(routes.flow.execution, { executionId: e.id }),
        icon: <CircleExclamation />,
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
        icon: <Pulse />,
        title: s.resource,
        detail: s.detail,
        status: s.status,
      })),
  ];
  const loading = approvals.isPending || executions.isPending || health.isPending;

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
        <ul>
          {items.slice(0, MAX_ITEMS).map((item, i) => (
            <Fragment key={item.id}>
              {i > 0 && <Separator />}
              <li>
                <Link
                  href={item.href}
                  className="group flex w-full items-center gap-3 rounded-none px-5 py-3 text-left no-underline transition-colors hover:bg-surface-secondary"
                >
                  <span className="text-muted [&_svg]:size-4">{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                    <span className="block truncate text-xs text-muted">{item.detail}</span>
                  </span>
                  <StatusChip status={item.status} />
                  <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
