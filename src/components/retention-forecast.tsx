import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getDueForecast } from "@/lib/stats";
import type { Card } from "@/types";

interface RetentionForecastProps {
  cards: Card[];
}

export function RetentionForecast({ cards }: RetentionForecastProps): JSX.Element {
  const { t } = useTranslation();
  const forecast = useMemo(() => getDueForecast(cards, 30), [cards]);
  const maxCount = Math.max(...forecast.map((d) => d.count), 1);

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date();
    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return t("retentionForecast.today");
    if (diff === 1) return t("retentionForecast.tomorrow");
    if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const totalDue = forecast.reduce((sum, d) => sum + d.count, 0);

  if (totalDue === 0) {
    return (
      <section>
        <h3 className="mb-3 text-sm font-bold text-text-primary dark:text-text-primary">{t("retentionForecast.dueForecast")}</h3>
        <p className="text-sm text-on-surface-variant py-6 text-center rounded-lg border border-outline-variant bg-surface dark:border-outline-variant dark:bg-surface">
          {t("retentionForecast.noSchedule")}
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-text-primary dark:text-text-primary">{t("retentionForecast.dueForecast")}</h3>
        <span className="text-xs tabular-nums text-on-surface-variant">{t("retentionForecast.cardsIn30Days", { count: totalDue })}</span>
      </div>

      <div className="rounded-lg border border-outline-variant bg-surface p-5 dark:border-outline-variant dark:bg-surface">
        <div className="flex items-end gap-[2px] h-28" role="img" aria-label="Due forecast chart">
          {forecast.map((day, i) => {
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            const isWeekend = new Date(day.date + "T00:00:00").getDay() % 6 === 0;
            return (
              <div
                key={day.date}
                className="group relative flex-1 flex flex-col justify-end"
              >
                <div
                  className={`w-full rounded-t-sm transition-colors ${
                    day.count > 0
                      ? isWeekend
                        ? "bg-surface-container hover:bg-surface-container-low0 dark:bg-primary dark:hover:bg-surface-container"
                        : "bg-primary hover:bg-primary-hover dark:bg-surface-container dark:hover:bg-surface-container-high"
                      : "bg-surface-container dark:bg-surface-container"
                  }`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
                {i % 7 === 0 && (
                  <span className="absolute -bottom-5 left-0 text-[10px] text-on-surface-variant whitespace-nowrap">
                    {formatDate(day.date)}
                  </span>
                )}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <span className="text-xs bg-surface border border-outline-variant text-text-secondary px-2 py-1 rounded shadow-sm whitespace-nowrap dark:bg-surface-container dark:border-outline dark:text-text-secondary">
                    {formatDate(day.date)}: {t("retentionForecast.cardCount", { count: day.count })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {forecast[0].count > 0 && (
          <p className="mt-6 text-center text-sm">
            <span className="font-bold text-text-primary dark:text-text-primary">{t("retentionForecast.cardCount", { count: forecast[0].count })}</span>
            <span className="text-on-surface-variant"> {t("retentionForecast.dueToday")}</span>
          </p>
        )}
      </div>
    </section>
  );
}