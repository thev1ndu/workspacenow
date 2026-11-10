import { Menu, CheckmarkFilled, OverflowMenuHorizontal, Search, AiGenerate } from "@carbon/react/icons";
import { Button } from "@carbon/react";

import { Link, useLocation } from "react-router-dom";
import { useListApprovals } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { LinkButton, type WorkspaceModule } from "@workspacenow/views";
import { useT } from "@workspacenow/i18n";
import { NotificationsMenu } from "./NotificationsMenu";
import { activeItem } from "./Sidebar";

function Crumb({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <>
      <Link to={href} className="text-muted no-underline hover:text-foreground hover:underline">
        {children}
      </Link>
      <span className="text-muted" aria-hidden>
        /
      </span>
    </>
  );
}

export function Topbar({
  active,
  onOpenMenu,
  onOpenSearch,
  sidekick,
}: {
  active?: WorkspaceModule;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  /** Present only when the user may use Sidekick. */
  sidekick?: { open: boolean; onToggle: () => void };
}) {
  const { pathname } = useLocation();
  const t = useT();
  const { data: approvals } = useListApprovals({ status: "pending" });
  const pending = approvals?.total ?? 0;
  const page = active ? activeItem(pathname, active.navigation) : undefined;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-separator bg-background/85 px-4 backdrop-blur lg:px-6">
      <Button kind="ghost" size="sm" hasIconOnly iconDescription={t("Open navigation")} className="lg:hidden" onClick={onOpenMenu}>
        <Menu className="size-4" />
      </Button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <Crumb href="/">{t("Home")}</Crumb>
        {active && <Crumb href={active.basePath}>{active.title}</Crumb>}
        {active && page && !page.end && <span className="text-foreground">{page.label}</span>}
      </nav>

      <Button kind="tertiary" size="sm" className="hidden w-64 justify-start font-normal text-muted md:flex" onClick={onOpenSearch}>
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">{t("Search")}</span>
        <kbd className="rounded border border-separator bg-default px-1.5 py-0.5 font-mono text-[10px] text-muted">⌘K</kbd>
      </Button>
      <Button kind="ghost" size="sm" hasIconOnly iconDescription={t("Search")} className="md:hidden" onClick={onOpenSearch}>
        <Search className="size-4" />
      </Button>

      <LinkButton size="sm" variant="ghost" href={routes.catalog}>
        <OverflowMenuHorizontal className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">{t("Applications")}</span>
      </LinkButton>

      {sidekick && (
        <Button kind={sidekick.open ? "secondary" : "ghost"} size="sm" aria-pressed={sidekick.open} onClick={sidekick.onToggle}>
          <AiGenerate className="size-4 text-accent" aria-hidden />
          {t("Sidekick")}
        </Button>
      )}

      <span className="relative inline-flex">
        <LinkButton isIconOnly variant="ghost" size="sm" aria-label={pending === 1 ? "1 pending approval" : `${pending} pending approvals`} href={routes.flow.approvals}>
          <CheckmarkFilled className="size-4" />
        </LinkButton>
        {pending > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-semibold text-foreground">
            {pending}
          </span>
        )}
      </span>

      <NotificationsMenu />

    </header>
  );
}
