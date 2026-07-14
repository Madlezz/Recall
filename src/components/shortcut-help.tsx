import { X } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRecallStore } from "@/stores/recall-store";
import { DEFAULT_SHORTCUTS, shortcutLabel, type ShortcutAction } from "@/lib/shortcuts";

interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

// Actions to show in the help dialog, in display order.
const HELP_ACTIONS: { action: ShortcutAction; descKey: string }[] = [
  { action: "commandPalette", descKey: "shortcutHelp.commandPalette" },
  { action: "importHub", descKey: "shortcutHelp.importHub" },
  { action: "reveal", descKey: "shortcutHelp.revealAnswer" },
  { action: "rateAgain", descKey: "shortcutHelp.rateAgain" },
  { action: "rateHard", descKey: "shortcutHelp.rateHard" },
  { action: "rateGood", descKey: "shortcutHelp.rateGood" },
  { action: "rateEasy", descKey: "shortcutHelp.rateEasy" },
  { action: "bury", descKey: "shortcutHelp.buryCard" },
  { action: "snooze", descKey: "shortcutHelp.snoozeCard" },
  { action: "tts", descKey: "shortcutHelp.startReview" },
  { action: "quickAdd", descKey: "shortcutHelp.quickAddCard" },
  { action: "undo", descKey: "shortcutHelp.undoReview" },
  { action: "showHelp", descKey: "shortcutHelp.showHelp" },
  { action: "closeDialog", descKey: "shortcutHelp.closeDialog" },
];

export function ShortcutHelp({ open, onClose }: ShortcutHelpProps): JSX.Element {
  const { t } = useTranslation();
  const shortcuts = useRecallStore((state) => state.settings.shortcuts) ?? DEFAULT_SHORTCUTS;
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return <></>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-title"
    >
      <div
        className="mx-4 w-full max-w-sm rounded-lg border bg-surface dark:bg-surface p-6 shadow-sm animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="shortcut-help-title" className="font-semibold">{t("shortcutHelp.title")}</h2>
          <button
            onClick={onClose}
            aria-label={t("shortcutHelp.closeAria")}
            className="rounded p-1 hover:bg-surface-container-high dark:hover:bg-surface-container transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {HELP_ACTIONS.map(({ action, descKey }) => (
            <div key={action} className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant dark:text-on-surface-variant">{t(descKey)}</span>
              <kbd
                className="rounded border bg-surface-container dark:bg-surface-container px-1.5 py-0.5 text-xs font-mono font-medium"
              >
                {shortcutLabel(shortcuts[action])}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-on-surface-variant dark:text-on-surface-variant text-center">
          {t("shortcutHelp.pressPrefix")} <kbd className="rounded border bg-surface-container dark:bg-surface-container px-1 py-0.5 text-[10px] font-mono">?</kbd> {t("shortcutHelp.anywhereToShow")}
        </p>
      </div>
    </div>
  );
}