import { AiGenerate, Apps, ArrowLeft, Search, TaskApproved } from "@carbon/react/icons";
import { useEffect, useState, type ReactNode } from "react";
import { Header, HeaderGlobalAction, HeaderGlobalBar, HeaderMenuButton, HeaderName, SkipToContent, Theme } from "@carbon/react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useListApprovals } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { useT } from "@workspacenow/i18n";
import { HeaderBadge } from "./HeaderBadge";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

export const MAIN_ID = "main-content";

type Panel = "notifications" | "user" | null;

/** Carbon's UI Shell header, always in the g100 theme as Carbon recommends, whichever theme the page uses. */
function HeaderFrame({ menu, name, children }: { menu?: ReactNode; name: ReactNode; children: ReactNode }) {
  const t = useT();
  return (
    <Theme as={Header} theme="g100" aria-label="WorkspaceNow">
      <SkipToContent href={`#${MAIN_ID}`}>{t("Skip to main content")}</SkipToContent>
      {menu}
      {name}
      <HeaderGlobalBar>{children}</HeaderGlobalBar>
    </Theme>
  );
}

/** Sidekick toggle: a pressed state, offered only to users who may use it. */
function SidekickAction({ sidekick }: { sidekick: { open: boolean; onToggle: () => void } }) {
  const t = useT();
  return (
    <HeaderGlobalAction aria-label={t("Sidekick")} isActive={sidekick.open} onClick={sidekick.onToggle} tooltipAlignment="end">
      <AiGenerate size={20} />
    </HeaderGlobalAction>
  );
}

/** One panel at a time; moving to another page closes it. */
function usePanel(): [Panel, (panel: Exclude<Panel, null>) => (open: boolean) => void] {
  const { pathname } = useLocation();
  const [panel, setPanel] = useState<Panel>(null);
  useEffect(() => setPanel(null), [pathname]);
  return [panel, (name) => (open) => setPanel((current) => (open ? name : current === name ? null : current))];
}

interface TopbarProps {
  /** The side navigation's expanded state and its toggle (the hamburger). */
  nav: { expanded: boolean; onToggle: () => void };
  onOpenSearch: () => void;
  onOpenPreferences: () => void;
  /** Present only when the user may use Sidekick. */
  sidekick?: { open: boolean; onToggle: () => void };
}

/** The console header: menu, product name and the global actions (search, apps, approvals, Sidekick, notifications, account). */
export function Topbar({ nav, onOpenSearch, onOpenPreferences, sidekick }: TopbarProps) {
  const t = useT();
  const navigate = useNavigate();
  const { data: approvals } = useListApprovals({ status: "pending" });
  const pending = approvals?.total ?? 0;
  const [panel, panelOpener] = usePanel();

  return (
    <HeaderFrame
      menu={<HeaderMenuButton aria-label={t("Open navigation")} isActive={nav.expanded} isCollapsible onClick={nav.onToggle} />}
      name={
        <HeaderName as={Link} to={routes.home} prefix="">
          WorkspaceNow
        </HeaderName>
      }
    >
      <HeaderGlobalAction aria-label={`${t("Search")} (Ctrl K)`} onClick={onOpenSearch} tooltipAlignment="end">
        <Search size={20} />
      </HeaderGlobalAction>
      <HeaderGlobalAction aria-label={t("Applications")} onClick={() => navigate(routes.catalog)} tooltipAlignment="end">
        <Apps size={20} />
      </HeaderGlobalAction>
      <HeaderGlobalAction
        aria-label={pending === 1 ? "1 pending approval" : `${pending} pending approvals`}
        onClick={() => navigate(routes.flow.approvals)}
        tooltipAlignment="end"
      >
        <TaskApproved size={20} />
        <HeaderBadge count={pending} />
      </HeaderGlobalAction>
      {sidekick && <SidekickAction sidekick={sidekick} />}
      <NotificationsMenu open={panel === "notifications"} onOpenChange={panelOpener("notifications")} />
      <UserMenu open={panel === "user"} onOpenChange={panelOpener("user")} onOpenPreferences={onOpenPreferences} />
    </HeaderFrame>
  );
}

interface AppTopbarProps {
  /** The open app, when there is one: its notifications and Sidekick are offered. */
  applicationId?: string;
  onOpenPreferences: () => void;
  sidekick?: { open: boolean; onToggle: () => void };
}

/** The header of the full-screen app frame: the catalogue, the way back to the console, and the app's own inbox. */
export function AppTopbar({ applicationId, onOpenPreferences, sidekick }: AppTopbarProps) {
  const t = useT();
  const navigate = useNavigate();
  const [panel, panelOpener] = usePanel();

  return (
    <HeaderFrame
      name={
        <HeaderName as={Link} to={routes.catalog} prefix="WorkspaceNow">
          {t("Applications")}
        </HeaderName>
      }
    >
      <HeaderGlobalAction aria-label={t("Back to WorkspaceNow")} onClick={() => navigate(routes.home)} tooltipAlignment="end">
        <ArrowLeft size={20} />
      </HeaderGlobalAction>
      {applicationId && <NotificationsMenu applicationId={applicationId} open={panel === "notifications"} onOpenChange={panelOpener("notifications")} />}
      {sidekick && <SidekickAction sidekick={sidekick} />}
      <UserMenu open={panel === "user"} onOpenChange={panelOpener("user")} onOpenPreferences={onOpenPreferences} />
    </HeaderFrame>
  );
}
