import { differenceInCalendarDays, endOfDay, isAfter, parseISO, startOfDay, subDays } from "date-fns";
import type { Card, Deck, ReviewLog } from "@/types";

export interface DeckStats {
  total: number;
  mastered: number;
  due: number;
  accuracy: number;
  newCards: number;
  learning: number;
  review: number;
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
    newCards: deckCards.filter((card) => card.state === "new").length,
    learning: deckCards.filter((card) => card.state === "learning" || card.state === "relearning").length,
    review: deckCards.filter((card) => card.state === "review").length,
  };
}

export function getDueTodayCount(cards: Card[], at = new Date()): number {
  return cards.filter((card) => isCardDueToday(card, at)).length;
}

export function getNewCount(cards: Card[]): number {
  return cards.filter((card) => card.state === "new").length;
}

export function getLearningCount(cards: Card[]): number {
  return cards.filter((card) => card.state === "learning" || card.state === "relearning").length;
}

export function getNewCardsReviewedToday(reviewLogs: ReviewLog[], at = new Date()): number {
  const todayStart = startOfDay(at);
  const todayEnd = endOfDay(at);

  return reviewLogs.filter((log) => {
    const reviewDate = parseISO(log.reviewDate);
    return reviewDate >= todayStart && reviewDate <= todayEnd && log.elapsedDays === 0;
  }).length;
}

/** Cards past their review date (excluding new/learning) */
export function getOverdueCount(cards: Card[], at = new Date()): number {
  const now = at;
  return cards.filter((card) => {
    if (card.state === "new" || card.state === "learning") return false;
    return isAfter(now, parseISO(card.nextReviewDate));
  }).length;
}

/** Cards flagged as leeches (lapses >= threshold) */
export function getLeechCount(cards: Card[], leechThreshold: number): number {
  return cards.filter((card) => card.lapses >= leechThreshold).length;
}

/** Estimated review time in minutes (~5s per review, ~10s learning, ~8s new) */
export function getEstimatedReviewMinutes(cards: Card[], dailyLimit: number): number {
  const newCards = Math.min(
    cards.filter((c) => c.state === "new").length,
    dailyLimit,
  );
  const reviewCards = cards.filter((c) => {
    if (c.state === "new") return false;
    return isCardDueToday(c);
  }).length;
  const learningCards = cards.filter((c) => c.state === "learning" || c.state === "relearning").length;

  const seconds = reviewCards * 5 + learningCards * 10 + newCards * 8;
  return Math.max(1, Math.ceil(seconds / 60));
}

export interface DeckHealth {
  retention: number;       // 0-100, % of reviews that were good/easy
  leeches: number;         // cards with lapses >= threshold
  avgStability: number;    // average stability of review-state cards
  overdue: number;         // review cards past their due date
}

export function getDeckHealth(
  deckId: string,
  cards: Card[],
  reviewLogs: ReviewLog[],
  leechThreshold: number,
): DeckHealth {
  const deckCards = cards.filter((c) => c.deckId === deckId);
  const deckCardIds = new Set(deckCards.map((c) => c.id));
  const deckLogs = reviewLogs.filter((l) => deckCardIds.has(l.cardId));

  const totalRatings = deckLogs.length;
  const goodEasy = deckLogs.filter((l) => l.rating === "good" || l.rating === "easy").length;
  const retention = totalRatings === 0 ? 0 : Math.round((goodEasy / totalRatings) * 100);

  const leeches = deckCards.filter((c) => c.lapses >= leechThreshold).length;

  const reviewCards = deckCards.filter((c) => c.state === "review");
  const avgStability = reviewCards.length === 0
    ? 0
    : Math.round(reviewCards.reduce((sum, c) => sum + c.stability, 0) / reviewCards.length);

  const now = new Date();
  const overdue = deckCards.filter((c) => {
    if (c.state === "new") return false;
    return isAfter(now, parseISO(c.nextReviewDate));
  }).length;

  return { retention, leeches, avgStability, overdue };
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

  export interface DueForecastDay {
    date: string; // YYYY-MM-DD
    count: number;
  }

  /** Project how many cards are due each day for the next N days */
  export function getDueForecast(cards: Card[], days = 30): DueForecastDay[] {
    const now = new Date();
    const forecast: Map<string, number> = new Map();

    for (const card of cards) {
      if (card.state === "new") continue; // new cards aren't scheduled
      const dueDate = parseISO(card.nextReviewDate);
      if (isAfter(dueDate, now)) {
        const key = startOfDay(dueDate).toISOString().slice(0, 10);
        forecast.set(key, (forecast.get(key) || 0) + 1);
      }
    }

    const result: DueForecastDay[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const key = startOfDay(date).toISOString().slice(0, 10);
      result.push({ date: key, count: forecast.get(key) || 0 });
    }
    return result;
  }
