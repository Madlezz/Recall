import { fsrs, Rating, State, Card as FSRSCard } from "ts-fsrs";
import type { Card, ReviewRating, CardState } from "@/types";

const DEFAULT_RETENTION = 0.9;

let _customWeights: number[] | null = null;

/** Set custom FSRS weights (null = use defaults). */
export function setCustomWeights(weights: number[] | null): void {
  _customWeights = weights;
}

/** Get current custom weights (null = using defaults). */
export function getCustomWeights(): number[] | null {
  return _customWeights;
}

/** Format a millisecond duration into a human-readable interval string. */
export function formatInterval(ms: number): string {
  if (ms <= 0) return "<1m";
  const minutes = ms / 60_000;
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;
  const months = days / 30;
  if (months < 12) return `${months.toFixed(1)}mo`;
  const years = days / 365;
  return `${years.toFixed(1)}y`;
}

/** Preview the next interval for each rating without mutating the card. */
export function previewIntervals(
  card: Card,
  desiredRetention = DEFAULT_RETENTION,
  now = new Date()
): { again: string; hard: string; good: string; easy: string } {
  const f = fsrs({ request_retention: desiredRetention, w: _customWeights ?? undefined });

  const fsrsState =
    card.state === "new"
      ? State.New
      : card.state === "learning" || card.state === "relearning"
        ? State.Learning
        : State.Review;

  const schedulingCard: FSRSCard = {
    due: new Date(card.nextReviewDate),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: 0,
    state: fsrsState,
    last_review: card.lastReviewDate
      ? new Date(card.lastReviewDate)
      : undefined,
  };

  const recordLog = f.repeat(schedulingCard, now);

  const dueMs = (rating: 1 | 2 | 3 | 4): number => {
    const dueDate = recordLog[rating].card.due;
    return dueDate.getTime() - now.getTime();
  };

  return {
    again: formatInterval(dueMs(Rating.Again)),
    hard: formatInterval(dueMs(Rating.Hard)),
    good: formatInterval(dueMs(Rating.Good)),
    easy: formatInterval(dueMs(Rating.Easy)),
  };
}

export function getDueCards(cards: Card[], now = new Date()): Card[] {
  return cards
    .filter((card) => new Date(card.nextReviewDate) <= now)
    .sort(
      (a, b) =>
        new Date(a.nextReviewDate).getTime() -
        new Date(b.nextReviewDate).getTime()
    );
}

export function applyReview(card: Card, rating: ReviewRating, reviewedAt: Date, desiredRetention = DEFAULT_RETENTION): Card {
  const f = fsrs({ request_retention: desiredRetention, w: _customWeights ?? undefined });
  const fsrsRating =
    rating === "again"
      ? Rating.Again
      : rating === "hard"
        ? Rating.Hard
        : rating === "good"
          ? Rating.Good
          : Rating.Easy;

  const fsrsState =
    card.state === "new"
      ? State.New
      : card.state === "learning" || card.state === "relearning"
        ? State.Learning
        : State.Review;

  const schedulingCard: FSRSCard = {
    due: new Date(card.nextReviewDate),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: 0,
    state: fsrsState,
    last_review: card.lastReviewDate
      ? new Date(card.lastReviewDate)
      : undefined,
  };

  const recordLog = f.repeat(schedulingCard, reviewedAt);
  const s = recordLog[fsrsRating].card;

  const newState: CardState =
    s.state === State.New
      ? "new"
      : s.state === State.Learning
        ? "learning"
        : s.state === State.Review
          ? "review"
          : "relearning";

  return {
    ...card,
    state: newState,
    lastReviewDate: reviewedAt.toISOString(),
    nextReviewDate: s.due.toISOString(),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsedDays: s.elapsed_days,
    scheduledDays: s.scheduled_days,
    reps: s.reps,
    lapses: s.lapses,
    updatedAt: reviewedAt.toISOString(),
  };
}

export function calculateNextReview(
  card: Card,
  rating: ReviewRating,
  desiredRetention = DEFAULT_RETENTION
): Partial<Card> {
  const { id: _id, deckId: _deckId, front: _front, back: _back, hint: _hint, tags: _tags, createdAt: _createdAt, ...rest } = applyReview(card, rating, new Date(), desiredRetention);
  return rest;
}

export function createNewCard(
  deckId: string,
  front: string,
  back: string,
  hint: string,
  tags: string[]
): Card {
  const now = new Date().toISOString();
  const isCloze = /\{\{c\d+::[^}]+\}\}/.test(front);
  return {
    id: crypto.randomUUID(),
    deckId,
    front,
    back,
    hint,
    source: "",
    tags,
    cardType: isCloze ? "cloze" : "basic",
    state: "new",
    lastReviewDate: null,
    nextReviewDate: now,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    createdAt: now,
    updatedAt: now,
  };
}
