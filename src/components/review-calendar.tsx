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
  if (ratio <= 0.25) return "bg-zinc-200 dark:bg-zinc-700";
  if (ratio <= 0.5) return "bg-zinc-400 dark:bg-zinc-500";
  if (ratio <= 0.75) return "bg-zinc-600 dark:bg-zinc-400";
  return "bg-zinc-800 dark:bg-zinc-200";
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
    <div className="rounded-lg border border-zinc-200 bg-white px-5 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">{t("reviewCalendar.title")}</span>
        <div className="flex items-center gap-2">
          <button
            className="rounded p-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label={t("reviewCalendar.previousMonthAria")}
          >
            <ChevronLeft className="h-4 w-4 text-zinc-500" />
          </button>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 min-w-[120px] text-center" aria-live="polite">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            className="rounded p-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label={t("reviewCalendar.nextMonthAria")}
          >
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
      </div>

      {!hasAny ? (
        <p className="text-center text-sm text-zinc-400 py-6">{t("reviewCalendar.emptyHint")}</p>
      ) : (
        <>
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-zinc-400 py-1">
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
                  className={`aspect-square flex flex-col items-center justify-center rounded-md text-[11px] transition-colors ${
                    today ? "ring-1 ring-zinc-400 dark:ring-zinc-500" : ""
                  } ${isCurrentMonth ? "" : "opacity-30"} ${
                    count > 0 ? intensityClass(count, maxCount) + (count > 0 && intensityClass(count, maxCount).includes("zinc-800") ? " text-white" : " text-zinc-900 dark:text-zinc-100") : "text-zinc-400"
                  }`}
                >
                  {format(day, "d")}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-1.5 mt-3">
            <span className="text-[10px] text-zinc-400">{t("reviewCalendar.less")}</span>
            <span className="h-3 w-3 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
            <span className="h-3 w-3 rounded-sm bg-zinc-400 dark:bg-zinc-500" />
            <span className="h-3 w-3 rounded-sm bg-zinc-600 dark:bg-zinc-400" />
            <span className="h-3 w-3 rounded-sm bg-zinc-800 dark:bg-zinc-200" />
            <span className="text-[10px] text-zinc-400">{t("reviewCalendar.more")}</span>
          </div>
        </>
      )}
    </div>
  );
}
