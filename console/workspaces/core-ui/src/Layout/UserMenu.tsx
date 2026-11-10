import { useEffect, useRef, useState } from "react";
import { Button } from "@carbon/react";
import { ArrowRightFromSquare, ChevronsExpandVertical, Gear } from "@workspacenow/icons";
import { useAuthHooks } from "@workspacenow/auth";
import { useSession } from "@workspacenow/api-client";
import { initials } from "../pages/LoginPage";
import { PreferencesDialog } from "./PreferencesDialog";

/** Who is signed in, with their preferences and session actions. */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { userInfo, logout } = useAuthHooks();
  const { data: session } = useSession();
  const name = userInfo?.name ?? "User";
  const [open, setOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const onAction = (id: string) => {
    setOpen(false);
    if (id === "preferences") setPreferencesOpen(true);
    else if (id === "logout") void logout();
  };

  return (
    <>
      <div className="relative" ref={ref}>
        {compact ? (
          <Button kind="ghost" hasIconOnly iconDescription={`Account menu for ${name}`} onClick={() => setOpen((o) => !o)}>
            <span className="flex size-6 items-center justify-center rounded-full bg-default text-[10px] font-medium text-foreground" aria-hidden>
              {initials(name)}
            </span>
          </Button>
        ) : (
          <Button kind="ghost" className="h-auto w-full justify-start gap-2.5 rounded-lg px-2 py-2 text-left font-normal" aria-label="Account menu" onClick={() => setOpen((o) => !o)}>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-default text-[10px] font-medium text-foreground" aria-hidden>
              {initials(name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{name}</span>
              <span className="block truncate text-xs text-muted">{session?.roles.join(", ") ?? userInfo?.title}</span>
            </span>
            <ChevronsExpandVertical className="size-4 shrink-0 text-muted" aria-hidden />
          </Button>
        )}
        {open && (
          <div className="absolute bottom-full left-0 z-50 mb-1 min-w-64 rounded-lg border border-separator bg-surface p-1 shadow-lg" role="menu" aria-label="Account">
            <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-default" onClick={() => onAction("preferences")}>
              <Gear className="size-4 text-muted" aria-hidden />
              Preferences
            </button>
            <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-danger hover:bg-default" onClick={() => onAction("logout")}>
              <ArrowRightFromSquare className="size-4" aria-hidden />
              Sign out
            </button>
          </div>
        )}
      </div>
      {preferencesOpen && <PreferencesDialog onClose={() => setPreferencesOpen(false)} />}
    </>
  );
}
