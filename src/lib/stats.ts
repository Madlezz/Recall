import { differenceInCalendarDays, endOfDay, isAfter, parseISO, startOfDay, subDays } from "date-fns";
import type { Card, Deck, Review } from "@/types";

export interface DeckStats {
  total: number;
  mastered: number;
  due: number;
  accuracy: number;
}

export function isCardDue(card: Card, at = new Date()): boolean {
  return !isAfter(parseISO(card.nextReviewAt), at);
}

export function isCardDueToday(card: Card, at = new Date()): boolean {
  return !isAfter(parseISO(card.nextReviewAt), endOfDay(at));
}

export function getDeckStats(deck: Deck, cards: Card[]): DeckStats {
  const deckCards = cards.filter((card) => card.deckId === deck.id);
  const answered = deckCards.reduce((sum, card) => sum + card.correctCount + card.incorrectCount, 0);
  const correct = deckCards.reduce((sum, card) => sum + card.correctCount, 0);

  return {
    total: deckCards.length,
    mastered: deckCards.filter((card) => card.status === "mastered").length,
    due: deckCards.filter((card) => isCardDueToday(card)).length,
    accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100),
  };
}

export function getDueTodayCount(cards: Card[], at = new Date()): number {
  return cards.filter((card) => isCardDueToday(card, at)).length;
}

export function getStudyStreak(reviews: Review[], at = new Date()): number {
  const reviewedDays = new Set(reviews.map((review) => startOfDay(parseISO(review.answeredAt)).toISOString()));
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
