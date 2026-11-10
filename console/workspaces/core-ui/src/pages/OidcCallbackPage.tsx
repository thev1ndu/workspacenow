import { useEffect, useState } from "react";
import { Button, SkeletonText } from "@carbon/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { completeOidcLogin } from "@workspacenow/auth";
import { Brand } from "../Layout/Brand";

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
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-separator bg-surface p-8 text-center">
        <Brand />
        {error ? (
          <>
            <p className="text-sm text-danger">{error}</p>
            <Button kind="secondary" onClick={() => navigate("/login", { replace: true })}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <SkeletonText width="160px" />
            <p className="text-sm text-muted">Signing you in…</p>
          </>
        )}
      </div>
    </main>
  );
}
