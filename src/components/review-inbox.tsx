import { AlertTriangle, BookOpen, Brain, RotateCw, Zap } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { cardSurface } from "@/lib/surface";

export function ReviewInbox(): JSX.Element {
  const { t } = useTranslation();
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
      toast.info(t("reviewInbox.noCardsDue"));
    }
  }

  if (totalDue === 0 && overdue === 0 && leech === 0) {
    return (
      <div className={cardSurface("flex items-center justify-between px-5 py-4")} role="status" aria-label={t("reviewInbox.noCardsDueAria")}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-review-easy/10">
            <RotateCw className="h-4 w-4 text-review-easy" aria-hidden="true" />
          </div>
          <div>
            <div className="text-sm font-semibold text-on-surface">{t("reviewInbox.allCaughtUp")}</div>
            <div className="text-xs text-on-surface-variant">{t("reviewInbox.noCardsDueHint")}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardSurface("")} role="region" aria-label={t("reviewInbox.regionAria")}>
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-on-surface">{t("reviewInbox.title")}</h3>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {t("reviewInbox.cardsReady", { count: totalDue, minutes: estimatedMin })}
          </p>
        </div>
        <Button onClick={handleStartReview} className="gap-2" aria-label={t("reviewInbox.startAria", { count: totalDue, minutes: estimatedMin })}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          {t("reviewInbox.start")}
        </Button>
      </div>

      <div className="grid grid-cols-4 divide-x divide-outline-variant border-t border-outline-variant">
        <InboxCell icon={RotateCw} label={t("reviewInbox.due")} count={due} sub={t("reviewInbox.overdueCount", { count: overdue })} />
        <InboxCell icon={Brain} label={t("reviewInbox.learning")} count={learning} sub={t("reviewInbox.inProgress")} />
        <InboxCell
          icon={BookOpen}
          label={t("reviewInbox.new")}
          count={Math.min(newCards, newAvailable)}
          sub={`${newReviewedToday}/${settings.dailyNewCardLimit}`}
        />
        <InboxCell
          icon={AlertTriangle}
          label={t("reviewInbox.leeches")}
          count={leech}
          sub={leech > 0 ? t("reviewInbox.lapsCount", { count: settings.leechThreshold }) : t("reviewInbox.none")}
          accent={leech > 0}
        />
      </div>

      {overdue > 0 && (
        <div className="flex items-center gap-2 border-t border-outline-variant px-5 py-3 text-sm" role="alert">
          <Zap className="h-4 w-4 text-review-again shrink-0" aria-hidden="true" />
          <span className="font-semibold text-review-again">{t("reviewInbox.overdueCount", { count: overdue })}</span>
          <span className="text-on-surface-variant">{t("reviewInbox.tackleFirst")}</span>
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center px-2 py-4 text-center" aria-label={t("reviewInbox.cellAria", { count, label, sub })}>
      <Icon className={cn("h-4 w-4 mb-1.5", accent ? "text-review-again" : "text-on-surface-variant")} aria-hidden="true" />
      <span className={cn("text-xl font-bold tabular-nums", accent ? "text-review-again" : "text-on-surface")}>
        {count}
      </span>
      <span className="text-[10px] font-medium text-on-surface-variant mt-0.5">{label}</span>
      <span className="text-[9px] text-on-surface-variant/70 mt-0.5">{sub}</span>
    </div>
  );
}
