import { useMemo } from "react";
import { forecastDueByDay } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { Card } from "@/types";

interface WorkloadForecastProps {
  cards: Card[];
  days?: number;
}

export function WorkloadForecast({ cards, days = 30 }: WorkloadForecastProps): JSX.Element {
  const forecast = useMemo(() => forecastDueByDay(cards, days), [cards, days]);

  const totalPerDay = forecast.map((d) => d.due + d.newCount);
  const maxVal = Math.max(1, ...totalPerDay);
  const heaviestIdx = totalPerDay.indexOf(maxVal);

  // 7-day rolling average of total cards
  const avg7 = useMemo(() => {
    if (totalPerDay.length < 7) return 0;
    const sum = totalPerDay.slice(0, 7).reduce((a, b) => a + b, 0);
    return Math.round(sum / 7);
  }, [totalPerDay]);

  const totalDue = forecast.reduce((s, d) => s + d.due + d.newCount, 0);
  const totalNew = forecast.reduce((s, d) => s + d.newCount, 0);

  function formatDayLabel(dateStr: string, i: number): string {
    if (i === 0) return "Today";
    if (i === 1) return "Tomorrow";
    const d = new Date(dateStr + "T00:00:00");
    if (i < 7) return d.toLocaleDateString("en", { weekday: "short" });
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  }

  if (totalDue === 0) {
    return (
      <section>
        <h3 className="mb-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">Workload Forecast</h3>
        <p className="text-sm text-zinc-400 py-6 text-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          No cards scheduled yet. Start reviewing to see your workload forecast.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Workload Forecast</h3>
        <div className="flex items-center gap-3 text-xs tabular-nums text-zinc-400">
          <span>7-day avg: <strong className="text-zinc-700 dark:text-zinc-300">{avg7}</strong>/day</span>
          <span>Total: <strong className="text-zinc-700 dark:text-zinc-300">{totalDue}</strong></span>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Chart */}
        <div className="flex items-end gap-[2px] h-32">
          {forecast.map((day, i) => {
            const total = day.due + day.newCount;
            const duePct = (day.due / maxVal) * 100;
            const newPct = (day.newCount / maxVal) * 100;
            const isHeaviest = i === heaviestIdx && maxVal > 0;

            return (
              <div
                key={day.date}
                className="flex-1 relative group flex flex-col justify-end"
                style={{ height: "100%" }}
              >
                {/* Stacked bars */}
                <div className="w-full flex flex-col justify-end" style={{ height: "100%" }}>
                  {/* Review portion */}
                  {day.due > 0 && (
                    <div
                      className={cn(
                        "w-full transition-colors rounded-t-sm",
                        isHeaviest
                          ? "bg-amber-500 dark:bg-amber-400"
                          : "bg-zinc-500 hover:bg-zinc-600 dark:bg-zinc-400 dark:hover:bg-zinc-300",
                      )}
                      style={{ height: `${Math.max(duePct, 2)}%` }}
                    />
                  )}
                  {/* New portion (stacked on top of review) */}
                  {day.newCount > 0 && (
                    <div
                      className={cn(
                        "w-full transition-colors",
                        day.due > 0 ? "" : "rounded-t-sm",
                        isHeaviest
                          ? "bg-amber-400/70 dark:bg-amber-300/70"
                          : "bg-emerald-500/70 hover:bg-emerald-500 dark:bg-emerald-400/70 dark:hover:bg-emerald-400",
                      )}
                      style={{ height: `${Math.max(newPct, 2)}%` }}
                    />
                  )}
                  {/* Empty placeholder */}
                  {total === 0 && (
                    <div className="w-full h-[2%] rounded-sm bg-zinc-100 dark:bg-zinc-800" />
                  )}
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs whitespace-nowrap shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
                    <div className="font-medium text-zinc-800 dark:text-zinc-200">{formatDayLabel(day.date, i)}</div>
                    {day.due > 0 && <div className="text-zinc-500">{day.due} review</div>}
                    {day.newCount > 0 && <div className="text-emerald-600 dark:text-emerald-400">{day.newCount} new</div>}
                    {isHeaviest && <div className="text-amber-600 dark:text-amber-400 font-medium mt-0.5">⚡ Heaviest</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend + summary */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-zinc-500 dark:bg-zinc-400" /> Review
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70" /> New
            </span>
            {heaviestIdx >= 0 && totalPerDay[heaviestIdx] > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Heaviest
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            {totalNew > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{totalNew}</span> new
              </span>
            )}
            {forecast[0].due > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">{forecast[0].due}</span> due today
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
