import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { useRecallStore } from "@/stores/recall-store";
import type { ReviewLog } from "@/types";

/** Count reviews per day from logs */
function getReviewCounts(logs: ReviewLog[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const log of logs) {
    const day = log.reviewDate.slice(0, 10); // YYYY-MM-DD
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return map;
}

function intensityClass(count: number, max: number): string {
  if (count === 0) return "";
  const ratio = max > 0 ? count / max : 0;
  if (ratio <= 0.25) return "bg-primary/15";
  if (ratio <= 0.5) return "bg-primary/30";
  if (ratio <= 0.75) return "bg-primary/50";
  return "bg-primary/70";
}

export function ReviewCalendar(): JSX.Element {
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const counts = useMemo(() => getReviewCounts(reviewLogs), [reviewLogs]);
  const maxCount = useMemo(() => Math.max(1, ...counts.values()), [counts]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [month]);

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const hasAny = reviewLogs.length > 0;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Review Calendar
        </h3>
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1 hover:bg-accent transition"
            onClick={() => setMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            className="rounded p-1 hover:bg-accent transition"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!hasAny ? (
        <p className="text-center text-sm text-muted-foreground py-6">
          Review some cards to see your calendar light up 🔥
        </p>
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const count = counts.get(key) ?? 0;
              const isCurrentMonth = isSameMonth(day, month);
              const today = isToday(day);

              return (
                <div
                  key={key}
                  title={count > 0 ? `${count} review${count === 1 ? "" : "s"} on ${format(day, "MMM d")}` : format(day, "MMM d, yyyy")}
                  className={[
                    "aspect-square flex flex-col items-center justify-center rounded-md text-xs transition",
                    today ? "ring-1 ring-primary/50" : "",
                    isCurrentMonth ? "" : "opacity-30",
                    count > 0 ? intensityClass(count, maxCount) : "",
                    count > 0 ? "text-primary-foreground font-medium" : "text-muted-foreground",
                  ].join(" ")}
                >
                  <span>{format(day, "d")}</span>
                  {count > 0 && (
                    <span className="text-[9px] leading-none opacity-80 mt-0.5">{count}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5 mt-3">
            <span className="text-[10px] text-muted-foreground">Less</span>
            <span className="h-3 w-3 rounded-sm bg-primary/15" />
            <span className="h-3 w-3 rounded-sm bg-primary/30" />
            <span className="h-3 w-3 rounded-sm bg-primary/50" />
            <span className="h-3 w-3 rounded-sm bg-primary/70" />
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
        </>
      )}
    </div>
  );
}