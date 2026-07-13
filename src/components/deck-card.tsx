import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getDeckColorClass } from "@/lib/deck-colors";
import { getDeckStats, getDeckHealth } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { cardSurface } from "@/lib/surface";
import { useRecallStore } from "@/stores/recall-store";
import type { Deck } from "@/types";

interface DeckCardProps {
  deck: Deck;
  onOpen: () => void;
}

export function DeckCard({ deck, onOpen }: DeckCardProps): JSX.Element {
  const { t } = useTranslation();
  const cards = useRecallStore((state) => state.cards);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const leechThreshold = useRecallStore((state) => state.settings.leechThreshold);
  const stats = getDeckStats(deck, cards);
  const progress = stats.total === 0 ? 0 : Math.round((stats.mastered / stats.total) * 100);
  const health = useMemo(
    () => getDeckHealth(deck.id, cards, reviewLogs, leechThreshold),
    [deck.id, cards, reviewLogs, leechThreshold],
  );

  const examDays = useMemo(() => {
    if (!deck.examDeadline) return null;
    const now = new Date();
    const deadline = new Date(deck.examDeadline);
    return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [deck.examDeadline]);

  const lastStudied = useMemo(() => {
    const deckCardIds = new Set(cards.filter((c) => c.deckId === deck.id).map((c) => c.id));
    const dates = reviewLogs.filter((l) => deckCardIds.has(l.cardId)).map((l) => new Date(l.reviewDate).getTime());
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates));
  }, [cards, reviewLogs, deck.id]);

  const retentionColor =
    health.retention >= 85 ? "text-review-easy" : health.retention >= 70 ? "text-review-hard" : "text-review-again";

  return (
    <button
      onClick={onOpen}
      aria-label={t("deck.openDeck", { name: deck.name, due: stats.due, total: stats.total, progress })}
      className={cardSurface("group relative flex flex-col p-5 text-left transition-colors hover:border-primary/40")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", getDeckColorClass(deck.color))} />
            <h3 className="font-title-md text-on-surface group-hover:text-primary transition-colors">{deck.name}</h3>
          </div>
          {examDays != null && (
            <span
              className={cn(
                "shrink-0 px-1.5 py-0.5 font-semibold",
                examDays <= 0
                  ? "bg-review-again/10 text-review-again"
                  : examDays <= 3
                    ? "bg-review-hard/10 text-review-hard"
                    : "bg-primary-soft text-primary",
              )}
            >
              {examDays <= 0 ? t("deck.examToday") : examDays === 1 ? t("deck.examTomorrow") : t("deck.examDays", { count: examDays })}
            </span>
          )}
        </div>
        <p className="mt-1.5 line-clamp-1 text-xs text-on-surface-variant">
          {deck.description || t("deck.noDescription")}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-outline transition-colors group-hover:text-primary" />

      {/* Progress */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-on-surface-variant">
          <span>
            {t("deck.mastered", { mastered: stats.mastered, total: stats.total })}
          </span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Metrics */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label={t("deck.due")} value={stats.due} accent={stats.due > 0} />
        <MiniStat label={t("deck.accuracy")} value={`${stats.accuracy}%`} />
        <MiniStat label={t("deck.cards")} value={stats.total} />
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 border-t border-outline-variant pt-3 text-xs">
        <span className={cn("font-semibold tabular-nums", retentionColor)}>{t("deck.retention", { percent: health.retention })}</span>
        {health.leeches > 0 && (
          <span className="tabular-nums text-review-hard">{t("deck.leech", { count: health.leeches })}</span>
        )}
        {health.overdue > 0 && (
          <span className="tabular-nums text-review-again">{t("deck.overdue", { count: health.overdue })}</span>
        )}
        {stats.newCards > 0 && <span className="text-on-surface-variant tabular-nums">{t("deck.newCards", { count: stats.newCards })}</span>}
        {lastStudied && <span className="ml-auto text-on-surface-variant">{formatLastStudied(lastStudied, t)}</span>}
      </div>
    </button>
  );
}

function formatLastStudied(d: Date, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t("deck.today");
  if (diffDays === 1) return t("deck.yesterday");
  if (diffDays < 7) return t("deck.daysAgo", { count: diffDays });
  return d.toLocaleDateString();
}

export function MiniStat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }): JSX.Element {
  return (
    <div className={cn("rounded-md px-2.5 py-2 text-center", accent ? "bg-primary-soft" : "bg-surface-container-low dark:bg-surface-container")}>
      <div className={cn("text-sm font-bold tabular-nums", accent ? "text-primary" : "text-on-surface")}>
        {value}
      </div>
      <div className="mt-0.5 font-medium tracking-wider text-on-surface-variant">{label}</div>
    </div>
  );
}