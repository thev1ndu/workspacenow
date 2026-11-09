import { useState } from "react";
import { Avatar, Button, Dropdown, Label } from "@heroui/react";
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
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const onAction = (key: React.Key) => {
    const id = String(key);
    if (id === "preferences") setPreferencesOpen(true);
    else if (id === "logout") void logout();
  };

  return (
    <>
      <Dropdown>
        {compact ? (
          <Button isIconOnly variant="ghost" aria-label={`Account menu for ${name}`}>
            <Avatar size="sm">
              <Avatar.Fallback>{initials(name)}</Avatar.Fallback>
            </Avatar>
          </Button>
        ) : (
          <Button variant="ghost" className="h-auto w-full justify-start gap-2.5 rounded-lg px-2 py-2 text-left font-normal" aria-label="Account menu">
            <Avatar size="sm">
              <Avatar.Fallback>{initials(name)}</Avatar.Fallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{name}</span>
              <span className="block truncate text-xs text-muted">{session?.roles.join(", ") ?? userInfo?.title}</span>
            </span>
            <ChevronsExpandVertical className="size-4 shrink-0 text-muted" aria-hidden />
          </Button>
        )}
        <Dropdown.Popover placement="top start" className="min-w-64">
          <Dropdown.Menu onAction={onAction} aria-label="Account">
            <Dropdown.Section>
              <Dropdown.Item id="preferences" textValue="Preferences">
                <Gear className="size-4 text-muted" aria-hidden />
                <Label>Preferences</Label>
              </Dropdown.Item>
              <Dropdown.Item id="logout" textValue="Sign out" variant="danger">
                <ArrowRightFromSquare className="size-4" aria-hidden />
                <Label>Sign out</Label>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      {preferencesOpen && <PreferencesDialog onClose={() => setPreferencesOpen(false)} />}
    </>
  );
}
