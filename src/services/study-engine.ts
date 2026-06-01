import { addDays } from "date-fns";
import type { Card, ReviewResult } from "@/types";

export function applyReviewResult(card: Card, result: ReviewResult, reviewedAt = new Date()): Card {
  const reviewedAtIso = reviewedAt.toISOString();

  if (result === "incorrect") {
    return {
      ...card,
      status: "learning",
      incorrectCount: card.incorrectCount + 1,
      streak: 0,
      lastReviewedAt: reviewedAtIso,
      nextReviewAt: addDays(reviewedAt, 1).toISOString(),
      updatedAt: reviewedAtIso,
    };
  }

  const nextStreak = card.streak + 1;
  const intervalDays = Math.max(1, 2 ** (nextStreak - 1));

  return {
    ...card,
    status: nextStreak >= 5 ? "mastered" : "learning",
    correctCount: card.correctCount + 1,
    streak: nextStreak,
    lastReviewedAt: reviewedAtIso,
    nextReviewAt: addDays(reviewedAt, intervalDays).toISOString(),
    updatedAt: reviewedAtIso,
  };
}
