import { describe, it, expect } from "vitest";
import { calculateNextReview, createNewCard } from "../fsrs-engine";
import type { Card } from "@/types";

describe("FSRS Engine", () => {
  it("should schedule new card correctly on 'good'", () => {
    const card = createNewCard("deck-1", "front", "back", "", []);
    const updated = calculateNextReview(card, "good");

    expect(updated.state).toBe("learning");
    expect(updated.reps).toBe(1);
  });

  it("should reset interval on 'again'", () => {
    // Simulate a card already in review state with established scheduling
    const reviewCard: Card = {
      id: "test-1",
      deckId: "deck-1",
      front: "front",
      back: "back",
      hint: "",
      tags: [],
      state: "review",
      lastReviewDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      nextReviewDate: new Date().toISOString(),
      stability: 5.0,
      difficulty: 4.0,
      elapsedDays: 5,
      scheduledDays: 5,
      reps: 10,
      lapses: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = calculateNextReview(reviewCard, "again");

    expect(result.scheduledDays).toBeLessThan(reviewCard.scheduledDays);
    expect(result.lapses).toBe(1);
    expect(result.state).toBe("relearning");
  });
});
