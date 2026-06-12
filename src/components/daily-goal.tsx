import confetti from "canvas-confetti";
import { useEffect, useMemo, useState } from "react";
import { Target, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRecallStore } from "@/stores/recall-store";

/** Reviews done today based on reviewLogs */
function reviewsToday(reviewLogs: { reviewDate: string }[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return reviewLogs.filter((l) => l.reviewDate.slice(0, 10) === today).length;
}

export function DailyGoal(): JSX.Element {
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const goal = useRecallStore((state) => state.settings.dailyGoal);
  const [celebrated, setCelebrated] = useState(false);

  const done = useMemo(() => reviewsToday(reviewLogs), [reviewLogs]);
  const progress = goal > 0 ? Math.min(done / goal, 1) : 0;
  const achieved = progress >= 1;

  // Celebrate on goal hit — once
  useEffect(() => {
    if (achieved && !celebrated && done > 0) {
      setCelebrated(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 },
        colors: ["#22c55e", "#a855f7", "#f59e0b", "#3b82f6"],
      });
    }
  }, [achieved, celebrated, done]);

  // Reset celebration when a new day starts
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setCelebrated(false);
  }, []);

  return (
    <div className={`rounded-lg border p-5 transition-all ${achieved ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card"}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          {achieved ? <Trophy className="h-4 w-4 text-emerald-500" /> : <Target className="h-4 w-4" />}
          Daily Goal
        </h3>
        {achieved && (
          <span className="text-xs font-bold text-emerald-500 uppercase">Goal crushed! 🎉</span>
        )}
      </div>

      <div className="text-center py-1">
        <div className="text-4xl font-bold tabular-nums">
          <span className={achieved ? "text-emerald-500" : ""}>{done}</span>
          <span className="text-muted-foreground text-xl"> / {goal}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {achieved
            ? "You're on fire today!"
            : progress > 0.5
              ? `Keep going — ${goal - done} more to go!`
              : `${goal - done} cards to review today`}
        </p>
      </div>

      <Progress className="mt-3 h-2" value={progress * 100} />
    </div>
  );
}