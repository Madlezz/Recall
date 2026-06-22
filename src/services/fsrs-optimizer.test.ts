import { describe, it, expect } from "vitest";
import { optimizeFromHistory, formatOptimizationResult } from "./fsrs-optimizer";
import type { ReviewLog, Card } from "@/types";

function makeReviewLog(overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: crypto.randomUUID(),
    cardId: "card-1",
    rating: "good",
    reviewDate: "2026-06-01T00:00:00.000Z",
    stability: 1,
    difficulty: 5,
    elapsedDays: 1,
    scheduledDays: 1,
    ...overrides,
  };
}

function makeCard(overrides: Partial<Card> = {}): Card {
  const now = new Date().toISOString();
  return {
    id: "card-1",
    deckId: "deck-1",
    front: "Q",
    back: "A",
    hint: "",
    source: "",
    tags: [],
    cardType: "basic",
    state: "review",
    lastReviewDate: now,
    nextReviewDate: now,
    stability: 1,
    difficulty: 5,
    elapsedDays: 1,
    scheduledDays: 1,
    reps: 1,
    lapses: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("fsrs-optimizer", () => {
  describe("optimizeFromHistory", () => {
    it("returns error when fewer than 50 reviews", () => {
      const logs = Array.from({ length: 30 }, () => makeReviewLog());
      const cards = [makeCard()];
      const result = optimizeFromHistory(logs, cards, 0.9);

      expect(result.success).toBe(false);
      expect(result.reviewCount).toBe(30);
      expect(result.error).toContain("Need at least 50 reviews");
    });

    it("calculates retention rate from review logs", () => {
      // 60 good, 20 again, 10 hard, 10 easy = 70% retention (good+easy = 70/100)
      const logs: ReviewLog[] = [
        ...Array.from({ length: 60 }, () => makeReviewLog({ rating: "good" })),
        ...Array.from({ length: 20 }, () => makeReviewLog({ rating: "again" })),
        ...Array.from({ length: 10 }, () => makeReviewLog({ rating: "hard" })),
        ...Array.from({ length: 10 }, () => makeReviewLog({ rating: "easy" })),
      ];
      const cards = [makeCard()];
      const result = optimizeFromHistory(logs, cards, 0.9);

      expect(result.success).toBe(true);
      expect(result.actualRetention).toBeCloseTo(0.7, 1);
    });

    it("suggests higher retention when user struggles", () => {
      // Low retention: mostly "again" ratings
      const logs: ReviewLog[] = [
        ...Array.from({ length: 40 }, () => makeReviewLog({ rating: "again" })),
        ...Array.from({ length: 30 }, () => makeReviewLog({ rating: "good" })),
        ...Array.from({ length: 20 }, () => makeReviewLog({ rating: "hard" })),
        ...Array.from({ length: 10 }, () => makeReviewLog({ rating: "easy" })),
      ];
      const cards = [makeCard()];
      const result = optimizeFromHistory(logs, cards, 0.9);

      expect(result.success).toBe(true);
      expect(result.suggestedRetention).toBeGreaterThan(0.9);
    });

    it("suggests lower retention when user excels", () => {
      // High retention: mostly "good" and "easy" ratings
      const logs: ReviewLog[] = [
        ...Array.from({ length: 70 }, () => makeReviewLog({ rating: "good" })),
        ...Array.from({ length: 20 }, () => makeReviewLog({ rating: "easy" })),
        ...Array.from({ length: 5 }, () => makeReviewLog({ rating: "hard" })),
        ...Array.from({ length: 5 }, () => makeReviewLog({ rating: "again" })),
      ];
      const cards = [makeCard()];
      const result = optimizeFromHistory(logs, cards, 0.9);

      expect(result.success).toBe(true);
      expect(result.suggestedRetention).toBeLessThanOrEqual(0.9);
    });

    it("returns 21 weights", () => {
      const logs = Array.from({ length: 100 }, () => makeReviewLog({ rating: "good" }));
      const cards = [makeCard()];
      const result = optimizeFromHistory(logs, cards, 0.9);

      expect(result.success).toBe(true);
      expect(result.weights).toHaveLength(21);
    });

    it("clamps suggested retention to [0.75, 0.95]", () => {
      // Extreme case: all "again"
      const logs = Array.from({ length: 100 }, () => makeReviewLog({ rating: "again" }));
      const cards = [makeCard()];
      const result = optimizeFromHistory(logs, cards, 0.9);

      expect(result.suggestedRetention).toBeGreaterThanOrEqual(0.75);
      expect(result.suggestedRetention).toBeLessThanOrEqual(0.95);
    });
  });

  describe("formatOptimizationResult", () => {
    it("formats success result", () => {
      const logs = Array.from({ length: 100 }, () => makeReviewLog({ rating: "good" }));
      const cards = [makeCard()];
      const result = optimizeFromHistory(logs, cards, 0.9);

      const formatted = formatOptimizationResult(result);
      expect(formatted).toContain("Analyzed 100 reviews");
      expect(formatted).toContain("retention");
    });

    it("formats error result", () => {
      const logs = Array.from({ length: 10 }, () => makeReviewLog());
      const cards = [makeCard()];
      const result = optimizeFromHistory(logs, cards, 0.9);

      const formatted = formatOptimizationResult(result);
      expect(formatted).toContain("Need at least 50 reviews");
    });
  });
});
