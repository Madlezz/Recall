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

  export interface ForecastDueDay {
    date: string;     // YYYY-MM-DD
    due: number;      // review cards due this day
    newCount: number; // brand-new cards (state === "new")
  }

  /**
   * Bucket cards by their next review date for the next N days.
   * Overdue cards are bucketed into day 0.
   * New cards (state === "new") are counted separately.
   */
  export function forecastDueByDay(cards: Card[], days = 30, now = new Date()): ForecastDueDay[] {
    const today = startOfDay(now);
    const buckets = new Map<string, { due: number; newCount: number }>();

    // Initialize buckets
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { due: 0, newCount: 0 });
    }

    const dayKeys = Array.from(buckets.keys());
    const lastDay = dayKeys[dayKeys.length - 1];

    for (const card of cards) {
      if (card.state === "new") {
        // Brand-new cards don't have a scheduled date — count in day 0
        const first = dayKeys[0];
        const bucket = buckets.get(first);
        if (bucket) bucket.newCount += 1;
        continue;
      }

      const dueDate = startOfDay(parseISO(card.nextReviewDate));
      const key = dueDate.toISOString().slice(0, 10);

      // Overdue cards go into day 0
      if (isAfter(today, dueDate) || dueDate.getTime() === today.getTime()) {
        const first = dayKeys[0];
        const bucket = buckets.get(first);
        if (bucket) bucket.due += 1;
      } else if (key <= lastDay) {
        const bucket = buckets.get(key);
        if (bucket) bucket.due += 1;
      }
    }

    return dayKeys.map((key) => {
      const b = buckets.get(key);
      return { date: key, due: b?.due ?? 0, newCount: b?.newCount ?? 0 };
    });
  }

  // ── Forgetting curve: retention by interval bucket ──

  export interface ForgettingCurvePoint {
    interval: string;       // label like "1d", "3d", "7d", "14d+", "30d+"
    retention: number;      // 0-100, % of good+easy in this bucket
    reviewCount: number;
  }

  /**
   * Compute retention rate by scheduled-interval bucket.
   * Shows how well users remember cards at different spacing intervals.
   * Data comes directly from review_logs (FSRS stores scheduledDays per review).
   */
  export function getForgettingCurve(reviewLogs: ReviewLog[]): ForgettingCurvePoint[] {
    if (reviewLogs.length === 0) return [];

    const buckets: { label: string; min: number; max: number; good: number; total: number }[] = [
      { label: "1d", min: 0, max: 1, good: 0, total: 0 },
      { label: "2-3d", min: 2, max: 3, good: 0, total: 0 },
      { label: "4-7d", min: 4, max: 7, good: 0, total: 0 },
      { label: "8-14d", min: 8, max: 14, good: 0, total: 0 },
      { label: "15-30d", min: 15, max: 30, good: 0, total: 0 },
      { label: "30d+", min: 31, max: Infinity, good: 0, total: 0 },
    ];

    for (const log of reviewLogs) {
      const days = log.scheduledDays;
      const bucket = buckets.find((b) => days >= b.min && days <= b.max);
      if (!bucket) continue;
      bucket.total++;
      if (log.rating === "good" || log.rating === "easy") bucket.good++;
    }

    return buckets
      .filter((b) => b.total > 0)
      .map((b) => ({
        interval: b.label,
        retention: b.total === 0 ? 0 : Math.round((b.good / b.total) * 100),
        reviewCount: b.total,
      }));
  }

  // ── Best time of day to study ──

  export interface StudyTimeInsight {
    hour: number;            // 0-23
    label: string;           // "6 AM", "10 PM", etc.
    accuracy: number;        // 0-100, % good+easy
    reviewCount: number;
  }

  /**
   * Find the hour of day with the highest accuracy (good+easy rate).
   * Requires at least 10 reviews in that hour to be meaningful.
   * Returns null if not enough data.
   */
  export function getBestStudyTime(reviewLogs: ReviewLog[]): StudyTimeInsight | null {
    if (reviewLogs.length === 0) return null;

    const byHour = new Map<number, { good: number; total: number }>();

    for (const log of reviewLogs) {
      const hour = new Date(log.reviewDate).getHours();
      const entry = byHour.get(hour) ?? { good: 0, total: 0 };
      entry.total++;
      if (log.rating === "good" || log.rating === "easy") entry.good++;
      byHour.set(hour, entry);
    }

    let best: StudyTimeInsight | null = null;

    for (const [hour, { good, total }] of byHour) {
      if (total < 10) continue; // need at least 10 reviews for significance
      const accuracy = Math.round((good / total) * 100);
      if (!best || accuracy > best.accuracy) {
        const label = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;
        best = { hour, label, accuracy, reviewCount: total };
      }
    }

    return best;
  }
