import confetti from "canvas-confetti";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AchievementDetail } from "@/components/achievement-detail";
import { useRecallStore } from "@/stores/recall-store";
import { getStudyStreak } from "@/lib/streak";
import { CONFETTI_COLORS, prefersReducedMotion } from "@/lib/xp";
import type { SessionSummary } from "@/types";

function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function SessionSummaryModal({ summary, onContinue }: { summary: SessionSummary; onContinue: () => void }): JSX.Element {
  const { t } = useTranslation();
  const total = summary.againCount + summary.hardCount + summary.goodCount + summary.easyCount;
  const [achievementIndex, setAchievementIndex] = useState(0);
  const newAchievements = summary.newAchievements;
  const showDashboard = useRecallStore((s) => s.showDashboard);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const streak = useMemo(() => getStudyStreak(reviewLogs), [reviewLogs]);
  const accuracy = total > 0 ? Math.round(((summary.goodCount + summary.easyCount) / total) * 100) : 0;

  useEffect(() => {
      const goodScore = summary.goodCount + summary.easyCount;
      const acc = goodScore / (total || 1);
      if (acc >= 0.6 && !prefersReducedMotion()) {
        confetti({
          particleCount: acc >= 0.9 ? 100 : 50,
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

  // Show achievement detail if there are unlocked achievements
  if (newAchievements.length > 0 && achievementIndex < newAchievements.length) {
    return (
      <AchievementDetail
        achievement={newAchievements[achievementIndex]}
        onContinue={() => setAchievementIndex((i) => i + 1)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="session-summary-title">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl dark:bg-surface max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container dark:bg-surface-container">
            <Check className="h-7 w-7 text-on-surface-variant" />
          </div>
          <h2 id="session-summary-title" className="mt-5 text-xl font-bold text-text-primary">{t("sessionSummary.todaysWin")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {streak > 0 ? t("sessionSummary.streakHeld", { count: streak }) : t("sessionSummary.cardsReviewed", { count: summary.cardsStudied })}
          </p>
        </div>

        {summary.sessionXp > 0 && (
          <div className="mt-5 rounded-xl bg-surface-container-low px-4 py-3 text-center dark:bg-surface-container">
            <div className="text-2xl font-bold text-text-primary">+{summary.sessionXp} XP</div>
            <div className="text-xs text-on-surface-variant mt-0.5">{t("sessionSummary.earnedThisSession")}</div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-surface-container-low p-3 text-center dark:bg-surface-container">
            <div className="text-lg font-bold tabular-nums text-text-primary">{summary.cardsStudied}</div>
            <div className="text-xs text-on-surface-variant mt-0.5">{t("sessionSummary.cardsReviewed", { count: 0 })}</div>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3 text-center dark:bg-surface-container">
            <div className="text-lg font-bold tabular-nums text-text-primary">{formatTime(summary.timeSpentMs)}</div>
            <div className="text-xs text-on-surface-variant mt-0.5">{t("sessionSummary.timeSpent")}</div>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3 text-center dark:bg-surface-container">
            <div className="text-lg font-bold text-text-primary">{accuracy}%</div>
            <div className="text-xs text-on-surface-variant mt-0.5">{t("sessionSummary.accuracy")}</div>
          </div>
        </div>

        {/* Rating distribution with animated bars */}
        <div className="mt-4 space-y-2">
          {[
            { label: t("study.again"), count: summary.againCount, color: "bg-review-again", textColor: "text-review-again" },
            { label: t("study.hard"), count: summary.hardCount, color: "bg-review-hard", textColor: "text-review-hard" },
            { label: t("study.good"), count: summary.goodCount, color: "bg-review-good", textColor: "text-review-good" },
            { label: t("study.easy"), count: summary.easyCount, color: "bg-review-easy", textColor: "text-review-easy" },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <span className={`w-12 text-right text-xs font-semibold ${r.textColor}`}>{r.count}</span>
              <span className="w-10 text-xs text-on-surface-variant">{r.label}</span>
              <div className="flex-1 h-2 rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className={`h-full rounded-full ${r.color} transition-all duration-700 ease-out`}
                  style={{ width: `${(r.count / (total || 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
            onClick={showDashboard}
          >
            {t("sessionSummary.backToDashboard")}
          </button>
          <button
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
            onClick={onContinue}
            autoFocus
          >
            {t("sessionSummary.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
