import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRecallStore } from "@/stores/recall-store";

interface DayData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3;
}

function getLevel(count: number): 0 | 1 | 2 | 3 {
  if (count === 0) return 0;
  if (count <= 5) return 1;
  if (count <= 15) return 2;
  return 3;
}

const LEVEL_COLORS: Record<number, string> = {
  0: "bg-zinc-100 dark:bg-zinc-800",
  1: "bg-emerald-200 dark:bg-emerald-900/60",
  2: "bg-emerald-400 dark:bg-emerald-700",
  3: "bg-emerald-600 dark:bg-emerald-500",
};

// Opacity-based differentiation for colorblind users (works regardless of hue perception)
const LEVEL_OPACITY: Record<number, string> = {
  0: "opacity-30",
  1: "opacity-50",
  2: "opacity-75",
  3: "opacity-100",
};

export function ActivityHeatmap(): JSX.Element {
  const { t } = useTranslation();
  const reviewLogs = useRecallStore((state) => state.reviewLogs);

  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const counts = new Map<string, number>();
    reviewLogs.forEach((log) => {
      const date = new Date(log.reviewDate);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      counts.set(dateStr, (counts.get(dateStr) ?? 0) + 1);
    });

    const weeks: DayData[][] = [];
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);

    const currentDate = new Date(startDate);
    for (let week = 0; week < 52; week++) {
      const weekData: DayData[] = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
        const count = counts.get(dateStr) ?? 0;
        weekData.push({ date: dateStr, count, level: getLevel(count) });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(weekData);
    }

    return weeks;
  }, [reviewLogs]);

  const totalReviews = reviewLogs.length;

  // Calculate stats for screen readers
  const daysStudied = heatmapData.flat().filter((d) => d.count > 0).length;
  const avgPerDay = daysStudied > 0 ? Math.round(totalReviews / daysStudied) : 0;

  const longestStreak = useMemo(() => {
    let current = 0;
    let longest = 0;

    for (let i = 0; i < 365; i++) {
      const weekIdx = Math.floor(i / 7);
      const dayIdx = i % 7;
      const count = heatmapData[51 - weekIdx]?.[6 - dayIdx]?.count ?? 0;
      if (count > 0) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }
    return longest;
  }, [heatmapData]);

  return (
    <div role="region" aria-label={t("activityHeatmap.heatmapAria")}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{t("activityHeatmap.studyActivity")}</span>
        <div className="flex items-center gap-3 text-xs tabular-nums text-zinc-400">
          {longestStreak > 0 && (
            <span className="text-zinc-500 dark:text-zinc-300">
              {t("activityHeatmap.dayStreak", { count: longestStreak })}
            </span>
          )}
          <span>
            {t("activityHeatmap.reviewCount", { count: totalReviews })}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="grid grid-flow-col gap-[3px]">
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-rows-7 gap-[3px]">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`h-[11px] w-[11px] rounded-sm ${LEVEL_COLORS[day.level]} ${LEVEL_OPACITY[day.level]} ${day.level === 3 ? "ring-1 ring-emerald-600/30 dark:ring-emerald-400/30" : ""}`}
                    title={`${day.date}: ${t("activityHeatmap.reviewCount", { count: day.count })}`}
                    aria-label={`${day.date}: ${t("activityHeatmap.reviewCount", { count: day.count })}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-400">
        <span>{t("activityHeatmap.less")}</span>
        {[0, 1, 2, 3].map((lvl) => (
          <div key={lvl} className={`h-[11px] w-[11px] rounded-sm ${LEVEL_COLORS[lvl]}`} />
        ))}
        <span>{t("activityHeatmap.more")}</span>
      </div>

      {/* Screen reader summary */}
      <div className="sr-only" aria-live="polite">
        {t("activityHeatmap.srSummary", { total: totalReviews, days: daysStudied, avg: avgPerDay })}
        {longestStreak > 0 && ` ${t("activityHeatmap.srLongestStreak", { count: longestStreak })}`}
      </div>
    </div>
  );
}