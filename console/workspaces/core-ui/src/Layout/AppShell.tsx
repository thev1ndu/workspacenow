import { useState } from "react";
import { Content } from "@carbon/react";
import { Outlet, useMatch } from "react-router-dom";
import { useGetApplication, useSession } from "@workspacenow/api-client";
import { routes } from "@workspacenow/types";
import { PreferencesDialog } from "./PreferencesDialog";
import { AppSidekick, SidekickPanel } from "./Sidekick";
import { MAIN_ID, AppTopbar } from "./Topbar";
import styles from "./Shell.module.scss";

/**
 * Full-screen frame for the app catalogue and the apps it opens: no console navigation, only the way
 * back to the catalogue and to the WorkspaceNow console. An open app gets a Sidekick confined to it.
 */
export function AppShell() {
  const appId = useMatch(routes.app)?.params.appId;
  const { data: app } = useGetApplication({ appId });
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  // Sidekick works as the user, so it is offered only to users who hold a role.
  const { data: session } = useSession();
  const [sidekickPreferred, setSidekickPreferred] = useState(false);
  const scopedApp = appId && app?.id === appId && session?.roles.length ? app : undefined;
  const sidekickOpen = !!scopedApp && sidekickPreferred;

  return (
    <>
      <AppTopbar
        applicationId={scopedApp?.id}
        onOpenPreferences={() => setPreferencesOpen(true)}
        sidekick={scopedApp ? { open: sidekickOpen, onToggle: () => setSidekickPreferred(!sidekickOpen) } : undefined}
      />
      {preferencesOpen && <PreferencesDialog onClose={() => setPreferencesOpen(false)} />}

      {scopedApp && (
        // Keyed by app so each app starts its own conversation; kept mounted while closed so it survives reopening.
        <SidekickPanel open={sidekickOpen}>
          <AppSidekick key={scopedApp.id} app={scopedApp} onClose={() => setSidekickPreferred(false)} />
        </SidekickPanel>
      )}

      <div className={sidekickOpen ? `${styles.body} ${styles["body--sidekick"]}` : styles.body}>
        <Content id={MAIN_ID} tabIndex={-1} className={styles.content}>
          <Outlet />
        </Content>
      </div>
    </>
  );
}
