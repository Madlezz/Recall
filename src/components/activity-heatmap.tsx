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

function getDateColor(level: number): string {
  switch (level) {
    case 0:
      return "bg-muted";
    case 1:
      return "bg-emerald-200";
    case 2:
      return "bg-emerald-400";
    case 3:
      return "bg-emerald-600";
    default:
      return "bg-muted";
  }
}

export function ActivityHeatmap(): JSX.Element {
  const reviewLogs = useRecallStore((state) => state.reviewLogs);

  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count reviews per day
    const counts = new Map<string, number>();
    reviewLogs.forEach((log) => {
      const date = new Date(log.reviewDate);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split("T")[0];
      counts.set(dateStr, (counts.get(dateStr) ?? 0) + 1);
    });

    // Build 52 weeks x 7 days grid
    const weeks: DayData[][] = [];
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364); // 52 weeks * 7 days

    let currentDate = new Date(startDate);
    for (let week = 0; week < 52; week++) {
      const weekData: DayData[] = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const count = counts.get(dateStr) ?? 0;
        weekData.push({
          date: dateStr,
          count,
          level: getLevel(count),
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(weekData);
    }

    return weeks;
  }, [reviewLogs]);

  const totalReviews = reviewLogs.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Study Activity</h3>
        <span className="text-xs text-muted-foreground">
          {totalReviews} review{totalReviews !== 1 ? "s" : ""} total
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="grid grid-flow-col gap-1">
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-rows-7 gap-1">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`h-3 w-3 rounded-sm ${getDateColor(day.level)}`}
                    title={`${day.date}: ${day.count} review${day.count !== 1 ? "s" : ""}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded-sm bg-muted" />
          <div className="h-3 w-3 rounded-sm bg-emerald-200" />
          <div className="h-3 w-3 rounded-sm bg-emerald-400" />
          <div className="h-3 w-3 rounded-sm bg-emerald-600" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
