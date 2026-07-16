import { useTranslation } from "react-i18next";
import { useRecallStore } from "@/stores/recall-store";
import { DEFAULT_SHORTCUTS, shortcutLabel, type ShortcutAction } from "@/lib/shortcuts";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogTitle>{t("shortcutHelp.title")}</DialogTitle>

        <div className="space-y-2 mt-2">
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
      </DialogContent>
    </Dialog>
  );
}
