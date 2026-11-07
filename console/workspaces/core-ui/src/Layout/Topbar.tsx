import { Badge, Breadcrumbs, Button, Kbd } from "@heroui/react";
import { Bars, CircleCheck, DotsNine, Magnifier, SparklesFill } from "@workspacenow/icons";
import { useLocation } from "react-router-dom";
import { useListApprovals } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { LinkButton, type WorkspaceModule } from "@workspacenow/views";
import { useT } from "@workspacenow/i18n";
import { NotificationsMenu } from "./NotificationsMenu";
import { activeItem } from "./Sidebar";

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
      <Button isIconOnly variant="ghost" size="sm" className="lg:hidden" aria-label="Open navigation" onPress={onOpenMenu}>
        <Bars className="size-4" />
      </Button>

      <Breadcrumbs className="min-w-0 flex-1 text-sm">
        <Breadcrumbs.Item href="/">{t("Home")}</Breadcrumbs.Item>
        {active && <Breadcrumbs.Item href={active.basePath}>{active.title}</Breadcrumbs.Item>}
        {active && page && !page.end && <Breadcrumbs.Item href={page.href}>{page.label}</Breadcrumbs.Item>}
      </Breadcrumbs>

      <Button variant="outline" size="sm" className="hidden w-64 justify-start font-normal text-muted md:flex" onPress={onOpenSearch}>
        <Magnifier className="size-4" aria-hidden />
        <span className="flex-1 text-left">{t("Search")}</span>
        <Kbd>
          <Kbd.Abbr keyValue="command" />K
        </Kbd>
      </Button>
      <Button isIconOnly variant="ghost" size="sm" className="md:hidden" aria-label={t("Search")} onPress={onOpenSearch}>
        <Magnifier className="size-4" />
      </Button>

      <LinkButton size="sm" variant="ghost" href={routes.catalog}>
        <DotsNine className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">{t("Applications")}</span>
      </LinkButton>

      {sidekick && (
        <Button size="sm" variant={sidekick.open ? "secondary" : "ghost"} aria-pressed={sidekick.open} onPress={sidekick.onToggle}>
          <SparklesFill className="size-4 text-accent" aria-hidden />
          {t("Sidekick")}
        </Button>
      )}

      <Badge.Anchor>
        <LinkButton isIconOnly variant="ghost" size="sm" aria-label={pending === 1 ? "1 pending approval" : `${pending} pending approvals`} href={routes.flow.approvals}>
          <CircleCheck className="size-4" />
        </LinkButton>
        {pending > 0 && (
          <Badge color="warning" size="sm">
            {pending}
          </Badge>
        )}
      </Badge.Anchor>

      <NotificationsMenu />

    </header>
  );
}
