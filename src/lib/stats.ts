import { differenceInCalendarDays, endOfDay, isAfter, parseISO, startOfDay, subDays } from "date-fns";
import type { Card, Deck, ReviewLog } from "@/types";

export interface DeckStats {
  total: number;
  mastered: number;
  due: number;
  accuracy: number;
}

export function isCardDue(card: Card, at = new Date()): boolean {
  return !isAfter(parseISO(card.nextReviewDate), at);
}

export function isCardDueToday(card: Card, at = new Date()): boolean {
  return !isAfter(parseISO(card.nextReviewDate), endOfDay(at));
}

export function getDeckStats(deck: Deck, cards: Card[]): DeckStats {
  const deckCards = cards.filter((card) => card.deckId === deck.id);
  const totalReps = deckCards.reduce((sum, card) => sum + card.reps, 0);
  const lapses = deckCards.reduce((sum, card) => sum + card.lapses, 0);
  const accuracy = totalReps === 0 ? 0 : Math.round(((totalReps - lapses) / totalReps) * 100);

  return {
    total: deckCards.length,
    mastered: deckCards.filter((card) => card.state === "review").length,
    due: deckCards.filter((card) => isCardDueToday(card)).length,
    accuracy,
  };
}

export function getDueTodayCount(cards: Card[], at = new Date()): number {
  return cards.filter((card) => isCardDueToday(card, at)).length;
}

export function getStudyStreak(reviews: ReviewLog[], at = new Date()): number {
  const reviewedDays = new Set(reviews.map((review) => startOfDay(parseISO(review.reviewDate)).toISOString()));
  let cursor = startOfDay(at);
  let streak = 0;

  while (reviewedDays.has(cursor.toISOString())) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  if (streak === 0) {
    const yesterday = startOfDay(subDays(at, 1)).toISOString();
    if (reviewedDays.has(yesterday)) {
      return 1;
    }
  }

  const oldestAllowed = subDays(startOfDay(at), 365);
  return differenceInCalendarDays(cursor, oldestAllowed) < 0 ? 365 : streak;
}
