import { Home, Pin } from "@carbon/react/icons";
import type { MouseEvent } from "react";
import { SideNav, SideNavDivider, SideNavItems, SideNavLink, SideNavMenu, SideNavMenuItem } from "@carbon/react";
import { Link, useLocation } from "react-router-dom";
import { useListApplications } from "@workspacenow/api-client";
import { usePinnedApplicationIds } from "@workspacenow/studio";
import { buildPath, routes } from "@workspacenow/types";
import type { WorkspaceModule, WorkspaceNavItem } from "@workspacenow/views";
import { useT } from "@workspacenow/i18n";

function isActive(pathname: string, item: { href: string; end?: boolean }): boolean {
  return item.end ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** The most specific nav item matching the path, so a detail page highlights its list. */
export function activeItem(pathname: string, items: WorkspaceNavItem[]): WorkspaceNavItem | undefined {
  return items.filter((item) => isActive(pathname, item)).sort((a, b) => b.href.length - a.href.length)[0];
}

/** The user's pinned applications, so the apps they use most are one click from anywhere. */
function PinnedApps({ pathname, title }: { pathname: string; title: string }) {
  const pinnedIds = usePinnedApplicationIds();
  const { data } = useListApplications();
  const pinned = pinnedIds.flatMap((id) => data?.items.filter((app) => app.id === id) ?? []);
  if (pinned.length === 0) return null;
  const current = pinned.some((app) => pathname === buildPath(routes.app, { appId: app.id }));

  return (
    <>
      <SideNavDivider />
      <SideNavMenu title={title} renderIcon={Pin} isActive={current} defaultExpanded>
        {pinned.map((app) => {
          const href = buildPath(routes.app, { appId: app.id });
          return (
            <SideNavMenuItem key={app.id} as={Link} to={href} isActive={pathname === href} aria-current={pathname === href ? "page" : undefined}>
              {app.name}
            </SideNavMenuItem>
          );
        })}
      </SideNavMenu>
    </>
  );
}

interface SidebarProps {
  workspaces: WorkspaceModule[];
  active?: WorkspaceModule;
  /** Whether the navigation is showing. On large screens it is persistent and can be collapsed; below that it is a drawer. */
  expanded: boolean;
  /** Persistent (large screens) rather than a drawer with an overlay. */
  fixed: boolean;
  /** Closes the drawer: overlay click, Escape, or following a link. */
  onDismiss: () => void;
}

/** Carbon's side navigation: Home, the user's pinned apps, and every Workspace with its pages. */
export function Sidebar({ workspaces, active, expanded, fixed, onDismiss }: SidebarProps) {
  const t = useT();
  const { pathname } = useLocation();
  const current = active ? activeItem(pathname, active.navigation) : undefined;

  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!fixed && (event.target as HTMLElement).closest("a")) onDismiss();
  };

  return (
    <SideNav
      aria-label={t("Primary")}
      expanded={expanded}
      isFixedNav={fixed}
      isChildOfHeader
      onOverlayClick={onDismiss}
      onKeyDown={(event) => {
        // Escape closes the drawer; blur must not, because the menu button owns that toggle.
        if (event.key === "Escape" && !fixed) onDismiss();
      }}
      onClickCapture={onClickCapture}
    >
      <SideNavItems>
        <SideNavLink as={Link} to={routes.home} renderIcon={Home} isActive={pathname === routes.home} aria-current={pathname === routes.home ? "page" : undefined}>
          {t("Home")}
        </SideNavLink>

        <PinnedApps pathname={pathname} title={t("Pinned")} />

        <SideNavDivider />
        {workspaces.map((workspace) => {
          const open = active?.key === workspace.key;
          return (
            // Keyed by open state so a Workspace expands when it becomes the active one.
            <SideNavMenu key={`${workspace.key}:${open}`} title={workspace.title} renderIcon={() => <>{workspace.icon}</>} isActive={open} defaultExpanded={open}>
              {workspace.navigation.map((item) => {
                const selected = current?.href === item.href;
                return (
                  <SideNavMenuItem key={item.href} as={Link} to={item.href} isActive={selected} aria-current={selected ? "page" : undefined}>
                    {item.label}
                  </SideNavMenuItem>
                );
              })}
            </SideNavMenu>
          );
        })}
      </SideNavItems>
    </SideNav>
  );
}
