import { AlertTriangle, BookOpen, Brain, Clock, RotateCw } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  const estimatedMin = useMemo(() => getEstimatedReviewMinutes(cards, settings.dailyNewCardLimit), [cards, settings.dailyNewCardLimit]);

  const newAvailable = Math.max(0, settings.dailyNewCardLimit - newReviewedToday);
  const totalDue = due + learning + Math.min(newCards, newAvailable);

  function handleStartReview(): void {
    if (!startReview(null)) {
      toast.info("No cards due right now");
    }
  }

  if (totalDue === 0 && overdue === 0 && leech === 0) {
    return (
      <div className="rounded-lg border bg-card p-5 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
          <RotateCw className="h-5 w-5 text-emerald-500" />
        </div>
        <h3 className="mt-3 font-semibold">All caught up!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No cards due. Add new cards or import a deck.
        </p>
        <Progress className="mt-3 h-1.5" value={100} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Review Inbox</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalDue} cards ready · ~{estimatedMin} min estimated
          </p>
        </div>
        <Button onClick={handleStartReview}>
          <RotateCw className="h-4 w-4" />
          Start Review
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <InboxRow
          icon={RotateCw}
          label="Due"
          count={due}
          color="text-blue-500"
          bg="bg-blue-500/10"
          sub={`${overdue} overdue`}
        />
        <InboxRow
          icon={Brain}
          label="Learning"
          count={learning}
          color="text-amber-500"
          bg="bg-amber-500/10"
          sub="in progress"
        />
        <InboxRow
          icon={BookOpen}
          label="New"
          count={Math.min(newCards, newAvailable)}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
          sub={`${newReviewedToday}/${settings.dailyNewCardLimit} today`}
        />
        <InboxRow
          icon={AlertTriangle}
          label="Leeches"
          count={leech}
          color={leech > 0 ? "text-red-500" : "text-muted-foreground"}
          bg={leech > 0 ? "bg-red-500/10" : "bg-muted/30"}
          sub={leech > 0 ? `≥${settings.leechThreshold} lapses` : "none flagged"}
        />
      </div>

      {overdue > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm">
          <Clock className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-red-500 font-medium">{overdue} overdue</span>
          <span className="text-muted-foreground">— review these first to stay on track</span>
        </div>
      )}
    </div>
  );
}

interface InboxRowProps {
  icon: typeof RotateCw;
  label: string;
  count: number;
  color: string;
  bg: string;
  sub: string;
}

function InboxRow({ icon: Icon, label, count, color, bg, sub }: InboxRowProps): JSX.Element {
  return (
    <div className={cn("flex items-center gap-3 rounded-md p-3", bg)}>
      <Icon className={cn("h-5 w-5 shrink-0", color)} />
      <div className="min-w-0">
        <div className={cn("text-lg font-bold", color)}>{count}</div>
        <div className="text-xs font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}