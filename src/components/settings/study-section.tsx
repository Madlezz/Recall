import { TrendingUp } from "lucide-react";
import { SettingsCard } from "./settings-card";
import { useRecallStore } from "@/stores/recall-store";
import { toast } from "sonner";
import { optimizeFromHistory, formatOptimizationResult } from "@/services/fsrs-optimizer";

export function StudySection(): JSX.Element {
  const settings = useRecallStore((state) => state.settings);
  const cards = useRecallStore((state) => state.cards);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const updateSettings = useRecallStore((state) => state.updateSettings);

  return (
    <>
      {/* FSRS Optimizer */}
      <section className="grid gap-4 sm:grid-cols-1">
        <SettingsCard title="FSRS Spaced Repetition Optimizer">
          <div className="space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Analyze your review history to optimize spacing intervals for better retention.
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
              Optimize from History ({reviewLogs.length} reviews)
            </button>
            {settings.fsrsWeights && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Custom weights active • Retention: {Math.round(settings.desiredRetention * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => void updateSettings({ fsrsWeights: null })}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Reset to defaults
                </button>
              </div>
            )}
          </div>
        </SettingsCard>
      </section>

      {/* Study settings */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SettingsCard title="Daily New Cards">
          <div className="flex items-center gap-2">
            <label htmlFor="daily-new-cards" className="sr-only">Daily new cards</label>
            <input
              id="daily-new-cards"
              type="number" min="0" max="100"
              value={settings.dailyNewCardLimit}
              onChange={(e) => void updateSettings({ dailyNewCardLimit: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
              className="w-20 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm text-zinc-400">cards/day</span>
          </div>
        </SettingsCard>

        <SettingsCard title="Leech Threshold">
          <div className="flex items-center gap-2">
            <label htmlFor="leech-threshold" className="sr-only">Leech threshold</label>
            <input
              id="leech-threshold"
              type="number" min="1" max="20"
              value={settings.leechThreshold}
              onChange={(e) => void updateSettings({ leechThreshold: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)) })}
              className="w-20 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm text-zinc-400">lapses</span>
          </div>
        </SettingsCard>

        <SettingsCard title="Daily Goal">
          <div className="flex items-center gap-2">
            <label htmlFor="daily-goal" className="sr-only">Daily goal</label>
            <input
              id="daily-goal"
              type="number" min="1" max="500"
              value={settings.dailyGoal}
              onChange={(e) => void updateSettings({ dailyGoal: Math.max(1, Math.min(500, parseInt(e.target.value) || 20)) })}
              className="w-20 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm text-zinc-400">cards/day</span>
          </div>
        </SettingsCard>

        <SettingsCard title="Desired Retention" description="FSRS target retention (0.70–0.99). Higher = more frequent reviews.">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="70" max="99"
              aria-label="Desired retention"
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
