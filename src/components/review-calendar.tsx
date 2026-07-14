import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useRecallStore } from "@/stores/recall-store";
import { cardSurface, typeClass } from "@/lib/surface";
import { cn } from "@/lib/utils";
import type { ReviewLog } from "@/types";

function getReviewCounts(logs: ReviewLog[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const log of logs) {
    const day = log.reviewDate.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return map;
}

function intensityClass(count: number, max: number): string {
  if (count === 0) return "";
  const ratio = max > 0 ? count / max : 0;
  if (ratio <= 0.25) return "bg-tertiary-container/50";
  if (ratio <= 0.5) return "bg-tertiary-container";
  if (ratio <= 0.75) return "bg-tertiary";
  return "bg-tertiary-container";
}

export function ReviewCalendar(): JSX.Element {
  const { t } = useTranslation();
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

  const weekDays = [
    t("reviewCalendar.weekDaySun"),
    t("reviewCalendar.weekDayMon"),
    t("reviewCalendar.weekDayTue"),
    t("reviewCalendar.weekDayWed"),
    t("reviewCalendar.weekDayThu"),
    t("reviewCalendar.weekDayFri"),
    t("reviewCalendar.weekDaySat"),
  ];
  const hasAny = reviewLogs.length > 0;

  return (
    <div className={cardSurface("px-5 py-5")}>
      <div className="flex items-center justify-between mb-4">
        <span className={cn(typeClass.caption, "text-on-surface-variant tracking-[0.15em]")}>{t("reviewCalendar.title")}</span>
        <div className="flex items-center gap-2">
          <button
            className="rounded p-1 transition-colors hover:bg-surface-container-low"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label={t("reviewCalendar.previousMonthAria")}
          >
            <ChevronLeft className="h-4 w-4 text-on-surface-variant" />
          </button>
          <span className="text-sm font-semibold text-on-surface min-w-[120px] text-center" aria-live="polite">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            className="rounded p-1 transition-colors hover:bg-surface-container-low"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label={t("reviewCalendar.nextMonthAria")}
          >
            <ChevronRight className="h-4 w-4 text-on-surface-variant" />
          </button>
        </div>
      </div>

      {!hasAny ? (
        <p className="text-center text-sm text-on-surface-variant py-6">{t("reviewCalendar.emptyHint")}</p>
      ) : (
        <>
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((d) => (
              <div key={d} className={cn(typeClass.caption, "text-center text-on-surface-variant py-1")}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const count = counts.get(key) ?? 0;
              const isCurrentMonth = isSameMonth(day, month);
              const today = isToday(day);

              return (
                <div
                  key={key}
                  title={count > 0 ? t("reviewCalendar.reviewCount", { count, date: format(day, "MMM d") }) : format(day, "MMM d, yyyy")}
                  className={`aspect-square flex flex-col items-center justify-center rounded-md ${cn(typeClass.caption, "transition-colors")} ${
                    today ? "ring-1 ring-primary" : ""
                  } ${isCurrentMonth ? "" : "opacity-30"} ${
                    count > 0 ? intensityClass(count, maxCount) + " text-on-tertiary-container" : "text-on-surface-variant"
                  }`}
                >
                  {format(day, "d")}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-1.5 mt-3">
            <span className={cn(typeClass.caption, "text-on-surface-variant")}>{t("reviewCalendar.less")}</span>
            <span className="h-3 w-3 rounded-sm bg-surface-container-high" />
            <span className="h-3 w-3 rounded-sm bg-tertiary-container/50" />
            <span className="h-3 w-3 rounded-sm bg-tertiary-container" />
            <span className="h-3 w-3 rounded-sm bg-tertiary" />
            <span className={cn(typeClass.caption, "text-on-surface-variant")}>{t("reviewCalendar.more")}</span>
          </div>
        </>
      )}
    </div>
  );
}
