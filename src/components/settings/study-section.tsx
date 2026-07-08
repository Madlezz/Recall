import { Mic, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { SettingsCard } from "./settings-card";
import { useRecallStore } from "@/stores/recall-store";
import { toast } from "sonner";
import { optimizeFromHistory } from "@/services/fsrs-optimizer";
import { DEFAULT_SHORTCUTS, REBINDABLE_ACTIONS, shortcutLabel, type ShortcutAction, type ShortcutMap } from "@/lib/shortcuts";

export function StudySection(): JSX.Element {
  const { t } = useTranslation();
  const settings = useRecallStore((state) => state.settings);
  const cards = useRecallStore((state) => state.cards);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const updateSettings = useRecallStore((state) => state.updateSettings);

  return (
    <>
      {/* FSRS Optimizer */}
      <section className="grid gap-4 sm:grid-cols-1">
        <SettingsCard title={t("settings.fsrsOptimizer")}>
          <div className="space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("settings.optimizeDescription")}
            </p>
            <button
              type="button"
              onClick={() => {
                const result = optimizeFromHistory(reviewLogs, cards, settings.desiredRetention);
                if (result.success) {
                  void updateSettings({
                    desiredRetention: result.suggestedRetention,
                    fsrsWeights: result.weights,
                  });
                  toast.success(t("settings.optimizeSuccess", {
                    reviewCount: result.reviewCount,
                    actualRetention: Math.round(result.actualRetention * 100),
                    suggestedRetention: Math.round(result.suggestedRetention * 100),
                  }));
                } else {
                  toast.error(result.error ?? t("settings.optimizeFailed"));
                }
              }}
              disabled={reviewLogs.length < 100}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrendingUp className="h-4 w-4" />
              {t("settings.optimizeFromHistory", { count: reviewLogs.length })}
            </button>
            {settings.fsrsWeights && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("settings.customWeightsActive")} • {t("settings.retention")}: {Math.round(settings.desiredRetention * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => void updateSettings({ fsrsWeights: null })}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t("settings.resetToDefaults")}
                </button>
              </div>
            )}
          </div>
        </SettingsCard>
      </section>

      {/* Voice input toggle */}
      <SettingsCard title={t("settings.voiceInput")} description={t("settings.voiceInputDescription")}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void updateSettings({ voiceInputEnabled: !settings.voiceInputEnabled })}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              settings.voiceInputEnabled
                ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <Mic className="h-4 w-4" />
            {settings.voiceInputEnabled ? t("settings.enabled") : t("settings.disabled")}
          </button>
        </div>
      </SettingsCard>

      {/* Swipe gestures toggle */}
      <SettingsCard title={t("settings.swipeGestures")} description={t("settings.swipeGesturesDescription")}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void updateSettings({ swipeGestures: !settings.swipeGestures })}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              settings.swipeGestures
                ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
          >
            {settings.swipeGestures ? t("settings.enabled") : t("settings.disabled")}
          </button>
          {settings.swipeGestures && (
            <span className="text-xs text-zinc-400">
              ← {t("study.again")} · → {t("study.good")} · ↑ {t("study.easy")} · ↓ {t("study.hard")}
            </span>
          )}
        </div>
      </SettingsCard>

      {/* Color-blind friendly UI toggle */}
      <SettingsCard title={t("settings.colorBlindMode")} description={t("settings.colorBlindModeDescription")}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void updateSettings({ colorBlindMode: !settings.colorBlindMode })}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              settings.colorBlindMode
                ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
          >
            {settings.colorBlindMode ? t("settings.enabled") : t("settings.disabled")}
          </button>
        </div>
      </SettingsCard>

      {/* Keyboard shortcuts */}
      <SettingsCard title={t("settings.shortcuts")} description={t("settings.shortcutsDescription")}>
        <ShortcutEditor
          shortcuts={settings.shortcuts ?? DEFAULT_SHORTCUTS}
          onChange={(next) => void updateSettings({ shortcuts: next })}
          onReset={() => void updateSettings({ shortcuts: { ...DEFAULT_SHORTCUTS } })}
        />
      </SettingsCard>

      {/* Study settings */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SettingsCard title={t("settings.dailyNewCards")}>
          <div className="flex items-center gap-2">
            <label htmlFor="daily-new-cards" className="sr-only">{t("settings.dailyNewCards")}</label>
            <input
              id="daily-new-cards"
              type="number" min="0" max="100"
              value={settings.dailyNewCardLimit}
              onChange={(e) => void updateSettings({ dailyNewCardLimit: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
              className="w-20 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm text-zinc-400">{t("settings.cardsPerDay")}</span>
          </div>
        </SettingsCard>

        <SettingsCard title={t("settings.leechThreshold")}>
          <div className="flex items-center gap-2">
            <label htmlFor="leech-threshold" className="sr-only">{t("settings.leechThreshold")}</label>
            <input
              id="leech-threshold"
              type="number" min="1" max="20"
              value={settings.leechThreshold}
              onChange={(e) => void updateSettings({ leechThreshold: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)) })}
              className="w-20 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm text-zinc-400">{t("settings.lapses")}</span>
          </div>
        </SettingsCard>

        <SettingsCard title={t("settings.dailyGoal")}>
          <div className="flex items-center gap-2">
            <label htmlFor="daily-goal" className="sr-only">{t("settings.dailyGoal")}</label>
            <input
              id="daily-goal"
              type="number" min="1" max="500"
              value={settings.dailyGoal}
              onChange={(e) => void updateSettings({ dailyGoal: Math.max(1, Math.min(500, parseInt(e.target.value) || 20)) })}
              className="w-20 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm text-zinc-400">{t("settings.cardsPerDay")}</span>
          </div>
        </SettingsCard>

        <SettingsCard title={t("settings.desiredRetention")} description={t("settings.desiredRetentionDescription")}>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="70" max="99"
              aria-label={t("settings.desiredRetention")}
              value={Math.round(settings.desiredRetention * 100)}
              onChange={(e) => void updateSettings({ desiredRetention: (parseInt(e.target.value, 10) || 90) / 100 })}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-700 dark:bg-zinc-700 dark:accent-zinc-300"
            />
            <span className="w-12 text-right text-sm tabular-nums text-zinc-400" aria-live="polite">{(settings.desiredRetention * 100).toFixed(0)}%</span>
          </div>
        </SettingsCard>
      </section>
    </>
  );
}

// Display labels for the rebindable shortcut actions.
const SHORTCUT_LABEL_KEYS: Record<ShortcutAction, string> = {
  reveal: "shortcutHelp.revealAnswer",
  rateAgain: "shortcutHelp.rateAgain",
  rateHard: "shortcutHelp.rateHard",
  rateGood: "shortcutHelp.rateGood",
  rateEasy: "shortcutHelp.rateEasy",
  bury: "shortcutHelp.buryCard",
  snooze: "shortcutHelp.snoozeCard",
  tts: "shortcutHelp.tts",
  undo: "shortcutHelp.undoReview",
  // Non-rebindable actions (kept for type completeness; not rendered).
  commandPalette: "",
  quickAdd: "",
  showHelp: "",
  closeDialog: "",
};

function captureKey(event: KeyboardEvent): string {
  event.preventDefault();
  const ctrl = event.ctrlKey ? "ctrl+" : "";
  const key = event.key.toLowerCase();
  if (key === " " || event.code === "Space") return "space";
  if (key === "escape") return "escape";
  if (key === "?") return "?";
  if (key.length === 1) return `${ctrl}${key}`;
  return `${ctrl}${key}`;
}

function ShortcutEditor({
  shortcuts,
  onChange,
  onReset,
}: {
  shortcuts: ShortcutMap;
  onChange: (next: ShortcutMap) => void;
  onReset: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null);

  function handleCapture(action: ShortcutAction): void {
    setCapturing(action);
    const handler = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.removeEventListener("keydown", handler, true);
      const raw = captureKey(event);
      const next = { ...shortcuts, [action]: raw };
      // Detect conflicts with other rebindable actions.
      const conflict = REBINDABLE_ACTIONS.find(
        (other) => other !== action && next[other] === raw,
      );
      if (conflict) {
        toast.warning(t("settings.shortcutConflict", { action: t(SHORTCUT_LABEL_KEYS[conflict]) }));
      }
      onChange(next);
      setCapturing(null);
    };
    window.addEventListener("keydown", handler, true);
  }

  return (
    <div className="space-y-2">
      {REBINDABLE_ACTIONS.map((action) => (
        <div key={action} className="flex items-center justify-between gap-2">
          <span className="text-sm text-zinc-600 dark:text-zinc-300">{t(SHORTCUT_LABEL_KEYS[action])}</span>
          <button
            type="button"
            onClick={() => handleCapture(action)}
            aria-label={t("settings.rebindAria", { action: t(SHORTCUT_LABEL_KEYS[action]) })}
            className={`min-w-[72px] rounded border px-2 py-1 text-xs font-mono font-medium transition-colors ${
              capturing === action
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {capturing === action ? t("settings.pressKey") : shortcutLabel(shortcuts[action])}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="mt-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {t("settings.resetToDefaults")}
      </button>
    </div>
  );
}
