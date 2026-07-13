import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getDeckColorClass } from "@/lib/deck-colors";
import { getDeckStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import type { Deck as DeckType } from "@/types";

interface DeckCardProps {
  deck: DeckType & { dueCount?: number; totalCards?: number; deckCards?: { state: string }[] };
  onOpen: () => void;
}

export function DeckCard({ deck, onOpen }: DeckCardProps): JSX.Element {
  const { t } = useTranslation();
  const cards = useRecallStore((state) => state.cards);
  const stats = getDeckStats(deck, cards);
  const due = deck.dueCount ?? stats.due;
  const newCards = stats.newCards;
  const learning = stats.learning;
  const progress = stats.total === 0 ? 0 : Math.round((stats.mastered / stats.total) * 100);

  const abbr = useMemo(() => {
    const words = deck.name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return deck.name.slice(0, 2).toUpperCase();
  }, [deck.name]);

  return (
    <button
      onClick={onOpen}
      className={cn(
        "bg-surface border border-outline-variant",
        "p-5 rounded-2xl text-left",
        "hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group",
      )}
      aria-label={t("deck.openDeck", { name: deck.name })}
    >
      <div className="flex justify-between items-start mb-4">
        <div
          className={cn(
            "w-12 h-12 flex items-center justify-center rounded-xl text-primary font-bold bg-surface-container",
            getDeckColorClass(deck.color),
          )}
        >
          {abbr}
        </div>
        {due > 0 && (
          <span className="bg-surface-variant px-3 py-1 rounded-full font-caption text-xs font-medium text-on-surface-variant">
            {t("deck.duePill", { count: due })}
          </span>
        )}
      </div>

      <h3 className="font-title-md text-lg font-semibold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
        {deck.name}
      </h3>

      {/* Progress bar */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 bg-surface-container h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-review-good h-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-caption text-xs text-outline tabular-nums">{progress}%</span>
      </div>

      {/* New / Learning counts */}
      <div className="flex mt-4 gap-4">
        <div className="flex flex-col">
          <span className="font-caption text-xs text-outline">{t("deck.newCardsLabel")}</span>
          <span className="font-label-lg text-sm font-semibold text-text-primary">{newCards}</span>
        </div>
        <div className="flex flex-col border-l border-outline-variant pl-4">
          <span className="font-caption text-xs text-outline">{t("deck.learningLabel")}</span>
          <span className="font-label-lg text-sm font-semibold text-text-primary">{learning}</span>
        </div>
      </div>
    </button>
  );
}