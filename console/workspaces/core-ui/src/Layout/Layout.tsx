import { useEffect, useState } from "react";
import { Breadcrumb, BreadcrumbItem, Content } from "@carbon/react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { workspaces as rawWorkspaces } from "../workspaces";
import { useT } from "@workspacenow/i18n";
import { useSession } from "@workspacenow/api-client";
import { CommandPalette } from "./CommandPalette";
import { PreferencesDialog } from "./PreferencesDialog";
import { Sidebar, activeItem } from "./Sidebar";
import { Sidekick, SidekickPanel } from "./Sidekick";
import { LG_QUERY, readFlag, useMediaQuery, writeFlag } from "./shellHooks";
import { MAIN_ID, Topbar } from "./Topbar";
import styles from "./Shell.module.scss";

const COLLAPSED_KEY = "workspacenow-sidebar-collapsed";
const SIDEKICK_KEY = "workspacenow-sidekick-open";

const cx = (...names: Array<string | false>) => names.filter(Boolean).join(" ");

/** The console: Carbon UI Shell (header, side navigation, content) around the active Workspace's page. */
export function Layout() {
  const { pathname } = useLocation();
  const t = useT();
  const isLarge = useMediaQuery(LG_QUERY);
  const [searchOpen, setSearchOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Large screens keep the navigation showing unless the user collapsed it; smaller ones open it as a drawer.
  const [collapsed, setCollapsed] = useState(() => readFlag(COLLAPSED_KEY));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navExpanded = isLarge ? !collapsed : drawerOpen;
  const toggleNav = () => {
    if (isLarge) {
      setCollapsed(!collapsed);
      writeFlag(COLLAPSED_KEY, !collapsed);
    } else {
      setDrawerOpen(!drawerOpen);
    }
  };
  useEffect(() => setDrawerOpen(false), [pathname]);

  // Sidekick works as the user, so it is offered only to users who hold a role.
  const { data: session } = useSession();
  const canUseSidekick = !!session?.roles.length;
  const [sidekickPreferred, setSidekickPreferred] = useState(() => readFlag(SIDEKICK_KEY));
  const sidekickOpen = canUseSidekick && sidekickPreferred;
  const setSidekickOpen = (open: boolean) => {
    writeFlag(SIDEKICK_KEY, open);
    setSidekickPreferred(open);
  };

  const workspaces = rawWorkspaces.map((w) => ({
    ...w,
    title: t(w.title),
    description: t(w.description),
    navigation: w.navigation.map((n) => ({ ...n, label: t(n.label) })),
  }));
  const active = workspaces.find((w) => pathname === w.basePath || pathname.startsWith(`${w.basePath}/`));
  const page = active ? activeItem(pathname, active.navigation) : undefined;

  return (
    <>
      <Topbar
        nav={{ expanded: navExpanded, onToggle: toggleNav }}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenPreferences={() => setPreferencesOpen(true)}
        sidekick={canUseSidekick ? { open: sidekickOpen, onToggle: () => setSidekickOpen(!sidekickOpen) } : undefined}
      />
      <Sidebar workspaces={workspaces} active={active} expanded={navExpanded} fixed={isLarge} onDismiss={() => setDrawerOpen(false)} />

      <CommandPalette workspaces={workspaces} isOpen={searchOpen} onOpenChange={setSearchOpen} />
      {preferencesOpen && <PreferencesDialog onClose={() => setPreferencesOpen(false)} />}

      {canUseSidekick && (
        <SidekickPanel open={sidekickOpen}>
          <Sidekick onClose={() => setSidekickOpen(false)} />
        </SidekickPanel>
      )}

      <div className={cx(styles.body, navExpanded && styles["body--nav"], sidekickOpen && styles["body--sidekick"])}>
        <Content id={MAIN_ID} tabIndex={-1} className={styles.content}>
          {active && (
            <Breadcrumb noTrailingSlash className={styles.crumbs} aria-label={t("Breadcrumb")}>
              <BreadcrumbItem>
                <Link to="/">{t("Home")}</Link>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage={!page || !!page.end}>
                {page && !page.end ? <Link to={active.basePath}>{active.title}</Link> : active.title}
              </BreadcrumbItem>
              {page && !page.end && <BreadcrumbItem isCurrentPage>{page.label}</BreadcrumbItem>}
            </Breadcrumb>
          )}
          <Outlet />
        </Content>
      </div>
    </>
  );
}
