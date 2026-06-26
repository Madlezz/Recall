import { Brain, Calendar, Flame, Lock, TrendingUp, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStats } from "./use-stats";
import { ACHIEVEMENT_DEFS } from "@/types";
import { WorkloadForecast } from "@/components/workload-forecast";

// ── Stat tile ──

function StatTile({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900" role="group" aria-label={label}>
      <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums text-zinc-800 dark:text-zinc-200" aria-label={`${label}: ${value}`}>{value}</div>
    </div>
  );
}

// ── Rating bar ──

function RatingBar({ color, label, count, total }: { color: string; label: string; count: number; total: number }): JSX.Element {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3" role="group" aria-label={`${label}: ${count} reviews (${pct}%)`}>
      <span className="text-xs font-medium w-12 text-zinc-500">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums w-16 text-right text-zinc-400">{count} ({pct}%)</span>
    </div>
  );
}

// ── MiniBarChart ──

function MiniBarChart({ data, maxHeight = 64 }: { data: number[]; maxHeight?: number }): JSX.Element {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-[2px]" style={{ height: maxHeight }}>
      {data.map((val, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-zinc-300 hover:bg-zinc-400 transition-colors dark:bg-zinc-600 dark:hover:bg-zinc-500"
          style={{ height: `${Math.max(2, (val / max) * 100)}%` }}
          title={`${val} reviews`}
        />
      ))}
    </div>
  );
}

// ── StackedBarChart ──

function StackedBarChart({ data }: { data: { again: number; hard: number; good: number; easy: number }[] }): JSX.Element {
  const max = Math.max(1, ...data.map((d) => d.again + d.hard + d.good + d.easy));
  return (
    <div className="flex items-end gap-[2px] h-20">
      {data.map((d, i) => {
        const total = d.again + d.hard + d.good + d.easy;
        const pct = (total / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col justify-end" style={{ height: `${Math.max(2, pct)}%` }}>
            {d.easy > 0 && <div className="w-full bg-blue-500/70 rounded-t-sm" style={{ height: `${(d.easy / total) * 100}%` }} title={`Easy: ${d.easy}`} />}
            {d.good > 0 && <div className="w-full bg-emerald-500/70" style={{ height: `${(d.good / total) * 100}%` }} title={`Good: ${d.good}`} />}
            {d.hard > 0 && <div className="w-full bg-amber-500/70" style={{ height: `${(d.hard / total) * 100}%` }} title={`Hard: ${d.hard}`} />}
            {d.again > 0 && <div className="w-full bg-red-500/70 rounded-b-sm" style={{ height: `${(d.again / total) * 100}%` }} title={`Again: ${d.again}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── RetentionCurve ──

function RetentionCurve({ data }: { data: number[] }): JSX.Element {
  const { t } = useTranslation();
  // Filter out days with no data (-1)
  const validData = data.filter((v) => v >= 0);
  const height = 80;
  const width = 100; // percentage

  if (validData.length === 0) {
    return <p className="text-sm text-zinc-400">{t("stats.notEnoughData")}</p>;
  }

  const maxVal = 100;
  const minVal = 50; // Start y-axis at 50% for better visibility
  const range = maxVal - minVal;

  return (
    <div className="relative" style={{ height }}>
      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Grid lines */}
        {[50, 70, 90].map((y) => {
          const yPos = height - ((y - minVal) / range) * height;
          return (
            <line
              key={y}
              x1="0"
              y1={yPos}
              x2={width}
              y2={yPos}
              stroke="rgb(113 113 122 / 0.2)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Retention curve */}
        {validData.length > 1 && (
          <path
            d={validData
              .map((val, i) => {
                const x = (i / (validData.length - 1)) * width;
                const clampedVal = Math.max(minVal, Math.min(maxVal, val));
                const y = height - ((clampedVal - minVal) / range) * height;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgb(16 185 129)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 text-[10px] text-zinc-400">100%</div>
      <div className="absolute left-0 bottom-0 text-[10px] text-zinc-400">50%</div>
    </div>
  );
}

// ── Component ──

export function Stats(): JSX.Element {
  const { t } = useTranslation();
  const {
    settings,
    streak,
    level,
    title,
    dayData,
    dayRatingData,
    retentionData,
    byHour,
    maxHour,
    totalReviews,
    totalSessions,
    ratingDist,
    totalRated,
    accuracy,
    topDecks,
    cards,
  } = useStats();

  return (
    <div className="animate-fade-in space-y-10">
      {/* Header */}
      <section>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">{t("stats.analytics")}</p>
        <h1 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">{t("stats.title")}</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {t("stats.headerDescription")}
        </p>
      </section>

      {/* Overview */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Flame} label={t("stats.streak")} value={t("stats.streakDays", { count: streak })} />
        <StatTile icon={Zap} label={t("stats.totalReviews")} value={String(totalReviews)} />
        <StatTile icon={Calendar} label={t("stats.sessions")} value={String(totalSessions)} />
        <StatTile icon={TrendingUp} label={t("stats.accuracy")} value={`${accuracy}%`} />
      </section>

      {/* Level + XP */}
      <section className="flex items-center gap-5 rounded-lg border border-zinc-200 bg-white px-5 py-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <Brain className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
        </div>
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">{t("stats.level", { level })}</span>
          <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{t("stats.xpTotal", { count: settings.xp.toLocaleString() })}</p>
        </div>
      </section>

      {/* Achievements */}
      <section>
        <h3 className="mb-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">
          {t("stats.achievements")}{" "}
          <span className="font-normal text-zinc-400">
            ({settings.achievements.filter((a) => a.unlockedAt).length}/{Object.keys(ACHIEVEMENT_DEFS).length})
          </span>
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(ACHIEVEMENT_DEFS).map((def, i) => {
            const earned = settings.achievements.find((a) => a.id === Object.keys(ACHIEVEMENT_DEFS)[i]);
            const unlocked = earned?.unlockedAt != null;
            return (
              <div
                key={def.title}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  unlocked
                    ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                    : "border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-600"
                }`}
              >
                <span className="text-lg">{def.icon}</span>
                <div className="min-w-0">
                  <div className="font-semibold truncate text-zinc-800 dark:text-zinc-200">{def.title}</div>
                  <div className="text-xs line-clamp-1">{def.description}</div>
                </div>
                {unlocked ? null : <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-300 dark:text-zinc-600" />}
              </div>
            );
          })}
        </div>
      </section>

      {/* Rating distribution */}
      {totalRated > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">{t("stats.ratingDistribution")}</h3>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="space-y-4">
              <RatingBar color="bg-red-500" label={t("study.again")} count={ratingDist.again} total={totalRated} />
              <RatingBar color="bg-amber-500" label={t("study.hard")} count={ratingDist.hard} total={totalRated} />
              <RatingBar color="bg-emerald-500" label={t("study.good")} count={ratingDist.good} total={totalRated} />
              <RatingBar color="bg-blue-500" label={t("study.easy")} count={ratingDist.easy} total={totalRated} />
            </div>
          </div>
        </section>
      )}

      {/* Review volume */}
      {totalReviews > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">{t("stats.reviewsLast30Days")}</h3>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <MiniBarChart data={dayData} maxHeight={80} />
          </div>
        </section>
      )}

      {/* Rating breakdown */}
      {totalReviews > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">{t("stats.dailyRatingBreakdown")}</h3>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <StackedBarChart data={dayRatingData} />
            <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-500/70" /> {t("study.again")}</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500/70" /> {t("study.hard")}</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70" /> {t("study.good")}</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500/70" /> {t("study.easy")}</span>
            </div>
          </div>
        </section>
      )}

      {/* Retention curve */}
      {totalReviews > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {t("stats.retentionOverTime")}
            <span className="ml-2 text-xs font-normal text-zinc-400">{t("stats.sevenDayRolling")}</span>
          </h3>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <RetentionCurve data={retentionData} />
            <p className="mt-3 text-xs text-zinc-400">
              {t("stats.retentionDescription")}
            </p>
          </div>
        </section>
      )}

      {/* Time-of-day heatmap */}
      {totalReviews > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">{t("stats.whenYouStudy")}</h3>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="space-y-1">
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                {byHour.map((count, h) => (
                  <div key={h} className="group relative">
                    <div
                      className="h-8 rounded-sm transition-colors"
                      style={{
                        backgroundColor:
                          count === 0
                            ? "rgb(100 100 100 / 0.08)"
                            : `rgba(82, 82, 91, ${0.15 + (count / maxHour) * 0.85})`,
                      }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-white border border-zinc-200 rounded px-2 py-1 text-xs whitespace-nowrap z-10 shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
                      {h}:00 — {t("stats.reviewCount", { count })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 mt-2">
                <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Workload forecast */}
      <WorkloadForecast cards={cards} />

      {/* Top decks */}
      {topDecks.length > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">{t("stats.topDecks")}</h3>
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
            {topDecks.map(({ name, count }) => (
              <div key={name} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{name}</span>
                <span className="text-zinc-400 tabular-nums">{t("stats.reviewCount", { count })}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}