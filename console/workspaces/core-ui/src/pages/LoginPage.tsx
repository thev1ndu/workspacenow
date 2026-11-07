import { Avatar, Button, Card, Chip, Skeleton } from "@heroui/react";
import { ShieldCheck } from "@workspacenow/icons";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthHooks } from "@workspacenow/auth";
import { useListPersonas } from "@workspacenow/api-client";
import { globalConfig } from "@workspacenow/types";
import { Brand } from "../Layout/Brand";

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

/** Stand-in for the redirect to the customer's OIDC provider: pick who to sign in as. */
export function LoginPage() {
  const { isAuthenticated, signIn } = useAuthHooks();
  const oidcMode = globalConfig.authMode === "oidc" && !!globalConfig.oidc;
  const { data, isLoading } = useListPersonas();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  if (isAuthenticated) return <Navigate to={from} replace />;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Brand />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sign in to {globalConfig.organizationName}</h1>
            <p className="mt-1 text-sm text-muted">Authentication is handled by your organization's identity provider.</p>
          </div>
        </div>

        {oidcMode ? (
          <div className="mb-6 flex flex-col items-center gap-4">
            <Button size="lg" variant="primary" onPress={() => signIn()}>
              <ShieldCheck className="size-4" aria-hidden />
              Sign in with your identity provider
            </Button>
          </div>
        ) : (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-surface-secondary px-4 py-3 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            This is a demo installation, so you choose a person instead of entering credentials. Each person's identity-provider groups map to
            different roles, so each one sees and can do different things.
          </p>
        </div>
        )}

        {!oidcMode && <div className="grid gap-3 sm:grid-cols-2">
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
