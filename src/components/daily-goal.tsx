import confetti from "canvas-confetti";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRecallStore } from "@/stores/recall-store";
import { prefersReducedMotion, CONFETTI_COLORS } from "@/lib/xp";

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
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">{t("dailyGoal.title")}</span>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={achieved ? "text-3xl font-bold tabular-nums text-emerald-600" : "text-3xl font-bold tabular-nums text-zinc-800 dark:text-zinc-200"}
        >
          {done}
        </span>
        <span className="text-lg text-zinc-300 dark:text-zinc-600">/</span>
        <span className="text-lg text-zinc-400 tabular-nums">{goal}</span>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t("dailyGoal.progressAria", { done, goal })}>
        <div
          className={achieved ? "h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out" : "h-full rounded-full bg-zinc-700 transition-[width] duration-700 ease-out dark:bg-zinc-300"}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <p className="mt-1.5 text-xs text-zinc-400">
        {achieved ? t("dailyGoal.goalCrushed") : progress > 0.5 ? t("dailyGoal.moreToGo", { count: goal - done }) : t("dailyGoal.cardsToday", { count: goal - done })}
      </p>
    </div>
  );
}
