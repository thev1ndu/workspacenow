import { Modal } from "@heroui/react";
import { Check } from "@workspacenow/icons";
import { PALETTES, useAppearance, type ColorMode } from "@workspacenow/views";
import { LOCALES, useLocale, useT } from "@workspacenow/i18n";

const MODES: Array<{ id: ColorMode; label: string }> = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

/** The viewer's own settings: light, dark or system appearance, and a colour theme. Applied as soon as chosen. */
export function PreferencesDialog({ onClose }: { onClose: () => void }) {
  const { mode, palette, setMode, setPalette } = useAppearance();
  const t = useT();
  const { locale, setLocale } = useLocale();

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{t("Preferences")}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="grid gap-6 pb-2">
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">{t("Appearance")}</legend>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-default p-1">
                {MODES.map((m) => (
                  <label
                    key={m.id}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-center text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                      mode === m.id ? "bg-surface font-medium text-foreground shadow-sm" : "text-muted hover:text-foreground"
                    }`}
                  >
                    <input type="radio" name="appearance" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="sr-only" />
                    {t(m.label)}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">{t("Language")}</legend>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-default p-1">
                {LOCALES.map((l) => (
                  <label
                    key={l.id}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-center text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                      locale === l.id ? "bg-surface font-medium text-foreground shadow-sm" : "text-muted hover:text-foreground"
                    }`}
                  >
                    <input type="radio" name="locale" value={l.id} checked={locale === l.id} onChange={() => setLocale(l.id)} className="sr-only" />
                    {l.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">Theme</legend>
              <div className="grid grid-cols-2 gap-2">
                {PALETTES.map((p) => {
                  const selected = palette === p.id;
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                        selected ? "border-accent bg-accent-soft" : "border-separator hover:bg-surface-secondary"
                      }`}
                    >
                      <input type="radio" name="palette" value={p.id} checked={selected} onChange={() => setPalette(p.id)} className="sr-only" />
                      <span aria-hidden className="size-5 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: p.swatch }} />
                      <span className="min-w-0 flex-1 truncate">{p.label}</span>
                      {selected && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p className="text-xs text-muted">Saved in this browser.</p>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
