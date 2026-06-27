import confetti from "canvas-confetti";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CONFETTI_COLORS, prefersReducedMotion } from "@/lib/xp";
import type { SessionSummary } from "@/types";

function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function SessionSummaryModal({ summary, onContinue }: { summary: SessionSummary; onContinue: () => void }): JSX.Element {
  const { t } = useTranslation();
  const total = summary.againCount + summary.hardCount + summary.goodCount + summary.easyCount;

  useEffect(() => {
      const goodScore = summary.goodCount + summary.easyCount;
      const accuracy = goodScore / (total || 1);
      if (accuracy >= 0.6 && !prefersReducedMotion()) {
        confetti({
          particleCount: accuracy >= 0.9 ? 100 : 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: [...CONFETTI_COLORS.celebration.slice(0, 4)],
        });
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire confetti once on mount
        }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") onContinue();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onContinue]);

  function ratingLabel(avg: number): string {
    if (avg >= 3.5) return t("study.easy");
    if (avg >= 2.5) return t("study.good");
    if (avg >= 1.5) return t("study.hard");
    return t("sessionSummary.againHeavy");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="session-summary-title">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <Check className="h-7 w-7 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h2 id="session-summary-title" className="mt-5 text-xl font-bold text-zinc-800 dark:text-zinc-200">{t("sessionSummary.sessionComplete")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t("sessionSummary.cardsReviewed", { count: summary.cardsStudied })}</p>
        </div>

        {summary.sessionXp > 0 && (
          <div className="mt-5 rounded-xl bg-zinc-50 px-4 py-3 text-center dark:bg-zinc-800/50">
            <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">+{summary.sessionXp} XP</div>
            <div className="text-xs text-zinc-400 mt-0.5">{t("sessionSummary.earnedThisSession")}</div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800/50">
            <div className="text-lg font-bold tabular-nums text-zinc-800 dark:text-zinc-200">{formatTime(summary.timeSpentMs)}</div>
            <div className="text-xs text-zinc-400 mt-0.5">{t("sessionSummary.timeSpent")}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800/50">
            <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{ratingLabel(summary.averageRating)}</div>
            <div className="text-xs text-zinc-400 mt-0.5">{t("sessionSummary.avgRating")}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="rounded-md bg-red-50 p-2 text-center dark:bg-red-950/30">
            <div className="font-bold text-red-600 dark:text-red-400">{summary.againCount}</div>
            <div className="text-[10px] text-red-500/70">{t("study.again")}</div>
          </div>
          <div className="rounded-md bg-amber-50 p-2 text-center dark:bg-amber-950/30">
            <div className="font-bold text-amber-600 dark:text-amber-400">{summary.hardCount}</div>
            <div className="text-[10px] text-amber-500/70">{t("study.hard")}</div>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 text-center dark:bg-emerald-950/30">
            <div className="font-bold text-emerald-600 dark:text-emerald-400">{summary.goodCount}</div>
            <div className="text-[10px] text-emerald-500/70">{t("study.good")}</div>
          </div>
          <div className="rounded-md bg-blue-50 p-2 text-center dark:bg-blue-950/30">
            <div className="font-bold text-blue-600 dark:text-blue-400">{summary.easyCount}</div>
            <div className="text-[10px] text-blue-500/70">{t("study.easy")}</div>
          </div>
        </div>

        {summary.newAchievements.length > 0 && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 dark:bg-amber-950/20 dark:border-amber-900">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-2">{t("sessionSummary.achievementUnlocked")}</p>
            <div className="space-y-2">
              {summary.newAchievements.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="text-lg">{a.icon}</span>
                  <div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">{a.title}</div>
                    <div className="text-xs text-zinc-500">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button className="mt-6 w-full" onClick={onContinue} autoFocus>{t("sessionSummary.continue")}</Button>
      </div>
    </div>
  );
}
