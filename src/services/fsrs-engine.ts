import { fsrs, Rating, State, Card as FSRSCard } from "ts-fsrs";
import type { Card, ReviewRating, CardState } from "@/types";

const f = fsrs();

export function getDueCards(cards: Card[], now = new Date()): Card[] {
  return cards
    .filter((card) => new Date(card.nextReviewDate) <= now)
    .sort(
      (a, b) =>
        new Date(a.nextReviewDate).getTime() -
        new Date(b.nextReviewDate).getTime()
    );
}

export function calculateNextReview(
  card: Card,
  rating: ReviewRating
): Partial<Card> {
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

  const recordLog = f.repeat(schedulingCard, new Date());
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
    state: newState,
    lastReviewDate: new Date().toISOString(),
    nextReviewDate: s.due.toISOString(),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsedDays: s.elapsed_days,
    scheduledDays: s.scheduled_days,
    reps: s.reps,
    lapses: s.lapses,
    updatedAt: new Date().toISOString(),
  };
}

export function createNewCard(
  deckId: string,
  front: string,
  back: string,
  hint: string,
  tags: string[]
): Card {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    deckId,
    front,
    back,
    hint,
    tags,
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
