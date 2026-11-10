import { Button } from "@carbon/react";
import { useNavigate } from "react-router-dom";
import { useT } from "@workspacenow/i18n";

export function NotFoundPage() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="text-6xl font-semibold tracking-tight text-foreground">404</p>
      <p className="text-sm text-muted">{t("This page does not exist.")}</p>
      <Button kind="secondary" onClick={() => navigate("/")}>
        {t("Back to home")}
      </Button>
    </main>
  );
}
