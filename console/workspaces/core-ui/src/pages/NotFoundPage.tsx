import { Button } from "@carbon/react";
import { useNavigate } from "react-router-dom";
import { useT } from "@workspacenow/i18n";
import styles from "./NotFoundPage.module.scss";

export function NotFoundPage() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <h1 className={styles.code}>404</h1>
      <p className={styles.message}>{t("This page does not exist.")}</p>
      <Button kind="secondary" onClick={() => navigate("/")}>
        {t("Back to home")}
      </Button>
    </div>
  );
}
