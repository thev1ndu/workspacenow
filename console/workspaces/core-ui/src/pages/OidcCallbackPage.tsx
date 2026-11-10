import { useEffect, useState } from "react";
import { Button, InlineLoading, InlineNotification, Tile } from "@carbon/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { completeOidcLogin } from "@workspacenow/auth";
import { Brand } from "../Layout/Brand";
import styles from "./Login.module.scss";

export function OidcCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state") ?? "";
    if (!code) {
      setError(searchParams.get("error_description") ?? "The identity provider did not return a code.");
      return;
    }
    completeOidcLogin(code, state)
      .then(() => navigate("/", { replace: true }))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Sign-in failed."));
  }, [searchParams, navigate]);

  return (
    <main className={styles.page}>
      <Tile className={styles.callback}>
        <Brand />
        {error ? (
          <>
            <InlineNotification kind="error" lowContrast hideCloseButton title="Sign-in failed" subtitle={error} />
            <Button kind="secondary" onClick={() => navigate("/login", { replace: true })}>
              Back to sign in
            </Button>
          </>
        ) : (
          <InlineLoading description="Signing you in" />
        )}
      </Tile>
    </main>
  );
}
