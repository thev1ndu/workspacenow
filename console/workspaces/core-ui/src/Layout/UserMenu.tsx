import { UserAvatar } from "@carbon/react/icons";
import { useRef } from "react";
import { HeaderGlobalAction, HeaderPanel, Switcher, SwitcherDivider, SwitcherItem } from "@carbon/react";

import { useAuthHooks } from "@workspacenow/auth";
import { useSession } from "@workspacenow/api-client";
import { useT } from "@workspacenow/i18n";
import { useDismiss } from "./shellHooks";
import styles from "./Topbar.module.scss";

interface UserMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPreferences: () => void;
}

/** Header action plus panel: who is signed in, with their preferences and session actions. */
export function UserMenu({ open, onOpenChange, onOpenPreferences }: UserMenuProps) {
  const t = useT();
  const { userInfo, logout } = useAuthHooks();
  const { data: session } = useSession();
  const name = userInfo?.name ?? "User";
  const actionRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => onOpenChange(false), [actionRef, panelRef]);

  const run = (action: () => void) => (event: { preventDefault: () => void }) => {
    event.preventDefault();
    onOpenChange(false);
    action();
  };

  return (
    <>
      <HeaderGlobalAction ref={actionRef} aria-label={`${t("Account")}: ${name}`} isActive={open} onClick={() => onOpenChange(!open)} tooltipAlignment="end">
        <UserAvatar size={20} />
      </HeaderGlobalAction>
      <HeaderPanel ref={panelRef} aria-label={t("Account")} expanded={open} addFocusListeners={false} className={styles.panel}>
        <div className={styles.account}>
          <span className={styles.accountName}>{name}</span>
          <span className={styles.accountRole}>{session?.roles.join(", ") ?? userInfo?.title}</span>
        </div>
        <Switcher aria-label={t("Account")} expanded={open}>
          <SwitcherItem aria-label={t("Preferences")} href="#preferences" expanded={open} onClick={run(onOpenPreferences)}>
            {t("Preferences")}
          </SwitcherItem>
          <SwitcherDivider />
          <SwitcherItem aria-label={t("Sign out")} href="#sign-out" expanded={open} onClick={run(() => void logout())}>
            {t("Sign out")}
          </SwitcherItem>
        </Switcher>
      </HeaderPanel>
    </>
  );
}
