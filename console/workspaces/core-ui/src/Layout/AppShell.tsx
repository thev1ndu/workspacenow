import { useState } from "react";
import { Button } from "@heroui/react";
import { ArrowLeft, SparklesFill } from "@workspacenow/icons";
import { Link, Outlet, useMatch } from "react-router-dom";
import { useGetApplication, useSession } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { LinkButton, useAppearance } from "@workspacenow/views";
import { Brand } from "./Brand";
import { AppSidekick } from "./Sidekick";
import { UserMenu } from "./UserMenu";

/**
 * Full-screen frame for the app catalogue and the apps it opens: no console navigation, only the way
 * back to the catalogue and to the WorkspaceNow console. An open app gets a Sidekick confined to it.
 */
export function AppShell() {
  // Kept mounted so a "System" appearance follows the operating system while the app is open.
  useAppearance();
  const appId = useMatch(routes.app)?.params.appId;
  const { data: app } = useGetApplication({ appId });
  // Sidekick works as the user, so it is offered only to users who hold a role.
  const { data: session } = useSession();
  const [sidekickPreferred, setSidekickPreferred] = useState(false);
  const scopedApp = appId && app?.id === appId && session?.roles.length ? app : undefined;
  const sidekickOpen = !!scopedApp && sidekickPreferred;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {scopedApp && (
        // Keyed by app so each app starts its own conversation; kept mounted while closed so it survives reopening.
        <aside className={`fixed inset-y-0 right-0 z-40 w-full border-l border-separator bg-background sm:w-[340px] ${sidekickOpen ? "" : "hidden"}`}>
          <AppSidekick key={scopedApp.id} app={scopedApp} onClose={() => setSidekickPreferred(false)} />
        </aside>
      )}

      <div className={`flex min-h-dvh flex-col ${sidekickOpen ? "xl:pr-[340px]" : ""}`}>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-separator bg-background/85 px-4 backdrop-blur lg:px-6">
          <Link to={routes.catalog} className="flex min-w-0 flex-1 items-center gap-3 no-underline">
            <Brand />
            <span className="hidden h-4 w-px bg-separator sm:block" aria-hidden />
            <span className="hidden text-sm text-muted sm:inline">Applications</span>
          </Link>
          <LinkButton size="sm" variant="ghost" href={routes.home}>
            <ArrowLeft className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">Back to WorkspaceNow</span>
          </LinkButton>
          {scopedApp && (
            <Button size="sm" variant={sidekickOpen ? "secondary" : "ghost"} aria-pressed={sidekickOpen} onPress={() => setSidekickPreferred(!sidekickOpen)}>
              <SparklesFill className="size-4 text-accent" aria-hidden />
              <span className="sr-only sm:not-sr-only">Sidekick</span>
            </Button>
          )}
          <UserMenu compact />
        </header>
        <main id="main" className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
