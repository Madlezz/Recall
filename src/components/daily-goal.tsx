import confetti from "canvas-confetti";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { useRecallStore } from "@/stores/recall-store";
import { prefersReducedMotion, CONFETTI_COLORS } from "@/lib/xp";
import { cardSurface, typeClass } from "@/lib/surface";
import { Mascot } from "@/components/mascot";
import { cn } from "@/lib/utils";

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function reviewsToday(reviewLogs: { reviewDate: string }[]): number {
  const today = localDateStr(new Date());
  return reviewLogs.filter((l) => l.reviewDate.slice(0, 10) === today).length;
}

interface DailyGoalProps {
  variant?: "compact" | "large";
  className?: string;
}

export function DailyGoal({ variant = "compact", className }: DailyGoalProps): JSX.Element {
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

  if (variant === "large") {
    return (
      <div
        className={cn(
          cardSurface("px-6 py-6 flex flex-col justify-between relative overflow-hidden group"),
          className,
        )}
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className={cn(typeClass["label-lg"], "text-secondary font-bold")}>
                {t("dailyGoal.title")}
              </span>
              <h2 className={cn(typeClass["title-lg"], "text-text-primary mt-1")}>
                {t("dailyGoal.countLabel", { done, goal })}
              </h2>
            </div>
            <div className="bg-secondary-container p-2 rounded-xl text-on-secondary-container">
              <Star className="h-5 w-5" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-container rounded-full h-4 mt-6 mb-3 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t("dailyGoal.progressAria", { done, goal })}>
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                achieved ? "bg-review-easy" : "bg-secondary-container",
              )}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          {/* Mascot + quote */}
          <div className="flex items-center gap-2">
            <Mascot className="h-6 w-6" interactive />
            <p className="text-xs italic text-on-surface-variant">
              {achieved ? t("dailyGoal.mascotDone") : progress > 0.5 ? t("dailyGoal.mascotHalfway") : t("dailyGoal.mascotStart")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant (original)
  return (
    <div className={cn(cardSurface("px-4 py-5"), className)}>
      <span className={cn(typeClass.caption, "text-on-surface-variant tracking-[0.15em]")}>
        {t("dailyGoal.title")}
      </span>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={cn("text-3xl font-bold tabular-nums", achieved ? "text-review-easy" : "text-on-surface")}>
          {done}
        </span>
        <span className="text-lg text-outline dark:text-outline-variant">/</span>
        <span className="text-lg text-on-surface-variant tabular-nums">{goal}</span>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t("dailyGoal.progressAria", { done, goal })}>
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", achieved ? "bg-review-easy" : "bg-primary dark:bg-primary")}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <p className="mt-1.5 text-xs text-on-surface-variant">
        {achieved ? t("dailyGoal.goalCrushed") : progress > 0.5 ? t("dailyGoal.moreToGo", { count: goal - done }) : t("dailyGoal.cardsToday", { count: goal - done })}
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-outline-variant pt-3">
        <Mascot className="h-6 w-6" interactive />
        <p className="text-xs italic text-on-surface-variant">
          {achieved ? t("dailyGoal.mascotDone") : progress > 0.5 ? t("dailyGoal.mascotHalfway") : t("dailyGoal.mascotStart")}
        </p>
      </div>
    </div>
  );
}