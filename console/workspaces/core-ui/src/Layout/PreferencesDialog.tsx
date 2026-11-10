import { ComposedModal, ModalBody, ModalHeader, RadioButton, RadioButtonGroup, Select, SelectItem } from "@carbon/react";

import { CARBON_THEMES, useCarbonTheme, type ThemePreference } from "@workspacenow/views";
import { LOCALES, useLocale, useT, type Locale } from "@workspacenow/i18n";
import styles from "./PreferencesDialog.module.scss";

/** The viewer's own settings: one of Carbon's four themes (or the system's), and a language. Applied as soon as chosen. */
export function PreferencesDialog({ onClose }: { onClose: () => void }) {
  const { preference, setPreference } = useCarbonTheme();
  const t = useT();
  const { locale, setLocale } = useLocale();

  return (
    <ComposedModal open onClose={onClose} size="sm" aria-label={t("Preferences")}>
      <ModalHeader title={t("Preferences")} closeModal={onClose} />
      <ModalBody className={styles.body}>
        <RadioButtonGroup
          legendText={t("Theme")}
          name="theme"
          orientation="vertical"
          valueSelected={preference}
          onChange={(value) => setPreference(value as ThemePreference)}
        >
          <RadioButton id="theme-system" labelText={t("System")} value="system" />
          {CARBON_THEMES.map((theme) => (
            <RadioButton key={theme.id} id={`theme-${theme.id}`} labelText={theme.label} value={theme.id} />
          ))}
        </RadioButtonGroup>

        <Select id="preferences-language" labelText={t("Language")} value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
          {LOCALES.map((l) => (
            <SelectItem key={l.id} value={l.id} text={l.label} />
          ))}
        </Select>

        <p className={styles.note}>{t("Saved in this browser.")}</p>
      </ModalBody>
    </ComposedModal>
  );
}
