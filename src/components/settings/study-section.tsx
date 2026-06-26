import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsCard } from "./settings-card";
import { useRecallStore } from "@/stores/recall-store";
import { toast } from "sonner";
import { optimizeFromHistory, formatOptimizationResult } from "@/services/fsrs-optimizer";

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
                  toast.success(formatOptimizationResult(result));
                } else {
                  toast.error(formatOptimizationResult(result));
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
