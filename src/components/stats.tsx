import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { BookOpen, Brain, Calendar, Clock, Flame, TrendingUp, Zap } from "lucide-react";
import { useRecallStore } from "@/stores/recall-store";
import { getStudyStreak } from "@/lib/streak";
import { getLevel, getLevelTitle, levelProgress } from "@/lib/xp";
import type { ReviewLog, ReviewRating } from "@/types";

// ── Helpers ──

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
  }
  return days;
}

function reviewsByDay(logs: ReviewLog[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const log of logs) {
    const day = log.reviewDate.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return map;
}

function ratingsByDay(logs: ReviewLog[]): Map<string, { again: number; hard: number; good: number; easy: number }> {
  const map = new Map<string, { again: number; hard: number; good: number; easy: number }>();
  for (const log of logs) {
    const day = log.reviewDate.slice(0, 10);
    const entry = map.get(day) ?? { again: 0, hard: 0, good: 0, easy: 0 };
    entry[log.rating]++;
    map.set(day, entry);
  }
  return map;
}

function reviewsByHour(logs: ReviewLog[]): number[] {
  const hours = new Array(24).fill(0) as number[];
  for (const log of logs) {
    const h = new Date(log.reviewDate).getHours();
    hours[h]++;
  }
  return hours;
}

function deckReviewCounts(logs: ReviewLog[], cards: { id: string; deckId: string }[]): Map<string, number> {
  const cardDeck = new Map(cards.map((c) => [c.id, c.deckId]));
  const map = new Map<string, number>();
  for (const log of logs) {
    const deckId = cardDeck.get(log.cardId);
    if (deckId) map.set(deckId, (map.get(deckId) ?? 0) + 1);
  }
  return map;
}

// ── Sparkline / Mini Bar Chart ──

function MiniBarChart({ data, maxHeight = 60 }: { data: number[]; maxHeight?: number }): JSX.Element {
  const max = Math.max(1, ...data);

  return (
    <div className="flex items-end gap-[2px] h-full" style={{ height: maxHeight }}>
      {data.map((val, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-primary/60 hover:bg-primary transition-colors min-w-[4px]"
          style={{ height: `${Math.max(2, (val / max) * 100)}%` }}
          title={`${val} reviews`}
        />
      ))}
    </div>
  );
}

function StackedBarChart({ data }: { data: { again: number; hard: number; good: number; easy: number }[] }): JSX.Element {
  const max = Math.max(1, ...data.map((d) => d.again + d.hard + d.good + d.easy));

  return (
    <div className="flex items-end gap-[2px] h-[80px]">
      {data.map((d, i) => {
        const total = d.again + d.hard + d.good + d.easy;
        const pct = (total / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col justify-end min-w-[6px]" style={{ height: `${Math.max(2, pct)}%` }}>
            {d.easy > 0 && (
              <div
                className="w-full bg-blue-500/60 rounded-t-sm"
                style={{ height: `${(d.easy / total) * 100}%` }}
                title={`Easy: ${d.easy}`}
              />
            )}
            {d.good > 0 && (
              <div
                className="w-full bg-emerald-500/60"
                style={{ height: `${(d.good / total) * 100}%` }}
                title={`Good: ${d.good}`}
              />
            )}
            {d.hard > 0 && (
              <div
                className="w-full bg-amber-500/60"
                style={{ height: `${(d.hard / total) * 100}%` }}
                title={`Hard: ${d.hard}`}
              />
            )}
            {d.again > 0 && (
              <div
                className="w-full bg-red-500/60 rounded-b-sm"
                style={{ height: `${(d.again / total) * 100}%` }}
                title={`Again: ${d.again}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Component ──

export function Stats(): JSX.Element {
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const cards = useRecallStore((state) => state.cards);
  const decks = useRecallStore((state) => state.decks);
  const settings = useRecallStore((state) => state.settings);
  const studySessions = useRecallStore((state) => state.studySessions);

  const streak = getStudyStreak(reviewLogs);
  const level = getLevel(settings.xp);
  const title = getLevelTitle(level);

  const days = useMemo(() => lastNDays(30), []);
  const byDay = useMemo(() => reviewsByDay(reviewLogs), [reviewLogs]);
  const byDayRatings = useMemo(() => ratingsByDay(reviewLogs), [reviewLogs]);
  const byHour = useMemo(() => reviewsByHour(reviewLogs), [reviewLogs]);
  const deckCounts = useMemo(() => deckReviewCounts(reviewLogs, cards), [reviewLogs, cards]);

  const dayData = useMemo(() => days.map((d) => byDay.get(d) ?? 0), [days, byDay]);
  const dayRatingData = useMemo(
    () =>
      days.map((d) => {
        const r = byDayRatings.get(d);
        return r ?? { again: 0, hard: 0, good: 0, easy: 0 };
      }),
    [days, byDayRatings],
  );

  const totalReviews = reviewLogs.length;
  const maxHour = Math.max(1, ...byHour);
  const totalSessions = studySessions.length;

  // Overall rating distribution
  const ratingDist = useMemo(() => {
    let again = 0, hard = 0, good = 0, easy = 0;
    for (const log of reviewLogs) {
      if (log.rating === "again") again++;
      else if (log.rating === "hard") hard++;
      else if (log.rating === "good") good++;
      else easy++;
    }
    return { again, hard, good, easy };
  }, [reviewLogs]);

  const totalRated = ratingDist.again + ratingDist.hard + ratingDist.good + ratingDist.easy;
  const accuracy = totalRated > 0 ? Math.round(((ratingDist.good + ratingDist.easy) / totalRated) * 100) : 0;

  // Top decks by review count
  const topDecks = useMemo(() => {
    return [...deckCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([deckId, count]) => {
        const deck = decks.find((d) => d.id === deckId);
        return { name: deck?.name ?? "Unknown Deck", count };
      });
  }, [deckCounts, decks]);

  return (
    <div className="animate-fade-in space-y-8">
      <section>
        <p className="text-sm font-medium text-primary">Analytics</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Stats</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Your learning journey, quantified. All data stays on your machine.
        </p>
      </section>

      {/* Overview tiles */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Flame} label="Current Streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
        <StatCard icon={Zap} label="Total Reviews" value={String(totalReviews)} />
        <StatCard icon={Calendar} label="Study Sessions" value={String(totalSessions)} />
        <StatCard icon={TrendingUp} label="Accuracy" value={`${accuracy}%`} />
      </section>

      {/* Level card */}
      <section className="rounded-lg border bg-gradient-to-r from-primary/5 to-transparent p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Level {level}</p>
            <h3 className="text-2xl font-bold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{settings.xp} XP total</p>
          </div>
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="h-7 w-7 text-primary" />
          </div>
        </div>
      </section>

      {/* Rating distribution */}
      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Rating Distribution
        </h3>
        {totalRated === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Start reviewing to see your rating breakdown</p>
        ) : (
          <div className="space-y-3">
            <RatingBar color="bg-red-500" label="Again" count={ratingDist.again} total={totalRated} />
            <RatingBar color="bg-amber-500" label="Hard" count={ratingDist.hard} total={totalRated} />
            <RatingBar color="bg-emerald-500" label="Good" count={ratingDist.good} total={totalRated} />
            <RatingBar color="bg-blue-500" label="Easy" count={ratingDist.easy} total={totalRated} />
          </div>
        )}
      </section>

      {/* Review volume (last 30 days) */}
      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Review Volume — Last 30 Days
        </h3>
        {totalReviews === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Start reviewing to see your activity</p>
        ) : (
          <MiniBarChart data={dayData} maxHeight={80} />
        )}
      </section>

      {/* Stacked rating chart */}
      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Daily Rating Breakdown (30 days)
        </h3>
        {totalReviews === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Start reviewing to see rating trends</p>
        ) : (
          <>
            <StackedBarChart data={dayRatingData} />
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-500/60" /> Again</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500/60" /> Hard</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/60" /> Good</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500/60" /> Easy</span>
            </div>
          </>
        )}
      </section>

      {/* Time-of-day heatmap */}
      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          When You Study
        </h3>
        {totalReviews === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Start reviewing to see your study patterns</p>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-24 gap-[2px]">
              {byHour.map((count, h) => (
                <div key={h} className="group relative">
                  <div
                    className="h-8 rounded-sm transition-colors"
                    style={{
                      backgroundColor: count === 0
                        ? "rgb(100 100 100 / 0.1)"
                        : `rgba(139, 92, 246, ${0.15 + (count / maxHour) * 0.85})`,
                    }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                    {h}:00 — {count} review{count === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
              <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
            </div>
          </div>
        )}
      </section>

      {/* Top decks */}
      {topDecks.length > 0 && (
        <section className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Top Decks
          </h3>
          <div className="space-y-2">
            {topDecks.map(({ name, count }) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground">{count} review{count === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ──

function StatCard({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function RatingBar({ color, label, count, total }: { color: string; label: string; count: number; total: number }): JSX.Element {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium w-12 text-muted-foreground">{label}</span>
      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums w-16 text-right text-muted-foreground">{count} ({pct}%)</span>
    </div>
  );
}