import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { getDueForecast, type DueForecastDay } from "@/lib/stats";
import type { Card } from "@/types";

interface RetentionForecastProps {
  cards: Card[];
}

export function RetentionForecast({ cards }: RetentionForecastProps): JSX.Element {
  const forecast = useMemo(() => getDueForecast(cards, 30), [cards]);
  const maxCount = Math.max(...forecast.map((d) => d.count), 1);

  // Format date for display
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
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Due Forecast</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">
          No cards scheduled yet. Start reviewing to see your forecast.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Due Forecast</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          {totalDue} cards in next 30 days
        </span>
      </div>

      <div className="flex items-end gap-[2px] h-32">
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
                className={`w-full rounded-sm transition-all ${
                  day.count > 0
                    ? isWeekend
                      ? "bg-primary/40 hover:bg-primary/60"
                      : "bg-primary/70 hover:bg-primary"
                    : "bg-muted"
                }`}
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              {/* Show label every 7 days */}
              {i % 7 === 0 && (
                <span className="absolute -bottom-5 left-0 text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDate(day.date)}
                </span>
              )}
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                <span className="text-xs bg-popover text-popover-foreground px-2 py-1 rounded shadow whitespace-nowrap">
                  {formatDate(day.date)}: {day.count} card{day.count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's due count highlight */}
      {forecast[0].count > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm">
            <span className="font-semibold text-primary">{forecast[0].count} card{forecast[0].count !== 1 ? "s" : ""}</span>
            <span className="text-muted-foreground"> due today</span>
          </p>
        </div>
      )}
    </section>
  );
}