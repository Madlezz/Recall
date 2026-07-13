import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { forecastDueByDay } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { Card } from "@/types";

interface WorkloadForecastProps {
  cards: Card[];
  days?: number;
}

export function WorkloadForecast({ cards, days = 30 }: WorkloadForecastProps): JSX.Element {
  const { t } = useTranslation();
  const forecast = useMemo(() => forecastDueByDay(cards, days), [cards, days]);

  const totalPerDay = forecast.map((d) => d.due + d.newCount);
  const maxVal = Math.max(1, ...totalPerDay);
  const heaviestIdx = totalPerDay.indexOf(maxVal);

  // 7-day rolling average total cards
  const avg7 = useMemo(() => {
    if (totalPerDay.length < 7) return 0;
    const sum = totalPerDay.slice(0, 7).reduce((a, b) => a + b, 0);
    return Math.round(sum / 7);
  }, [totalPerDay]);

  const totalDue = forecast.reduce((s, d) => s + d.due + d.newCount, 0);
  const totalNew = forecast.reduce((s, d) => s + d.newCount, 0);

  function formatDayLabel(dateStr: string, i: number): string {
    if (i === 0) return t("workloadForecast.today");
    if (i === 1) return t("workloadForecast.tomorrow");
    const d = new Date(dateStr + "T00:00:00");
    if (i < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  if (totalDue === 0) {
    return (
      <section>
        <h3 className="mb-3 text-sm font-bold text-text-primary dark:text-text-primary">{t("workloadForecast.title")}</h3>
        <p className="text-sm text-on-surface-variant py-6 text-center rounded-lg border border-outline-variant bg-surface dark:border-outline-variant dark:bg-surface">
          {t("workloadForecast.noSchedule")}
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-text-primary dark:text-text-primary">{t("workloadForecast.title")}</h3>
        <div className="flex items-center gap-3 text-xs tabular-nums text-on-surface-variant">
          <span>{t("workloadForecast.sevenDayAvg", { count: avg7 })}</span>
          <span>{t("workloadForecast.total", { count: totalDue })}</span>
        </div>
      </div>

      <div className="rounded-lg border border-outline-variant bg-surface p-5 dark:border-outline-variant dark:bg-surface">
        <div className="flex items-end h-32" aria-label="Workload forecast chart">
          {forecast.map((day, i) => {
            const total = day.due + day.newCount;
            const duePct = maxVal > 0 ? (day.due / maxVal) * 100 : 0;
            const newPct = maxVal > 0 ? (day.newCount / maxVal) * 100 : 0;
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
                          : "bg-primary hover:bg-primary-hover dark:bg-surface-container dark:hover:bg-surface-container-high",
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
                    <div className="w-full h-[2%] rounded-sm bg-surface-container dark:bg-surface-container" />
                  )}
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-surface border border-outline-variant rounded px-2 py-1 text-xs whitespace-nowrap shadow-sm dark:bg-surface-container dark:border-outline">
                    <div className="font-medium text-text-primary dark:text-text-primary">{formatDayLabel(day.date, i)}</div>
                    {day.due > 0 && <div className="text-on-surface-variant">{t("workloadForecast.reviewCount", { count: day.due })}</div>}
                    {day.newCount > 0 && <div className="text-emerald-600 dark:text-emerald-400">{t("workloadForecast.newCount", { count: day.newCount })}</div>}
                    {isHeaviest && <div className="text-amber-600 dark:text-amber-400 font-medium mt-0.5">{t("workloadForecast.heaviest")}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary dark:bg-surface-container" /> {t("workloadForecast.review")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70" /> {t("workloadForecast.new")}
            </span>
            {heaviestIdx >= 0 && maxVal > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> {t("workloadForecast.heaviest")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            {totalNew > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{totalNew}</span> {t("workloadForecast.new")}
              </span>
            )}
            {forecast[0].due > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-bold text-text-secondary dark:text-text-secondary tabular-nums">{forecast[0].due}</span> {t("workloadForecast.dueToday")}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}