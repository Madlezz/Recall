import { useMemo } from "react";
import { getDueForecast } from "@/lib/stats";
import type { Card } from "@/types";

interface RetentionForecastProps {
  cards: Card[];
}

export function RetentionForecast({ cards }: RetentionForecastProps): JSX.Element {
  const forecast = useMemo(() => getDueForecast(cards, 30), [cards]);
  const maxCount = Math.max(...forecast.map((d) => d.count), 1);

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date();
    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff < 7) return d.toLocaleDateString("en", { weekday: "short" });
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  }

  const totalDue = forecast.reduce((sum, d) => sum + d.count, 0);

  if (totalDue === 0) {
    return (
      <section>
        <h3 className="mb-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">Due Forecast</h3>
        <p className="text-sm text-zinc-400 py-6 text-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          No cards scheduled yet. Start reviewing to see your forecast.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Due Forecast</h3>
        <span className="text-xs tabular-nums text-zinc-400">{totalDue} cards in 30 days</span>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-end gap-[2px] h-28">
          {forecast.map((day, i) => {
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            const isWeekend = new Date(day.date + "T00:00:00").getDay() % 6 === 0;
            return (
              <div
                key={day.date}
                className="flex-1 relative group"
                title={`${formatDate(day.date)}: ${day.count} cards`}
              >
                <div
                  className={`w-full rounded-sm transition-colors ${
                    day.count > 0
                      ? isWeekend
                        ? "bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-600 dark:hover:bg-zinc-500"
                        : "bg-zinc-500 hover:bg-zinc-600 dark:bg-zinc-400 dark:hover:bg-zinc-300"
                      : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
                {i % 7 === 0 && (
                  <span className="absolute -bottom-5 left-0 text-[10px] text-zinc-400 whitespace-nowrap">
                    {formatDate(day.date)}
                  </span>
                )}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <span className="text-xs bg-white border border-zinc-200 text-zinc-700 px-2 py-1 rounded shadow-sm whitespace-nowrap dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300">
                    {formatDate(day.date)}: {day.count} card{day.count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {forecast[0].count > 0 && (
          <p className="mt-6 text-center text-sm">
            <span className="font-bold text-zinc-800 dark:text-zinc-200">{forecast[0].count} card{forecast[0].count !== 1 ? "s" : ""}</span>
            <span className="text-zinc-500"> due today</span>
          </p>
        )}
      </div>
    </section>
  );
}