import { Brain, Calendar, Flame, Lock, TrendingUp, Zap } from "lucide-react";
import { useStats } from "./use-stats";
import { ACHIEVEMENT_DEFS } from "@/types";

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
            {d.easy > 0 && <div className="w-full bg-blue-500/60 rounded-t-sm" style={{ height: `${(d.easy / total) * 100}%` }} title={`Easy: ${d.easy}`} />}
            {d.good > 0 && <div className="w-full bg-emerald-500/60" style={{ height: `${(d.good / total) * 100}%` }} title={`Good: ${d.good}`} />}
            {d.hard > 0 && <div className="w-full bg-amber-500/60" style={{ height: `${(d.hard / total) * 100}%` }} title={`Hard: ${d.hard}`} />}
            {d.again > 0 && <div className="w-full bg-red-500/60 rounded-b-sm" style={{ height: `${(d.again / total) * 100}%` }} title={`Again: ${d.again}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Component ──

export function Stats(): JSX.Element {
  const {
    settings,
    streak,
    level,
    title,
    dayData,
    dayRatingData,
    byHour,
    maxHour,
    totalReviews,
    totalSessions,
    ratingDist,
    totalRated,
    accuracy,
    topDecks,
  } = useStats();

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

      {/* Achievements gallery */}
      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Achievements ({settings.achievements.filter((a) => a.unlockedAt).length}/{Object.keys(ACHIEVEMENT_DEFS).length})
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(ACHIEVEMENT_DEFS).map((def, i) => {
            const earned = settings.achievements.find((a) => a.id === Object.keys(ACHIEVEMENT_DEFS)[i]);
            const unlocked = earned?.unlockedAt != null;
            return (
              <div
                key={def.title}
                className={`rounded-md border p-3 text-sm transition ${
                  unlocked ? "border-primary/30 bg-primary/5" : "border-muted bg-muted/30 opacity-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{def.icon}</span>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{def.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{def.description}</div>
                  </div>
                  {unlocked ? null : <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rating distribution */}
      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Rating Distribution</h3>
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
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Review Volume — Last 30 Days</h3>
        {totalReviews === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Start reviewing to see your activity</p>
        ) : (
          <MiniBarChart data={dayData} maxHeight={80} />
        )}
      </section>

      {/* Stacked rating chart */}
      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Daily Rating Breakdown (30 days)</h3>
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
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">When You Study</h3>
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
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Top Decks</h3>
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