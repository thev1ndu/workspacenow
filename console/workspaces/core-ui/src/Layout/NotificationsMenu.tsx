import { useEffect, useRef, useState } from "react";
import { Button } from "@carbon/react";
import { Bell, CircleCheck } from "@workspacenow/icons";
import { useCan, useListApprovals, useListEvents } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, TextLink, formatRelative } from "@workspacenow/views";
import { useT } from "@workspacenow/i18n";

const SEEN_KEY = "workspacenow-notifications-seen";
// Per-app inboxes track their own seen marker so scopes do not clobber each other.
const seenKey = (applicationId?: string) => (applicationId ? `${SEEN_KEY}:${applicationId}` : SEEN_KEY);

function readSeen(key = SEEN_KEY): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/** "PurchaseRequest.Submitted" -> "Purchase request submitted". */
function describe(type: string): string {
  const [subject, verb = ""] = type.split(".");
  const words = `${subject} ${verb}`.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Platform events and pending approvals, with an unread count since the panel was last opened.
 *  Pass applicationId inside a running app to scope the inbox to that app only. */
export function NotificationsMenu({ applicationId }: { applicationId?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => readSeen(seenKey(applicationId)));
  // the platform event log is for auditors; everyone still sees approvals waiting on them
  const auditor = useCan("audit.read");
  const events = useListEvents({ applicationId, limit: 15 }, { enabled: auditor });
  const approvals = useListApprovals({ status: "pending", applicationId });
  const items = events.data?.items ?? [];
  const unread = items.filter((e) => e.time > seen).length + (approvals.data?.total ?? 0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markSeen = (next: boolean) => {
    setOpen(next);
    if (!next || !items[0]) return;
    try {
      localStorage.setItem(seenKey(applicationId), items[0].time);
    } catch {
      // Unread state then lasts only for this session.
    }
    setSeen(items[0].time);
  };

  return (
    <div className="relative" ref={ref}>
      <span className="relative inline-flex">
        <Button kind="ghost" size="sm" hasIconOnly iconDescription={unread ? `Notifications, ${unread} unread` : "Notifications"} onClick={() => markSeen(!open)}>
          <Bell className="size-4" />
        </Button>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-separator bg-surface shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold">{applicationId ? t("App notifications") : t("Notifications")}</span>
            <LinkButton size="sm" variant="ghost" href={routes.control.audit}>
              Audit log
            </LinkButton>
          </div>
          <hr className="border-separator" />
          {(approvals.data?.items ?? []).map((approval) => (
            <div key={approval.id} className="flex items-start gap-3 bg-warning-soft/40 px-4 py-3">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{approval.title} needed</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{approval.summary}</p>
                <div className="mt-1.5 text-xs">
                  <TextLink to={routes.flow.approvals}>Review</TextLink>
                </div>
              </div>
            </div>
          ))}
          <ul className="max-h-96 overflow-y-auto py-1">
            {items.map((event) => (
              <li key={event.id} className="flex items-start gap-3 px-4 py-2.5">
                <span
                  className={`mt-1.5 size-1.5 shrink-0 rounded-full ${event.time > seen ? "bg-accent" : "bg-transparent"}`}
                  aria-label={event.time > seen ? "Unread" : undefined}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{describe(event.type)}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {event.source} · {formatRelative(event.time)} ·{" "}
                    <TextLink to={buildPath(routes.control.trace, { traceId: event.traceId })}>trace</TextLink>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
