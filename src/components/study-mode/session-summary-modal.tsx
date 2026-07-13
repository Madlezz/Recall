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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="session-summary-title">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl dark:bg-surface max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container dark:bg-surface-container">
            <Check className="h-7 w-7 text-on-surface-variant" />
          </div>
          <h2 id="session-summary-title" className="mt-5 text-xl font-bold text-text-primary">{t("sessionSummary.sessionComplete")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("sessionSummary.cardsReviewed", { count: summary.cardsStudied })}</p>
        </div>

        {summary.sessionXp > 0 && (
          <div className="mt-5 rounded-xl bg-surface-container-low px-4 py-3 text-center dark:bg-surface-container">
            <div className="text-2xl font-bold text-text-primary">+{summary.sessionXp} XP</div>
            <div className="text-xs text-on-surface-variant mt-0.5">{t("sessionSummary.earnedThisSession")}</div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface-container-low p-3 text-center dark:bg-surface-container">
            <div className="text-lg font-bold tabular-nums text-text-primary">{formatTime(summary.timeSpentMs)}</div>
            <div className="text-xs text-on-surface-variant mt-0.5">{t("sessionSummary.timeSpent")}</div>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3 text-center dark:bg-surface-container">
            <div className="text-lg font-bold text-text-primary">{ratingLabel(summary.averageRating)}</div>
            <div className="text-xs text-on-surface-variant mt-0.5">{t("sessionSummary.avgRating")}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="rounded-md bg-review-again/10 p-2 text-center dark:bg-review-again/20">
            <div className="font-bold text-review-again">{summary.againCount}</div>
            <div className="text-[10px] text-review-again/70">{t("study.again")}</div>
          </div>
          <div className="rounded-md bg-review-hard/10 p-2 text-center dark:bg-review-hard/20">
            <div className="font-bold text-review-hard">{summary.hardCount}</div>
            <div className="text-[10px] text-review-hard/70">{t("study.hard")}</div>
          </div>
          <div className="rounded-md bg-review-good/10 p-2 text-center dark:bg-review-good/20">
            <div className="font-bold text-review-good">{summary.goodCount}</div>
            <div className="text-[10px] text-review-good/70">{t("study.good")}</div>
          </div>
          <div className="rounded-md bg-review-easy/10 p-2 text-center dark:bg-review-easy/20">
            <div className="font-bold text-review-easy">{summary.easyCount}</div>
            <div className="text-[10px] text-review-easy/70">{t("study.easy")}</div>
          </div>
        </div>

        {summary.newAchievements.length > 0 && (
          <div className="mt-4 rounded-xl bg-secondary-container border border-secondary-container p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-on-secondary-container mb-2">{t("sessionSummary.achievementUnlocked")}</p>
            <div className="space-y-2">
              {summary.newAchievements.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="text-lg">{a.icon}</span>
                  <div>
                    <div className="font-semibold text-text-primary">{a.title}</div>
                    <div className="text-xs text-on-surface-variant">{a.description}</div>
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
