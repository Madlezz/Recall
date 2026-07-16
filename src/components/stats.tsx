import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Flame, Zap, Library, TrendingUp, X } from "lucide-react";
import { RetentionForecast } from "@/components/retention-forecast";
import { WorkloadForecast } from "@/components/workload-forecast";
import { cardSurface, typeClass } from "@/lib/surface";
import { getDeckStats, getStudyStreak } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function Stats(): JSX.Element {
  const { t } = useTranslation();
  const cards = useRecallStore((state) => state.cards);
  const decks = useRecallStore((state) => state.decks);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const showDashboard = useRecallStore((state) => state.showDashboard);

  const totalCards = cards.length;
  const streak = useMemo(() => getStudyStreak(reviewLogs), [reviewLogs]);
  const retention = useMemo(() => {
    if (reviewLogs.length === 0) return 0;
    const good = reviewLogs.filter((l) => l.rating === "good" || l.rating === "easy").length;
    return Math.round((good / reviewLogs.length) * 100);
  }, [reviewLogs]);

  const last7Days = useMemo(() => {
    const days: { date: string; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = localDateStr(d);
      const label = i === 0 ? t("stats.today") : d.toLocaleDateString(undefined, { weekday: "short" });
      days.push({ date: dateStr, label, count: 0 });
    }
    for (const log of reviewLogs) {
      const date = log.reviewDate.slice(0, 10);
      const day = days.find((d) => d.date === date);
      if (day) day.count++;
    }
    return days;
  }, [reviewLogs, t]);

  const maxCount = Math.max(...last7Days.map((d) => d.count), 1);

  const breakdown = useMemo(() => {
    const again = reviewLogs.filter((l) => l.rating === "again").length;
    const hard = reviewLogs.filter((l) => l.rating === "hard").length;
    const good = reviewLogs.filter((l) => l.rating === "good").length;
    const easy = reviewLogs.filter((l) => l.rating === "easy").length;
    const total = reviewLogs.length || 1;
    return { again, hard, good, easy, total };
  }, [reviewLogs]);

  return (
    <div className="animate-fade-in max-w-[1152px] mx-auto px-gutter-mobile py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className={cn(typeClass.display, "text-2xl font-bold text-text-primary")}>
          {t("stats.title")}
        </h1>
        <button
          onClick={showDashboard}
          className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
          aria-label={t("common.close")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Library} label={t("stats.totalCards")} value={String(totalCards)} />
        <StatCard icon={Zap} label={t("stats.retention")} value={`${retention}%`} />
        <StatCard icon={Flame} label={t("streak.title")} value={String(streak)} className="col-span-2 md:col-span-1" />
      </div>

      <div className={cardSurface("p-5 mb-6")}>
        <h2 className="font-title-md text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {t("stats.reviewActivity")}
        </h2>
        <div className="flex items-end gap-2 h-32">
          {last7Days.map((day, i) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className={cn(typeClass.caption, "text-on-surface-variant tabular-nums")}>{day.count}</span>
              <div
                className={cn("w-full rounded-t-md transition-all duration-500", i === 6 ? "bg-secondary-container" : "bg-primary-soft")}
                style={{ height: `${(day.count / maxCount) * 100}%`, minHeight: day.count > 0 ? 4 : 0 }}
              />
              <span className={cn(typeClass.caption, "mt-1", i === 6 ? "text-secondary font-semibold" : "text-outline")}>
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={cardSurface("p-5 mb-6")}>
        <h2 className="font-title-md text-lg font-semibold text-text-primary mb-4">
          {t("stats.retentionBreakdown")}
        </h2>
        <div className="flex h-6 rounded-full overflow-hidden">
          {breakdown.easy > 0 && <div className="bg-review-easy h-full" style={{ width: `${(breakdown.easy / breakdown.total) * 100}%` }} />}
          {breakdown.good > 0 && <div className="bg-review-good h-full" style={{ width: `${(breakdown.good / breakdown.total) * 100}%` }} />}
          {breakdown.hard > 0 && <div className="bg-review-hard h-full" style={{ width: `${(breakdown.hard / breakdown.total) * 100}%` }} />}
          {breakdown.again > 0 && <div className="bg-review-again h-full" style={{ width: `${(breakdown.again / breakdown.total) * 100}%` }} />}
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <Legend color="bg-review-easy" label={t("stats.easy")} />
          <Legend color="bg-review-good" label={t("stats.good")} />
          <Legend color="bg-review-hard" label={t("stats.hard")} />
          <Legend color="bg-review-again" label={t("stats.again")} />
        </div>
      </div>

      <div className={cardSurface("p-5 mb-6")}>
        <h2 className="font-title-md text-lg font-semibold text-text-primary mb-4">
          {t("stats.deckMastery")}
        </h2>
        <div className="space-y-4">
          {decks.map((deck) => {
            const stats = getDeckStats(deck, cards);
            const pct = stats.total === 0 ? 0 : Math.round((stats.mastered / stats.total) * 100);
            return (
              <div key={deck.id} className="flex items-center gap-4">
                <div className="relative w-12 h-12 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-surface-container" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-review-good" strokeDasharray={`${pct * 0.94} 94`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-text-primary">{pct}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(typeClass["label-lg"], "text-text-primary truncate")}>{deck.name}</p>
                  <p className="text-xs text-outline">{t("stats.cardsMastered", { mastered: stats.mastered, total: stats.total })}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-title-md text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t("stats.reviewForecast")}
        </h2>
        <RetentionForecast cards={cards} />
      </div>

      <div className="mb-6">
        <WorkloadForecast cards={cards} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, className }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn(cardSurface("p-4 rounded-xl"), className)}>
      <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums text-text-primary">{value}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2.5 h-2.5 rounded-full", color)} />
      <span className="text-on-surface-variant">{label}</span>
    </div>
  );
}