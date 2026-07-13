import confetti from "canvas-confetti";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRecallStore } from "@/stores/recall-store";
import { prefersReducedMotion, CONFETTI_COLORS } from "@/lib/xp";
import { cardSurface } from "@/lib/surface";
import { Mascot } from "@/components/mascot";

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function reviewsToday(reviewLogs: { reviewDate: string }[]): number {
  const today = localDateStr(new Date());
  return reviewLogs.filter((l) => l.reviewDate.slice(0, 10) === today).length;
}

export function DailyGoal(): JSX.Element {
  const { t } = useTranslation();
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const goal = useRecallStore((state) => state.settings.dailyGoal);
  const [celebrated, setCelebrated] = useState(false);

  const done = useMemo(() => reviewsToday(reviewLogs), [reviewLogs]);
  const progress = goal > 0 ? Math.min(done / goal, 1) : 0;
  const achieved = progress >= 1;

  useEffect(() => {
    if (achieved && !celebrated && done > 0) {
      setCelebrated(true);
      if (!prefersReducedMotion()) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5 },
          colors: [...CONFETTI_COLORS.daily],
        });
      }
    }
    if (!achieved && celebrated) {
      setCelebrated(false);
    }
  }, [achieved, celebrated, done]);

  return (
    <div className={cardSurface("px-4 py-5")}>
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">{t("dailyGoal.title")}</span>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={achieved ? "text-3xl font-bold tabular-nums text-review-easy" : "text-3xl font-bold tabular-nums text-on-surface"}
        >
          {done}
        </span>
        <span className="text-lg text-outline dark:text-outline-variant">/</span>
        <span className="text-lg text-on-surface-variant tabular-nums">{goal}</span>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t("dailyGoal.progressAria", { done, goal })}>
        <div
          className={achieved ? "h-full rounded-full bg-review-easy transition-[width] duration-700 ease-out" : "h-full rounded-full bg-primary transition-[width] duration-700 ease-out dark:bg-primary"}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <p className="mt-1.5 text-xs text-on-surface-variant">
        {achieved ? t("dailyGoal.goalCrushed") : progress > 0.5 ? t("dailyGoal.moreToGo", { count: goal - done }) : t("dailyGoal.cardsToday", { count: goal - done })}
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-outline-variant pt-3">
        <Mascot className="h-6 w-6" />
        <p className="text-xs italic text-on-surface-variant">
          {achieved ? t("dailyGoal.mascotDone") : progress > 0.5 ? t("dailyGoal.mascotHalfway") : t("dailyGoal.mascotStart")}
        </p>
      </div>
    </div>
  );
}