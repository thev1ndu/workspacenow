import { useState } from "react";
import { Avatar, Button, Card, Chip, Skeleton } from "@heroui/react";
import { ShieldCheck } from "@workspacenow/icons";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthHooks } from "@workspacenow/auth";
import { useT } from "@workspacenow/i18n";
import { useListPersonas } from "@workspacenow/api-client";
import { globalConfig } from "@workspacenow/types";
import { TextInput } from "@workspacenow/views";
import { Brand } from "../Layout/Brand";

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

/** Sign-in page: OIDC redirect, system-user credentials, or demo persona picker. */
export function LoginPage() {
  const t = useT();
  const { isAuthenticated, signIn, signInWithCredentials } = useAuthHooks();
  const oidcMode = globalConfig.authMode === "oidc" && !!globalConfig.oidc;
  const localMode = globalConfig.authMode === "local";
  const { data, isLoading } = useListPersonas();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const submitCredentials = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithCredentials(email, password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Brand />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t("Sign in")} {globalConfig.organizationName}</h1>
            <p className="mt-1 text-sm text-muted">Authentication is handled by your organization's identity provider.</p>
          </div>
        </div>

        {oidcMode && (
          <div className="mb-6 flex flex-col items-center gap-4">
            <Button size="lg" variant="primary" onPress={() => signIn()}>
              <ShieldCheck className="size-4" aria-hidden />
              {t("Sign in with your identity provider")}
            </Button>
          </div>
        )}
        {oidcMode && (
          <div className="mb-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            {t("or use a system user")}
            <span className="h-px flex-1 bg-border" />
          </div>
        )}
        {(localMode || oidcMode) ? (
          <div className="mb-6 flex flex-col gap-3">
            <TextInput label={t("Email")} value={email} onChange={setEmail} placeholder="admin@workspacenow.local" />
            <TextInput label={t("Password")} value={password} onChange={setPassword} type="password" />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button size="lg" variant="primary" isDisabled={busy} onPress={() => void submitCredentials()}>
              {busy ? t("Signing in…") : t("Sign in")}
            </Button>
            <p className="text-center text-xs text-muted">
              {t("System user sign-in; your administrator provisions the credentials.")}
            </p>
          </div>
        ) : (localMode || oidcMode) ? null : (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-surface-secondary px-4 py-3 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            This is a demo installation, so you choose a person instead of entering credentials. Each person's identity-provider groups map to
            different roles, so each one sees and can do different things.
          </p>
        </div>
        )}

        {!oidcMode && !localMode && <div className="grid gap-3 sm:grid-cols-2">
          {isLoading
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
            : data?.items.map((user) => (
                <Card key={user.id} className="gap-0 p-0">
                  <Button
                    variant="ghost"
                    className="h-auto w-full items-start justify-start gap-3 rounded-[inherit] p-4 text-left font-normal whitespace-normal"
                    onPress={() => {
                      signIn({ id: user.id, name: user.name, email: user.email, title: user.title });
                      navigate(from, { replace: true });
                    }}
                  >
                    <Avatar size="sm">
                      <Avatar.Fallback>{initials(user.name)}</Avatar.Fallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{user.name}</span>
                      <span className="block text-xs text-muted">{user.title}</span>
                      <span className="mt-2 flex flex-wrap gap-1">
                        {user.groups.map((g) => (
                          <Chip key={g} size="sm" variant="secondary">
                            {g}
                          </Chip>
                        ))}
                      </span>
                    </span>
                  </Button>
                </Card>
              ))}
        </div>}
      </div>
    </main>
  );
}
