import { Notification, NotificationNew } from "@carbon/react/icons";
import { useRef, useState } from "react";
import { ContainedList, ContainedListItem, HeaderGlobalAction, HeaderPanel, Link, Tag } from "@carbon/react";
import { Link as RouterLink } from "react-router-dom";

import { useCan, useListApprovals, useListEvents } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { formatRelative } from "@workspacenow/views";
import { useT } from "@workspacenow/i18n";
import { HeaderBadge } from "./HeaderBadge";
import { readSeen, SEEN_KEY, writeSeen } from "./notificationsSeen";
import { useDismiss } from "./shellHooks";
import styles from "./Topbar.module.scss";

// Per-app inboxes track their own seen marker so scopes do not clobber each other.
const seenKey = (applicationId?: string) => (applicationId ? `${SEEN_KEY}:${applicationId}` : SEEN_KEY);

/** "PurchaseRequest.Submitted" -> "Purchase request submitted". */
function describe(type: string): string {
  const [subject, verb = ""] = type.split(".");
  const words = `${subject} ${verb}`.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

interface NotificationsMenuProps {
  /** Inside a running app, scopes the inbox to that app only. */
  applicationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Header action plus panel: platform events and pending approvals, with an unread count since the panel was last opened. */
export function NotificationsMenu({ applicationId, open, onOpenChange }: NotificationsMenuProps) {
  const t = useT();
  const [seen, setSeen] = useState(() => readSeen(seenKey(applicationId)));
  // the platform event log is for auditors; everyone still sees approvals waiting on them
  const auditor = useCan("audit.read");
  const events = useListEvents({ applicationId, limit: 15 }, { enabled: auditor });
  const approvals = useListApprovals({ status: "pending", applicationId });
  const items = events.data?.items ?? [];
  const pending = approvals.data?.items ?? [];
  const unread = items.filter((e) => e.time > seen).length + (approvals.data?.total ?? 0);
  const actionRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => onOpenChange(false), [actionRef, panelRef]);

  const toggle = () => {
    const next = !open;
    onOpenChange(next);
    if (!next || !items[0]) return;
    writeSeen(seenKey(applicationId), items[0].time);
    setSeen(items[0].time);
  };

  const title = applicationId ? t("App notifications") : t("Notifications");
  const label = unread ? `${title}, ${unread} unread` : title;

  return (
    <>
      <HeaderGlobalAction ref={actionRef} aria-label={label} isActive={open} onClick={toggle} tooltipAlignment="end">
        {unread > 0 ? <NotificationNew size={20} /> : <Notification size={20} />}
        <HeaderBadge count={unread} />
      </HeaderGlobalAction>
      <HeaderPanel ref={panelRef} aria-label={title} expanded={open} addFocusListeners={false} className={styles.panel}>
        {open && (
          <>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>{title}</span>
              <Link as={RouterLink} to={routes.control.audit} size="sm" onClick={() => onOpenChange(false)}>
                {t("Audit log")}
              </Link>
            </div>
            {pending.length > 0 && (
              <ContainedList kind="disclosed" label={t("Approvals needed")}>
                {pending.map((approval) => (
                  <ContainedListItem key={approval.id}>
                    <div className={styles.itemTitle}>{approval.title} needed</div>
                    <div className={styles.itemSummary}>{approval.summary}</div>
                    <Link as={RouterLink} to={routes.flow.approvals} size="sm" onClick={() => onOpenChange(false)}>
                      {t("Review")}
                    </Link>
                  </ContainedListItem>
                ))}
              </ContainedList>
            )}
            {items.length > 0 ? (
              <ContainedList kind="disclosed" label={t("Events")} className={styles.list}>
                {items.map((event) => (
                  <ContainedListItem key={event.id}>
                    <div className={styles.itemTitle}>
                      {describe(event.type)} {event.time > seen && <Tag size="sm" type="blue">{t("New")}</Tag>}
                    </div>
                    <div className={styles.itemMeta}>
                      {event.source} / {formatRelative(event.time)} /{" "}
                      <Link as={RouterLink} to={buildPath(routes.control.trace, { traceId: event.traceId })} size="sm" onClick={() => onOpenChange(false)}>
                        {t("trace")}
                      </Link>
                    </div>
                  </ContainedListItem>
                ))}
              </ContainedList>
            ) : (
              pending.length === 0 && <p className={styles.empty}>{t("You are all caught up.")}</p>
            )}
          </>
        )}
      </HeaderPanel>
    </>
  );
}
