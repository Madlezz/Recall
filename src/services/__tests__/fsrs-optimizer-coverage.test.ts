import { describe, it, expect } from "vitest";
import { optimizeFromHistory, formatOptimizationResult } from "../fsrs-optimizer";
import { default_w } from "ts-fsrs";
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

/**
 * Helper: create N unique cards and first-review logs for each.
 * Each card gets exactly one "first" review log with the given rating pattern.
 * Also generates extra logs on card-0 to reach the minimum 50 total.
 */
function makeCardsWithFirstReviews(
  count: number,
  ratingPattern: (index: number) => "again" | "hard" | "good" | "easy",
  extraLogsNeeded: number = 50,
): { cards: Card[]; logs: ReviewLog[] } {
  const cards: Card[] = [];
  const logs: ReviewLog[] = [];

  for (let i = 0; i < count; i++) {
    const cardId = `card-${i}`;
    cards.push(makeCard({ id: cardId }));
    logs.push(
      makeReviewLog({
        id: `first-${i}`,
        cardId,
        rating: ratingPattern(i),
        reviewDate: `2026-06-${String(1 + (i % 28)).padStart(2, "0")}T00:00:00.000Z`,
      }),
    );
  }

  // Add extra logs on card-0 to ensure we pass the 50-review minimum
  const remaining = Math.max(0, extraLogsNeeded - logs.length);
  for (let i = 0; i < remaining; i++) {
    logs.push(
      makeReviewLog({
        id: `extra-${i}`,
        cardId: "card-0",
        rating: "good",
        reviewDate: `2026-07-${String(1 + (i % 28)).padStart(2, "0")}T00:00:00.000Z`,
      }),
    );
  }

  return { cards, logs };
}

describe("fsrs-optimizer coverage boost", () => {
  describe("first-review weight adjustments (lines 74-93)", () => {
    it("reduces w0 when againRatio > 0.3 (many Again first reviews)", () => {
      // 15 cards, 8 with "again" first review = 53% again ratio (>0.3)
      const { cards, logs } = makeCardsWithFirstReviews(15, (i) => {
        if (i < 8) return "again";
        if (i < 12) return "good";
        return "easy";
      });

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);
      expect(result.weights[0]).toBeCloseTo(default_w[0] * 0.8, 5);
    });

    it("increases w0 when againRatio < 0.1 (few Again first reviews)", () => {
      // 15 cards, 0 with "again" = 0% again ratio (<0.1)
      const { cards, logs } = makeCardsWithFirstReviews(15, (i) => {
        if (i < 10) return "good";
        return "easy";
      });

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);
      expect(result.weights[0]).toBeCloseTo(default_w[0] * 1.2, 5);
    });

    it("increases w2 when goodEasyRatio > 0.7", () => {
      // 15 cards: 10 good + 3 easy = 13/15 = 87% good+easy (>0.7)
      const { cards, logs } = makeCardsWithFirstReviews(15, (i) => {
        if (i < 10) return "good";
        if (i < 13) return "easy";
        return "hard";
      });

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);
      expect(result.weights[2]).toBeCloseTo(default_w[2] * 1.15, 5);
    });

    it("reduces w2 when goodEasyRatio < 0.5", () => {
      // 15 cards: 4 good + 2 easy = 6/15 = 40% good+easy (<0.5)
      const { cards, logs } = makeCardsWithFirstReviews(15, (i) => {
        if (i < 4) return "good";
        if (i < 6) return "easy";
        if (i < 10) return "hard";
        return "again";
      });

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);
      expect(result.weights[2]).toBeCloseTo(default_w[2] * 0.9, 5);
    });

    it("increases w3 when easyCount/totalCount > 0.2", () => {
      // 15 cards: 5 easy = 33% easy (>0.2)
      const { cards, logs } = makeCardsWithFirstReviews(15, (i) => {
        if (i < 5) return "easy";
        if (i < 12) return "good";
        return "hard";
      });

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);
      expect(result.weights[3]).toBeCloseTo(default_w[3] * 1.1, 5);
    });

    it("does NOT increase w3 when easyCount/totalCount <= 0.2", () => {
      // 15 cards: 2 easy = 13% easy (<=0.2)
      const { cards, logs } = makeCardsWithFirstReviews(15, (i) => {
        if (i < 2) return "easy";
        if (i < 12) return "good";
        return "hard";
      });

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);
      expect(result.weights[3]).toBeCloseTo(default_w[3], 5);
    });

    it("combines multiple adjustments: high again + low goodEasy", () => {
      // 15 cards: 6 again (40% > 0.3), 3 good + 1 easy = 4/15 = 27% (< 0.5)
      const { cards, logs } = makeCardsWithFirstReviews(15, (i) => {
        if (i < 6) return "again";
        if (i < 11) return "hard";
        if (i < 14) return "good";
        return "easy";
      });

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);
      // w0 reduced (againRatio > 0.3)
      expect(result.weights[0]).toBeCloseTo(default_w[0] * 0.8, 5);
      // w2 reduced (goodEasyRatio < 0.5)
      expect(result.weights[2]).toBeCloseTo(default_w[2] * 0.9, 5);
    });

    it("skips weight adjustments when fewer than 10 unique cards have first reviews", () => {
      // Only 5 unique cards — analyzeFirstReviews returns hasData=false
      const cards: Card[] = [];
      const logs: ReviewLog[] = [];
      for (let i = 0; i < 5; i++) {
        const cardId = `card-${i}`;
        cards.push(makeCard({ id: cardId }));
        logs.push(
          makeReviewLog({
            id: `first-${i}`,
            cardId,
            rating: "again",
            reviewDate: "2026-06-01T00:00:00.000Z",
          }),
        );
      }
      // Add extra logs to reach 50
      for (let i = 0; i < 50; i++) {
        logs.push(
          makeReviewLog({
            id: `extra-${i}`,
            cardId: "card-0",
            rating: "again",
            reviewDate: `2026-07-${String(1 + (i % 28)).padStart(2, "0")}T00:00:00.000Z`,
          }),
        );
      }

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);
      // All weights should be default since hasData is false
      expect(result.weights[0]).toBeCloseTo(default_w[0], 5);
      expect(result.weights[2]).toBeCloseTo(default_w[2], 5);
      expect(result.weights[3]).toBeCloseTo(default_w[3], 5);
    });
  });

  describe("analyzeFirstReviews — counts (lines 164-172)", () => {
    it("correctly counts rating distribution from first reviews", () => {
      // Create 12 unique cards with known first-review ratings
      // 3 again, 2 hard, 5 good, 2 easy
      const { cards, logs } = makeCardsWithFirstReviews(12, (i) => {
        if (i < 3) return "again";
        if (i < 5) return "hard";
        if (i < 10) return "good";
        return "easy";
      });

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);

      // againRatio = 3/12 = 0.25 (between 0.1 and 0.3, so no w0 adjustment)
      expect(result.weights[0]).toBeCloseTo(default_w[0], 5);

      // goodEasyRatio = (5+2)/12 = 0.583 (between 0.5 and 0.7, so no w2 adjustment)
      expect(result.weights[2]).toBeCloseTo(default_w[2], 5);

      // easyRatio = 2/12 = 0.167 (<=0.2, so no w3 adjustment)
      expect(result.weights[3]).toBeCloseTo(default_w[3], 5);
    });
  });

  describe("calculateOptimalRetention (line 195 and branches)", () => {
    it("returns currentRetention when actualRetention is in [0.8, 0.9)", () => {
      // 100 logs: 82 good + 3 easy = 85% retention (in [0.8, 0.9))
      // Use 15 unique cards so first-review analysis doesn't interfere
      const cards: Card[] = [];
      const logs: ReviewLog[] = [];

      for (let i = 0; i < 15; i++) {
        cards.push(makeCard({ id: `card-${i}` }));
      }

      // 82 good logs
      for (let i = 0; i < 82; i++) {
        logs.push(makeReviewLog({
          id: `g-${i}`,
          cardId: `card-${i % 15}`,
          rating: "good",
          reviewDate: `2026-06-${String(1 + (i % 28)).padStart(2, "0")}T00:00:00.000Z`,
        }));
      }
      // 3 easy logs
      for (let i = 0; i < 3; i++) {
        logs.push(makeReviewLog({
          id: `e-${i}`,
          cardId: `card-${i % 15}`,
          rating: "easy",
          reviewDate: `2026-07-0${i + 1}T00:00:00.000Z`,
        }));
      }
      // 5 hard logs
      for (let i = 0; i < 5; i++) {
        logs.push(makeReviewLog({
          id: `h-${i}`,
          cardId: `card-${i % 15}`,
          rating: "hard",
          reviewDate: `2026-07-1${i}T00:00:00.000Z`,
        }));
      }
      // 10 again logs
      for (let i = 0; i < 10; i++) {
        logs.push(makeReviewLog({
          id: `a-${i}`,
          cardId: `card-${i % 15}`,
          rating: "again",
          reviewDate: `2026-07-2${i}T00:00:00.000Z`,
        }));
      }

      // Total: 100 logs, good+easy = 85 → actualRetention = 0.85
      const currentRetention = 0.88;
      const result = optimizeFromHistory(logs, cards, currentRetention);

      expect(result.success).toBe(true);
      expect(result.actualRetention).toBeCloseTo(0.85, 1);
      // When actualRetention in [0.8, 0.9), optimal = currentRetention
      expect(result.suggestedRetention).toBe(currentRetention);
    });

    it("returns currentRetention - 0.05 (clamped min 0.80) when actualRetention >= 0.9", () => {
      // 100 logs: all good = 100% retention (>=0.9)
      const logs = Array.from({ length: 100 }, (_, i) =>
        makeReviewLog({ id: `r-${i}`, cardId: "card-0", rating: "good" }),
      );
      const cards = [makeCard({ id: "card-0" })];

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);
      expect(result.actualRetention).toBeCloseTo(1.0, 1);
      // optimal = max(0.80, 0.9 - 0.05) = 0.85
      expect(result.suggestedRetention).toBeCloseTo(0.85, 5);
    });

    it("adds 0.02 to retention when actualRetention is in [0.7, 0.8)", () => {
      // 100 logs: 72 good + 3 easy = 75% retention (in [0.7, 0.8))
      const logs: ReviewLog[] = [
        ...Array.from({ length: 72 }, (_, i) =>
          makeReviewLog({ id: `g-${i}`, cardId: "card-0", rating: "good" }),
        ),
        ...Array.from({ length: 3 }, (_, i) =>
          makeReviewLog({ id: `e-${i}`, cardId: "card-0", rating: "easy" }),
        ),
        ...Array.from({ length: 15 }, (_, i) =>
          makeReviewLog({ id: `h-${i}`, cardId: "card-0", rating: "hard" }),
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          makeReviewLog({ id: `a-${i}`, cardId: "card-0", rating: "again" }),
        ),
      ];
      const cards = [makeCard({ id: "card-0" })];

      const result = optimizeFromHistory(logs, cards, 0.85);
      expect(result.success).toBe(true);
      expect(result.actualRetention).toBeCloseTo(0.75, 1);
      // optimal = min(0.92, 0.85 + 0.02) = 0.87
      expect(result.suggestedRetention).toBeCloseTo(0.87, 5);
    });

    it("adds 0.05 to retention when actualRetention < 0.7", () => {
      // 100 logs: 30 good + 5 easy = 35% retention (<0.7)
      const logs: ReviewLog[] = [
        ...Array.from({ length: 30 }, (_, i) =>
          makeReviewLog({ id: `g-${i}`, cardId: "card-0", rating: "good" }),
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          makeReviewLog({ id: `e-${i}`, cardId: "card-0", rating: "easy" }),
        ),
        ...Array.from({ length: 65 }, (_, i) =>
          makeReviewLog({ id: `a-${i}`, cardId: "card-0", rating: "again" }),
        ),
      ];
      const cards = [makeCard({ id: "card-0" })];

      const result = optimizeFromHistory(logs, cards, 0.85);
      expect(result.success).toBe(true);
      expect(result.actualRetention).toBeCloseTo(0.35, 1);
      // optimal = min(0.95, 0.85 + 0.05) = 0.90
      expect(result.suggestedRetention).toBeCloseTo(0.9, 5);
    });

    it("clamps suggested retention to minimum 0.75", () => {
      // Very high retention + very low current retention
      const logs = Array.from({ length: 100 }, (_, i) =>
        makeReviewLog({ id: `r-${i}`, cardId: "card-0", rating: "good" }),
      );
      const cards = [makeCard({ id: "card-0" })];

      // currentRetention = 0.70, actualRetention ~ 1.0 (>=0.9)
      // optimal = max(0.80, 0.70 - 0.05) = 0.80
      // then clamped: max(0.75, min(0.95, 0.80)) = 0.80
      const result = optimizeFromHistory(logs, cards, 0.7);
      expect(result.success).toBe(true);
      expect(result.suggestedRetention).toBeGreaterThanOrEqual(0.75);
    });

    it("clamps suggested retention to maximum 0.95", () => {
      // Very low retention + very high current retention
      const logs: ReviewLog[] = [
        ...Array.from({ length: 10 }, (_, i) =>
          makeReviewLog({ id: `g-${i}`, cardId: "card-0", rating: "good" }),
        ),
        ...Array.from({ length: 90 }, (_, i) =>
          makeReviewLog({ id: `a-${i}`, cardId: "card-0", rating: "again" }),
        ),
      ];
      const cards = [makeCard({ id: "card-0" })];

      // currentRetention = 0.99, actualRetention = 0.10 (<0.7)
      // optimal = min(0.95, 0.99 + 0.05) = min(0.95, 1.04) = 0.95
      const result = optimizeFromHistory(logs, cards, 0.99);
      expect(result.success).toBe(true);
      expect(result.suggestedRetention).toBeLessThanOrEqual(0.95);
    });
  });

  describe("formatOptimizationResult additional cases", () => {
    it("formats failure with default message when error is undefined", () => {
      const result = {
        weights: [],
        suggestedRetention: 0.9,
        actualRetention: 0,
        reviewCount: 0,
        success: false,
        // no error field
      };
      const formatted = formatOptimizationResult(result);
      expect(formatted).toBe("Optimization failed");
    });

    it("formats failure with custom error message", () => {
      const result = {
        weights: [],
        suggestedRetention: 0.9,
        actualRetention: 0,
        reviewCount: 5,
        success: false,
        error: "Custom error message",
      };
      const formatted = formatOptimizationResult(result);
      expect(formatted).toBe("Custom error message");
    });
  });

  describe("edge cases for first review date comparison", () => {
    it("picks the earliest review as first review for each card", () => {
      // Card with multiple reviews — the earliest should be counted as first
      const cards: Card[] = [];
      const logs: ReviewLog[] = [];

      // Create 12 cards
      for (let i = 0; i < 12; i++) {
        cards.push(makeCard({ id: `card-${i}` }));
      }

      // For each card, add a LATER "good" review and an EARLIER "again" review
      for (let i = 0; i < 12; i++) {
        // Later review (good)
        logs.push(
          makeReviewLog({
            id: `later-${i}`,
            cardId: `card-${i}`,
            rating: "good",
            reviewDate: "2026-07-15T00:00:00.000Z",
          }),
        );
        // Earlier review (again) — this should be the "first"
        logs.push(
          makeReviewLog({
            id: `earlier-${i}`,
            cardId: `card-${i}`,
            rating: "again",
            reviewDate: "2026-06-01T00:00:00.000Z",
          }),
        );
      }

      // Add extra logs to reach 50
      for (let i = 0; i < 30; i++) {
        logs.push(
          makeReviewLog({
            id: `extra-${i}`,
            cardId: "card-0",
            rating: "good",
            reviewDate: "2026-08-01T00:00:00.000Z",
          }),
        );
      }

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);
      // All 12 first reviews are "again" → againRatio = 1.0 > 0.3
      expect(result.weights[0]).toBeCloseTo(default_w[0] * 0.8, 5);
    });
  });

  describe("no deckId filter — uses all cards and logs", () => {
    it("processes all logs when no deckId is given", () => {
      const cards = [
        makeCard({ id: "c1", deckId: "deck-A" }),
        makeCard({ id: "c2", deckId: "deck-B" }),
      ];
      const logs: ReviewLog[] = [
        ...Array.from({ length: 30 }, (_, i) =>
          makeReviewLog({ id: `a-${i}`, cardId: "c1", rating: "good" }),
        ),
        ...Array.from({ length: 30 }, (_, i) =>
          makeReviewLog({ id: `b-${i}`, cardId: "c2", rating: "easy" }),
        ),
      ];

      const result = optimizeFromHistory(logs, cards, 0.9);
      expect(result.success).toBe(true);
      expect(result.reviewCount).toBe(60);
      // All good or easy → 100% retention
      expect(result.actualRetention).toBeCloseTo(1.0, 1);
    });
  });
});
