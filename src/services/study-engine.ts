import { addDays } from "date-fns";
import type { Card, ReviewResult } from "@/types";

export function applyReviewResult(card: Card, result: ReviewResult, reviewedAt = new Date()): Card {
  const reviewedAtIso = reviewedAt.toISOString();

  if (result === "incorrect") {
    // SM-2 quality 0
    const nextEase = Math.max(1.3, card.easeFactor - 0.8);
    return {
      ...card,
      status: "learning",
      incorrectCount: card.incorrectCount + 1,
      streak: 0,
      easeFactor: nextEase,
      lastReviewedAt: reviewedAtIso,
      nextReviewAt: addDays(reviewedAt, 1).toISOString(),
      updatedAt: reviewedAtIso,
    };
  }

  // SM-2 quality 4 (we map "correct" to 4 since we don't have good/easy/hard buttons)
  const quality = 4;
  const nextEase = Math.max(1.3, card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const nextStreak = card.streak + 1;
  
  let intervalDays: number;
  if (nextStreak === 1) {
    intervalDays = 1;
  } else if (nextStreak === 2) {
    intervalDays = 6;
  } else {
    // Original SM-2 uses previous interval. We approximate interval by taking current date diff
    // but the simplest SM-2 just multiplies previous interval by ease.
    // If we don't store previous interval, we can use a basic streak-based estimation:
    intervalDays = Math.max(1, Math.round(6 * Math.pow(nextEase, nextStreak - 2)));
  }

  return {
    ...card,
    status: nextStreak >= 5 ? "mastered" : "learning",
    correctCount: card.correctCount + 1,
    streak: nextStreak,
    easeFactor: nextEase,
    lastReviewedAt: reviewedAtIso,
    nextReviewAt: addDays(reviewedAt, intervalDays).toISOString(),
    updatedAt: reviewedAtIso,
  };
}
