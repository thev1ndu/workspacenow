import { Security, UserAvatar } from "@carbon/react/icons";
import { useState } from "react";
import { Button, ContainedList, ContainedListItem, InlineNotification, PasswordInput, SkeletonPlaceholder, Stack, Tag, TextInput } from "@carbon/react";

import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthHooks } from "@workspacenow/auth";
import { useT } from "@workspacenow/i18n";
import { useListPersonas } from "@workspacenow/api-client";
import { globalConfig } from "@workspacenow/types";
import { Brand } from "../Layout/Brand";
import styles from "./Login.module.scss";

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
    <main className={styles.page}>
      <div className={styles.panel}>
        <Stack gap={5}>
          <div className={styles.heading}>
            <Brand />
            <h1 className={styles.title}>
              {t("Sign in")} {globalConfig.organizationName}
            </h1>
            <p className={styles.subtitle}>Authentication is handled by your organization's identity provider.</p>
          </div>

          {oidcMode && (
            <Button kind="primary" renderIcon={Security} onClick={() => signIn()}>
              {t("Sign in with your identity provider")}
            </Button>
          )}
          {oidcMode && <p className={styles.divider}>{t("or use a system user")}</p>}

          {(localMode || oidcMode) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitCredentials();
              }}
            >
              <Stack gap={5}>
                <TextInput id="login-email" labelText={t("Email")} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@workspacenow.local" autoComplete="username" />
                <PasswordInput id="login-password" labelText={t("Password")} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                {error && <InlineNotification kind="error" lowContrast hideCloseButton title={t("Sign in")} subtitle={error} />}
                <Button type="submit" kind="primary" disabled={busy}>
                  {busy ? t("Signing in…") : t("Sign in")}
                </Button>
                <p className={styles.note}>{t("System user sign-in; your administrator provisions the credentials.")}</p>
              </Stack>
            </form>
          )}

          {!oidcMode && !localMode && (
            <>
              <InlineNotification
                kind="info"
                lowContrast
                hideCloseButton
                title="Demo installation"
                subtitle="You choose a person instead of entering credentials. Each person's identity-provider groups map to different roles, so each one sees and can do different things."
              />
              {isLoading ? (
                <SkeletonPlaceholder className={styles.skeleton} />
              ) : (
                <ContainedList kind="on-page" label="People" isInset>
                  {data?.items.map((user) => (
                    <ContainedListItem
                      key={user.id}
                      renderIcon={UserAvatar}
                      onClick={() => {
                        signIn({ id: user.id, name: user.name, email: user.email, title: user.title });
                        navigate(from, { replace: true });
                      }}
                    >
                      <span className={styles.name}>{user.name}</span>
                      <span className={styles.role}>{user.title}</span>
                      <span className={styles.tags}>
                        {user.groups.map((g) => (
                          <Tag key={g} size="sm" type="gray">
                            {g}
                          </Tag>
                        ))}
                      </span>
                    </ContainedListItem>
                  ))}
                </ContainedList>
              )}
            </>
          )}
        </Stack>
      </div>
    </main>
  );
}
