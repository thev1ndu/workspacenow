import type { ReactNode } from "react";
import { Button, Link, Separator, Tooltip } from "@heroui/react";
import { House, LayoutSideContentLeft } from "@workspacenow/icons";
import { useLocation } from "react-router-dom";
import { useListApplications } from "@workspacenow/api-client";
import { AppIcon, usePinnedApplicationIds } from "@workspacenow/studio";
import { buildPath, routes } from "@workspacenow/types";
import type { WorkspaceModule, WorkspaceNavItem } from "@workspacenow/views";
import { Brand, BrandMark } from "./Brand";
import { UserMenu } from "./UserMenu";

function isActive(pathname: string, item: { href: string; end?: boolean }): boolean {
  return item.end ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** The most specific nav item matching the path, so a detail page highlights its list. */
export function activeItem(pathname: string, items: WorkspaceNavItem[]): WorkspaceNavItem | undefined {
  return items.filter((item) => isActive(pathname, item)).sort((a, b) => b.href.length - a.href.length)[0];
}

const rowBase = "flex w-full items-center rounded-lg text-sm no-underline transition-colors [&_svg]:size-4 [&_svg]:shrink-0";
const rowState = (selected: boolean) =>
  selected ? "bg-default font-medium text-foreground" : "text-muted hover:bg-default/60 hover:text-foreground";

function NavRow({
  href,
  icon,
  label,
  selected,
  collapsed,
  trailing,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  selected: boolean;
  collapsed?: boolean;
  trailing?: ReactNode;
}) {
  if (collapsed) {
    return (
      <Tooltip delay={200}>
        <Tooltip.Trigger className="block">
          <Link href={href} aria-label={label} aria-current={selected ? "page" : undefined} className={`${rowBase} ${rowState(selected)} h-9 justify-center`}>
            {icon}
          </Link>
        </Tooltip.Trigger>
        <Tooltip.Content placement="right">{label}</Tooltip.Content>
      </Tooltip>
    );
  }
  return (
    <Link href={href} aria-current={selected ? "page" : undefined} className={`${rowBase} ${rowState(selected)} h-8 gap-2.5 px-2.5`}>
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </Link>
  );
}

function SubRow({ href, label, selected }: { href: string; label: string; selected: boolean }) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`${rowBase} ${rowState(selected)} h-7 px-2.5 text-[13px]`}
    >
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** The user's pinned applications, so the apps they use most are one click from anywhere. */
function PinnedAppRows({ pathname, collapsed }: { pathname: string; collapsed: boolean }) {
  const pinnedIds = usePinnedApplicationIds();
  const { data } = useListApplications();
  const pinned = pinnedIds.flatMap((id) => data?.items.filter((app) => app.id === id) ?? []);
  if (pinned.length === 0) return null;

  return (
    <>
      {!collapsed && <p className="mt-6 mb-1.5 px-2.5 text-xs text-muted">Pinned</p>}
      {collapsed && <Separator className="my-3" />}
      <div className="grid gap-0.5">
        {pinned.map((app) => {
          const href = buildPath(routes.app, { appId: app.id });
          return (
            <NavRow key={app.id} href={href} icon={<AppIcon app={app} size="xs" />} label={app.name} selected={pathname === href} collapsed={collapsed} />
          );
        })}
      </div>
    </>
  );
}

interface SidebarProps {
  workspaces: WorkspaceModule[];
  active?: WorkspaceModule;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
}

/** Home and every Workspace; each Workspace always lists its own pages. Collapses to an icon rail. */
export function Sidebar({ workspaces, active, collapsed = false, onToggleCollapsed, onNavigate }: SidebarProps) {
  const { pathname } = useLocation();
  const current = active ? activeItem(pathname, active.navigation) : undefined;

  return (
    <div className="flex h-full flex-col" onClickCapture={onNavigate}>
      <div className={`flex h-14 shrink-0 items-center ${collapsed ? "justify-center" : "justify-between pr-2 pl-4"}`}>
        {collapsed ? <BrandMark /> : <Brand />}
        {!collapsed && onToggleCollapsed && (
          <Button isIconOnly size="sm" variant="ghost" aria-label="Collapse sidebar" onPress={onToggleCollapsed}>
            <LayoutSideContentLeft className="size-4" />
          </Button>
        )}
      </div>

      <nav aria-label="Primary" className={`flex-1 overflow-y-auto pb-4 ${collapsed ? "px-2" : "px-3"}`}>
        <NavRow href="/" icon={<House />} label="Home" selected={pathname === "/"} collapsed={collapsed} />

        <PinnedAppRows pathname={pathname} collapsed={collapsed} />

        {!collapsed && <p className="mt-6 mb-1.5 px-2.5 text-xs text-muted">Workspaces</p>}
        {collapsed && <Separator className="my-3" />}

        <div className="grid gap-0.5">
          {workspaces.map((workspace) => {
            const open = active?.key === workspace.key;
            return (
              <div key={workspace.key}>
                <NavRow
                  href={workspace.basePath}
                  icon={workspace.icon}
                  label={workspace.title}
                  selected={open && (collapsed || !current)}
                  collapsed={collapsed}
                />
                {!collapsed && workspace.navigation.length > 0 && (
                  <div className="mt-0.5 mb-2 ml-[17px] grid gap-0.5 border-l border-separator pl-2">
                    {workspace.navigation.map((item) => (
                      <SubRow key={item.href} href={item.href} label={item.label} selected={current?.href === item.href} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <Separator />
      <div className={collapsed ? "flex flex-col items-center gap-1 p-2" : "p-2"}>
        {collapsed && onToggleCollapsed && (
          <Tooltip delay={200}>
            <Button isIconOnly size="sm" variant="ghost" aria-label="Expand sidebar" onPress={onToggleCollapsed}>
              <LayoutSideContentLeft className="size-4" />
            </Button>
            <Tooltip.Content placement="right">Expand sidebar</Tooltip.Content>
          </Tooltip>
        )}
        <UserMenu compact={collapsed} />
      </div>
    </div>
  );
}
