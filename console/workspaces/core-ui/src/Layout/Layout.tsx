import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { Drawer } from "@heroui/react";
import { Outlet, useLocation } from "react-router-dom";
import { workspaces as rawWorkspaces } from "../workspaces";
import { useT } from "@workspacenow/i18n";
import { useSession } from "@workspacenow/api-client";
import { useAppearance } from "@workspacenow/views";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "./Sidebar";
import { Sidekick } from "./Sidekick";
import { Topbar } from "./Topbar";

const COLLAPSED_KEY = "workspacenow-sidebar-collapsed";
const SIDEKICK_KEY = "workspacenow-sidekick-open";
const WIDTH_KEY = "workspacenow-sidebar-width";
const COLLAPSED_WIDTH = 56;
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const KEYBOARD_STEP = 16;

const clampWidth = (width: number) => Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)));

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function readWidth(): number {
  try {
    const stored = Number(localStorage.getItem(WIDTH_KEY));
    return stored ? clampWidth(stored) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

function writeSetting(key: string, value: boolean | number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // The choice still applies for this session.
  }
}

/** Drag, arrow-key or double-click (reset) handle on the sidebar's right edge. */
function SidebarResizeHandle({
  width,
  onResize,
  onResizingChange,
}: {
  width: number;
  onResize: (width: number, commit: boolean) => void;
  onResizingChange: (resizing: boolean) => void;
}) {
  const onKeyDown = (e: KeyboardEvent) => {
    const next =
      e.key === "ArrowLeft" ? width - KEYBOARD_STEP : e.key === "ArrowRight" ? width + KEYBOARD_STEP : e.key === "Home" ? MIN_WIDTH : e.key === "End" ? MAX_WIDTH : null;
    if (next === null) return;
    e.preventDefault();
    onResize(next, true);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuenow={width}
      tabIndex={0}
      className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:transition-colors hover:after:bg-accent focus-visible:after:bg-accent"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onResizingChange(true);
      }}
      // The sidebar is pinned to the viewport's left edge, so the pointer's x is the new width.
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && onResize(e.clientX, false)}
      onPointerUp={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        onResizingChange(false);
        onResize(e.clientX, true);
      }}
      onLostPointerCapture={() => onResizingChange(false)}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onResize(DEFAULT_WIDTH, true)}
    />
  );
}

export function Layout() {
  const { pathname } = useLocation();
  // Kept mounted so a "System" appearance follows the operating system while the app is open.
  useAppearance();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => readFlag(COLLAPSED_KEY));
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      writeSetting(COLLAPSED_KEY, !c);
      return !c;
    });
  const [width, setWidth] = useState(readWidth);
  const [resizing, setResizing] = useState(false);
  const resize = (next: number, commit: boolean) => {
    const clamped = clampWidth(next);
    setWidth(clamped);
    if (commit) writeSetting(WIDTH_KEY, clamped);
  };
  // Sidekick works as the user, so it is offered only to users who hold a role.
  const { data: session } = useSession();
  const canUseSidekick = !!session?.roles.length;
  const [sidekickPreferred, setSidekickPreferred] = useState(() => readFlag(SIDEKICK_KEY));
  const sidekickOpen = canUseSidekick && sidekickPreferred;
  const setSidekickOpen = (open: boolean) => {
    writeSetting(SIDEKICK_KEY, open);
    setSidekickPreferred(open);
  };
  const t = useT();
  const workspaces = rawWorkspaces.map((w) => ({
    ...w,
    title: t(w.title),
    description: t(w.description),
    navigation: w.navigation.map((n) => ({ ...n, label: t(n.label) })),
  }));
  const active = workspaces.find((w) => pathname === w.basePath || pathname.startsWith(`${w.basePath}/`));

  return (
    <div
      className={`min-h-dvh bg-background ${resizing ? "cursor-col-resize select-none" : ""}`}
      style={{ "--sidebar-width": `${collapsed ? COLLAPSED_WIDTH : width}px` } as CSSProperties}
    >
      {/* Width animates on collapse but follows the pointer directly while dragging. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden w-(--sidebar-width) border-r border-separator bg-background lg:block ${resizing ? "" : "transition-[width] duration-200"}`}
      >
        <Sidebar workspaces={workspaces} active={active} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        {!collapsed && <SidebarResizeHandle width={width} onResize={resize} onResizingChange={setResizing} />}
      </aside>

      {/* Controlled drawer: HeroUI takes open state on the backdrop when there is no trigger child. */}
      <Drawer.Backdrop isOpen={menuOpen} onOpenChange={setMenuOpen}>
        <Drawer.Content placement="left" className="w-72">
          <Drawer.Dialog aria-label="Navigation" className="h-full p-0">
            <Sidebar workspaces={workspaces} active={active} onNavigate={() => setMenuOpen(false)} />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>

      <CommandPalette workspaces={workspaces} isOpen={searchOpen} onOpenChange={setSearchOpen} />

      {canUseSidekick && (
        // Kept mounted while closed so the conversation survives closing and reopening.
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-full border-l border-separator bg-background sm:w-[340px] ${sidekickOpen ? "" : "hidden"}`}
        >
          <Sidekick onClose={() => setSidekickOpen(false)} />
        </aside>
      )}

      <div
        className={`flex min-h-dvh flex-col lg:pl-(--sidebar-width) ${resizing ? "" : "transition-[padding] duration-200"} ${sidekickOpen ? "xl:pr-[340px]" : ""}`}
      >
        <Topbar
          active={active}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          sidekick={canUseSidekick ? { open: sidekickOpen, onToggle: () => setSidekickOpen(!sidekickOpen) } : undefined}
        />
        <main id="main" className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
