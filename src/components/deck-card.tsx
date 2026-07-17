import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getDeckColorClass } from "@/lib/deck-colors";
import { forecastDueByDay, getDeckStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { cardSurface, typeClass } from "@/lib/surface";
import { useRecallStore } from "@/stores/recall-store";
import type { Deck as DeckType } from "@/types";

interface DeckCardProps {
  deck: DeckType & { dueCount?: number; totalCards?: number; deckCards?: { state: string }[] };
  onOpen: () => void;
}

/** First 1-2 letter initials, ignoring emoji/symbol-only tokens. */
export function deckInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((w) => (w.match(/\p{L}/gu) ?? []).join(""))
    .filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return "?";
}

export function DeckCard({ deck, onOpen }: DeckCardProps): JSX.Element {
  const { t } = useTranslation();
  const cards = useRecallStore((state) => state.cards);
  const deckCards = useMemo(() => cards.filter((c) => c.deckId === deck.id), [cards, deck.id]);
  const stats = getDeckStats(deck, deckCards);
  const due = deck.dueCount ?? stats.due;
  const newCards = stats.newCards;
  const learning = stats.learning;
  const progress = stats.total === 0 ? 0 : Math.round((stats.mastered / stats.total) * 100);

  // Sparkline: 30-day due forecast
  const sparkData = useMemo(() => {
    const forecast = forecastDueByDay(deckCards, 30);
    const max = Math.max(...forecast.map((f) => f.due), 1);
    return forecast.map((f) => ({ height: Math.max(Math.round((f.due / max) * 20), 1) }));
  }, [deckCards]);

  // Template decks prefix emoji in name ("👋 How This Works"); skip non-letters.
  const abbr = useMemo(() => deckInitials(deck.name), [deck.name]);

  return (
    <button
      onClick={onOpen}
      className={cn(
        cardSurface("p-5 text-left"),
        "hover:shadow-md cursor-pointer group",
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
          <span className={cn("bg-surface-variant px-3 py-1 rounded-full", typeClass.caption, "text-on-surface-variant")}>
            {t("deck.duePill", { count: due })}
          </span>
        )}
      </div>

      <h3 className={cn(typeClass["title-md"], "text-text-primary group-hover:text-primary transition-colors line-clamp-1")}>
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
        <span className={cn(typeClass.caption, "text-outline tabular-nums")}>{progress}%</span>
      </div>

      {/* 30-day due forecast sparkline */}
      {stats.total > 0 && (
        <svg
          viewBox="0 0 90 24"
          className="w-full h-6 mt-4"
          role="img"
          aria-label={t("deck.dueForecastAria", { count: due })}
          preserveAspectRatio="none"
        >
          {sparkData.map((bar, i) => (
            <rect
              key={i}
              x={i * 3}
              y={24 - bar.height}
              width={2}
              height={bar.height}
              className="fill-primary/40"
              rx={0.5}
            />
          ))}
        </svg>
      )}

      {/* New / Learning counts */}
      <div className="flex mt-4 gap-4">
        <div className="flex flex-col">
          <span className={cn(typeClass.caption, "text-outline")}>{t("deck.newCardsLabel")}</span>
          <span className={cn(typeClass["label-lg"], "text-sm font-semibold text-text-primary")}>{newCards}</span>
        </div>
        <div className="flex flex-col border-l border-outline-variant pl-4">
          <span className={cn(typeClass.caption, "text-outline")}>{t("deck.learningLabel")}</span>
          <span className={cn(typeClass["label-lg"], "text-sm font-semibold text-text-primary")}>{learning}</span>
        </div>
      </div>
    </button>
  );
}