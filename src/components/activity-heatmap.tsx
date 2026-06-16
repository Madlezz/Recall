import { useMemo } from "react";
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

export function ActivityHeatmap(): JSX.Element {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Study Activity</span>
        <span className="text-xs tabular-nums text-zinc-400">
          {totalReviews} review{totalReviews !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="grid grid-flow-col gap-[3px]">
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-rows-7 gap-[3px]">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`h-[11px] w-[11px] rounded-sm ${LEVEL_COLORS[day.level]}`}
                    title={`${day.date}: ${day.count} review${day.count !== 1 ? "s" : ""}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-400">
        <span>Less</span>
        {[0, 1, 2, 3].map((lvl) => (
          <div key={lvl} className={`h-[11px] w-[11px] rounded-sm ${LEVEL_COLORS[lvl]}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}