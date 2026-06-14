import { AlertTriangle, BookOpen, Brain, RotateCw, Zap } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  getDueTodayCount,
  getEstimatedReviewMinutes,
  getLearningCount,
  getLeechCount,
  getNewCount,
  getNewCardsReviewedToday,
  getOverdueCount,
} from "@/lib/stats";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import { toast } from "sonner";

export function ReviewInbox(): JSX.Element {
  const cards = useRecallStore((state) => state.cards);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const settings = useRecallStore((state) => state.settings);
  const startReview = useRecallStore((state) => state.startReview);

  const due = useMemo(() => getDueTodayCount(cards), [cards]);
  const overdue = useMemo(() => getOverdueCount(cards), [cards]);
  const newCards = useMemo(() => getNewCount(cards), [cards]);
  const learning = useMemo(() => getLearningCount(cards), [cards]);
  const leech = useMemo(() => getLeechCount(cards, settings.leechThreshold), [cards, settings.leechThreshold]);
  const newReviewedToday = useMemo(() => getNewCardsReviewedToday(reviewLogs), [reviewLogs]);
  const estimatedMin = useMemo(
    () => getEstimatedReviewMinutes(cards, settings.dailyNewCardLimit),
    [cards, settings.dailyNewCardLimit],
  );

  const newAvailable = Math.max(0, settings.dailyNewCardLimit - newReviewedToday);
  const totalDue = due + learning + Math.min(newCards, newAvailable);

  function handleStartReview(): void {
    if (!startReview(null)) {
      toast.info("No cards due right now");
    }
  }

  if (totalDue === 0 && overdue === 0 && leech === 0) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <RotateCw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">All caught up</div>
            <div className="text-xs text-zinc-500">No cards due. Add new cards or import a deck.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Review Inbox</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {totalDue} cards ready · ~{estimatedMin} min
          </p>
        </div>
        <Button onClick={handleStartReview} className="gap-2">
          <RotateCw className="h-4 w-4" />
          Start
        </Button>
      </div>

      <div className="grid grid-cols-4 divide-x divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
        <InboxCell icon={RotateCw} label="Due" count={due} sub={`${overdue} overdue`} />
        <InboxCell icon={Brain} label="Learning" count={learning} sub="in progress" />
        <InboxCell
          icon={BookOpen}
          label="New"
          count={Math.min(newCards, newAvailable)}
          sub={`${newReviewedToday}/${settings.dailyNewCardLimit}`}
        />
        <InboxCell
          icon={AlertTriangle}
          label="Leeches"
          count={leech}
          sub={leech > 0 ? `≥${settings.leechThreshold} laps` : "none"}
          accent={leech > 0}
        />
      </div>

      {overdue > 0 && (
        <div className="flex items-center gap-2 border-t border-zinc-100 px-5 py-3 text-sm dark:border-zinc-800">
          <Zap className="h-4 w-4 text-red-500 shrink-0" />
          <span className="font-semibold text-red-600 dark:text-red-400">{overdue} overdue</span>
          <span className="text-zinc-500">— tackle these first</span>
        </div>
      )}
    </div>
  );
}

function InboxCell({
  icon: Icon,
  label,
  count,
  sub,
  accent,
}: {
  icon: typeof RotateCw;
  label: string;
  count: number;
  sub: string;
  accent?: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-4 text-center">
      <Icon className={cn("h-4 w-4 mb-1.5", accent ? "text-red-500" : "text-zinc-400")} />
      <span className={cn("text-xl font-bold tabular-nums", accent ? "text-red-600" : "text-zinc-800 dark:text-zinc-200")}>
        {count}
      </span>
      <span className="text-[10px] font-medium text-zinc-500 mt-0.5">{label}</span>
      <span className="text-[9px] text-zinc-400 mt-0.5">{sub}</span>
    </div>
  );
}