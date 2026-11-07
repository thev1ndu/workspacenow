import { useEffect, useState } from "react";
import { Button, Card, Skeleton } from "@heroui/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { completeOidcLogin } from "@workspacenow/auth";
import { Brand } from "../Layout/Brand";

/** Lands here after the identity provider redirects back with ?code=&state=; exchanges the code, then goes home. */
export function OidcCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

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
      <Card className="w-full max-w-md items-center gap-4 p-8 text-center">
        <Brand />
        {error ? (
          <>
            <p className="text-sm text-danger">{error}</p>
            <Button variant="secondary" onPress={() => navigate("/login", { replace: true })}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <Skeleton className="h-4 w-40 rounded-md" />
            <p className="text-sm text-muted">Signing you in…</p>
          </>
        )}
      </Card>
    </main>
  );
}
