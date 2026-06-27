import { describe, it, expect } from "vitest";
import {
  isCardDue,
  isCardDueToday,
  getDeckStats,
  getDueTodayCount,
  getNewCount,
  getLearningCount,
  getNewCardsReviewedToday,
  getOverdueCount,
  getLeechCount,
  getEstimatedReviewMinutes,
  getDeckHealth,
  getStudyStreak,
  getDueForecast,
  getForgettingCurve,
  getBestStudyTime,
} from "../stats";
import type { Card, Deck, ReviewLog } from "@/types";

// ── Helpers ──

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: "test-card",
    deckId: "deck-1",
    front: "front",
    back: "back",
    hint: "",
    source: "",
    tags: [],
    cardType: "basic",
    state: "review",
    lastReviewDate: new Date().toISOString(),
    nextReviewDate: new Date().toISOString(),
    stability: 5,
    difficulty: 4,
    elapsedDays: 5,
    scheduledDays: 5,
    reps: 10,
    lapses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeDeck(overrides: Partial<Deck>): Deck {
  return {
    id: "deck-1",
    name: "Test Deck",
    description: "",
    color: "blue",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeReviewLog(overrides: Partial<ReviewLog>): ReviewLog {
  return {
    id: "log-1",
    cardId: "card-1",
    rating: "good",
    reviewDate: new Date().toISOString(),
    stability: 5,
    difficulty: 4,
    elapsedDays: 1,
    scheduledDays: 1,
    ...overrides,
  };
}

// ── isCardDue ──

describe("isCardDue", () => {
  it("returns true when nextReviewDate is in the past", () => {
    const card = makeCard({ nextReviewDate: "2020-01-01T00:00:00Z" });
    expect(isCardDue(card, new Date("2026-06-27T12:00:00Z"))).toBe(true);
  });

  it("returns false when nextReviewDate is in the future", () => {
    const card = makeCard({ nextReviewDate: "2030-01-01T00:00:00Z" });
    expect(isCardDue(card, new Date("2026-06-27T12:00:00Z"))).toBe(false);
  });

  it("returns true when nextReviewDate equals at", () => {
    const now = new Date("2026-06-27T12:00:00Z");
    const card = makeCard({ nextReviewDate: now.toISOString() });
    expect(isCardDue(card, now)).toBe(true);
  });
});

// ── isCardDueToday ──

describe("isCardDueToday", () => {
  // Use local-time strings (no Z) so tests are timezone-independent:
  // endOfDay(at) and parseISO both operate in the local timezone.
  it("returns true when card is due later today", () => {
    const at = new Date("2026-06-27T08:00:00");
    const card = makeCard({ nextReviewDate: "2026-06-27T20:00:00" });
    expect(isCardDueToday(card, at)).toBe(true);
  });

  it("returns true when card is due earlier today", () => {
    const at = new Date("2026-06-27T20:00:00");
    const card = makeCard({ nextReviewDate: "2026-06-27T08:00:00" });
    expect(isCardDueToday(card, at)).toBe(true);
  });

  it("returns false when card is due tomorrow", () => {
    const at = new Date("2026-06-27T12:00:00");
    const card = makeCard({ nextReviewDate: "2026-06-28T12:00:00" });
    expect(isCardDueToday(card, at)).toBe(false);
  });
});

// ── getDeckStats ──

describe("getDeckStats", () => {
  it("returns correct stats for a deck with mixed cards", () => {
    const deck = makeDeck({ id: "d1" });
    const cards = [
      makeCard({ id: "c1", deckId: "d1", state: "review", reps: 10, lapses: 2 }),
      makeCard({ id: "c2", deckId: "d1", state: "new", reps: 0, lapses: 0 }),
      makeCard({ id: "c3", deckId: "d1", state: "learning", reps: 5, lapses: 1 }),
      makeCard({ id: "c4", deckId: "d1", state: "relearning", reps: 8, lapses: 0 }),
      makeCard({ id: "c5", deckId: "d2", state: "review", reps: 10, lapses: 0 }), // different deck
    ];
    const stats = getDeckStats(deck, cards);
    expect(stats.total).toBe(4);
    expect(stats.mastered).toBe(1);
    expect(stats.newCards).toBe(1);
    expect(stats.learning).toBe(2); // learning + relearning
    expect(stats.review).toBe(1);
    // accuracy: total reps = 10+0+5+8 = 23, lapses = 2+0+1+0 = 3
    // accuracy = round((23-3)/23 * 100) = round(86.96) = 87
    expect(stats.accuracy).toBe(87);
  });

  it("returns 0 accuracy when no reps", () => {
    const deck = makeDeck({ id: "d1" });
    const cards = [
      makeCard({ id: "c1", deckId: "d1", state: "new", reps: 0, lapses: 0 }),
    ];
    const stats = getDeckStats(deck, cards);
    expect(stats.accuracy).toBe(0);
  });

  it("returns zeros for empty deck", () => {
    const deck = makeDeck({ id: "d1" });
    const stats = getDeckStats(deck, []);
    expect(stats.total).toBe(0);
    expect(stats.mastered).toBe(0);
    expect(stats.due).toBe(0);
    expect(stats.accuracy).toBe(0);
  });
});

// ── getDueTodayCount ──

describe("getDueTodayCount", () => {
  it("counts cards due today", () => {
    // Use local time strings so endOfDay comparison is timezone-safe
    const at = new Date("2026-06-27T12:00:00");
    const cards = [
      makeCard({ id: "c1", nextReviewDate: "2026-06-27T10:00:00" }),
      makeCard({ id: "c2", nextReviewDate: "2026-06-28T10:00:00" }),
      makeCard({ id: "c3", nextReviewDate: "2026-06-27T22:00:00" }),
    ];
    expect(getDueTodayCount(cards, at)).toBe(2);
  });

  it("returns 0 for empty array", () => {
    expect(getDueTodayCount([], new Date())).toBe(0);
  });
});

// ── getNewCount ──

describe("getNewCount", () => {
  it("counts new cards", () => {
    const cards = [
      makeCard({ id: "c1", state: "new" }),
      makeCard({ id: "c2", state: "review" }),
      makeCard({ id: "c3", state: "new" }),
    ];
    expect(getNewCount(cards)).toBe(2);
  });

  it("returns 0 when no new cards", () => {
    const cards = [makeCard({ state: "review" })];
    expect(getNewCount(cards)).toBe(0);
  });
});

// ── getLearningCount ──

describe("getLearningCount", () => {
  it("counts learning and relearning cards", () => {
    const cards = [
      makeCard({ id: "c1", state: "learning" }),
      makeCard({ id: "c2", state: "relearning" }),
      makeCard({ id: "c3", state: "review" }),
      makeCard({ id: "c4", state: "new" }),
    ];
    expect(getLearningCount(cards)).toBe(2);
  });

  it("returns 0 when no learning cards", () => {
    const cards = [makeCard({ state: "review" }), makeCard({ state: "new" })];
    expect(getLearningCount(cards)).toBe(0);
  });
});

// ── getNewCardsReviewedToday ──

describe("getNewCardsReviewedToday", () => {
  it("counts new cards reviewed today (elapsedDays === 0)", () => {
    const at = new Date("2026-06-27T14:00:00Z");
    const logs = [
      makeReviewLog({ id: "l1", reviewDate: "2026-06-27T10:00:00Z", elapsedDays: 0 }),
      makeReviewLog({ id: "l2", reviewDate: "2026-06-27T11:00:00Z", elapsedDays: 0 }),
      makeReviewLog({ id: "l3", reviewDate: "2026-06-27T12:00:00Z", elapsedDays: 5 }), // not new
      makeReviewLog({ id: "l4", reviewDate: "2026-06-26T10:00:00Z", elapsedDays: 0 }), // yesterday
    ];
    expect(getNewCardsReviewedToday(logs, at)).toBe(2);
  });

  it("returns 0 for empty logs", () => {
    expect(getNewCardsReviewedToday([], new Date())).toBe(0);
  });

  it("excludes logs from other days", () => {
    const at = new Date("2026-06-27T14:00:00Z");
    const logs = [
      makeReviewLog({ reviewDate: "2026-06-25T10:00:00Z", elapsedDays: 0 }),
      makeReviewLog({ reviewDate: "2026-06-28T10:00:00Z", elapsedDays: 0 }),
    ];
    expect(getNewCardsReviewedToday(logs, at)).toBe(0);
  });
});

// ── getOverdueCount ──

describe("getOverdueCount", () => {
  it("counts overdue review cards (excluding new and learning)", () => {
    const at = new Date("2026-06-27T12:00:00Z");
    const cards = [
      makeCard({ id: "c1", state: "review", nextReviewDate: "2026-06-25T00:00:00Z" }), // overdue
      makeCard({ id: "c2", state: "review", nextReviewDate: "2026-06-28T00:00:00Z" }), // not overdue
      makeCard({ id: "c3", state: "new", nextReviewDate: "2026-06-25T00:00:00Z" }),     // new, excluded
      makeCard({ id: "c4", state: "learning", nextReviewDate: "2026-06-25T00:00:00Z" }), // learning, excluded
      makeCard({ id: "c5", state: "relearning", nextReviewDate: "2026-06-20T00:00:00Z" }), // overdue
    ];
    expect(getOverdueCount(cards, at)).toBe(2);
  });

  it("returns 0 when no cards are overdue", () => {
    const at = new Date("2026-06-27T12:00:00Z");
    const cards = [
      makeCard({ state: "review", nextReviewDate: "2026-06-28T00:00:00Z" }),
    ];
    expect(getOverdueCount(cards, at)).toBe(0);
  });
});

// ── getLeechCount ──

describe("getLeechCount", () => {
  it("counts cards with lapses >= threshold", () => {
    const cards = [
      makeCard({ id: "c1", lapses: 5 }),
      makeCard({ id: "c2", lapses: 3 }),
      makeCard({ id: "c3", lapses: 7 }),
      makeCard({ id: "c4", lapses: 1 }),
    ];
    expect(getLeechCount(cards, 5)).toBe(2); // c1 and c3
  });

  it("returns 0 when no leeches", () => {
    const cards = [makeCard({ lapses: 1 }), makeCard({ lapses: 2 })];
    expect(getLeechCount(cards, 5)).toBe(0);
  });

  it("includes cards exactly at threshold", () => {
    const cards = [makeCard({ lapses: 5 })];
    expect(getLeechCount(cards, 5)).toBe(1);
  });
});

// ── getEstimatedReviewMinutes ──

describe("getEstimatedReviewMinutes", () => {
  it("estimates time for mixed card states", () => {
    const now = new Date();

    // Use now for due-today review cards so isCardDueToday() returns true.
    const cards = [
      makeCard({ id: "c1", state: "new" }),
      makeCard({ id: "c2", state: "new" }),
      makeCard({ id: "c3", state: "review", nextReviewDate: now.toISOString() }),
      makeCard({ id: "c4", state: "review", nextReviewDate: now.toISOString() }),
      makeCard({ id: "c5", state: "learning" }),
      makeCard({ id: "c6", state: "relearning" }),
    ];

    // newCards = min(2, dailyLimit=5) = 2 -> 2 * 8 = 16s
    // reviewCards (non-new, due today) = 2 -> 2 * 5 = 10s
    // learningCards = 2 -> 2 * 10 = 20s
    // total = 46s -> ceil(46/60) = 1 -> max(1, 1) = 1
    const result = getEstimatedReviewMinutes(cards, 5);
    expect(result).toBe(1);
  });

  it("caps new cards at dailyLimit", () => {
    const cards = [
      makeCard({ id: "c1", state: "new" }),
      makeCard({ id: "c2", state: "new" }),
      makeCard({ id: "c3", state: "new" }),
      makeCard({ id: "c4", state: "new" }),
      makeCard({ id: "c5", state: "new" }),
    ];
    // dailyLimit = 2, so only 2 new cards counted -> 2 * 8 = 16s
    // ceil(16/60) = 1 -> max(1, 1) = 1
    const result = getEstimatedReviewMinutes(cards, 2);
    expect(result).toBe(1);
  });

  it("returns minimum of 1 minute even for small sets", () => {
    const cards = [makeCard({ state: "new" })];
    const result = getEstimatedReviewMinutes(cards, 10);
    expect(result).toBe(1);
  });

  it("returns 1 for empty array (max(1, ...))", () => {
    const result = getEstimatedReviewMinutes([], 10);
    expect(result).toBe(1);
  });

  it("calculates correctly for many due cards", () => {
    // 120 review cards due today -> 120 * 5 = 600s -> 10 minutes
    const cards = Array.from({ length: 120 }, (_, i) =>
      makeCard({
        id: `c${i}`,
        state: "review",
        nextReviewDate: new Date().toISOString(), // due today
      }),
    );
    const result = getEstimatedReviewMinutes(cards, 20);
    expect(result).toBe(10);
  });
});

// ── getDeckHealth ──

describe("getDeckHealth", () => {
  it("computes health metrics for a deck", () => {
    const cards = [
      makeCard({ id: "c1", deckId: "d1", state: "review", stability: 10, lapses: 0 }),
      makeCard({ id: "c2", deckId: "d1", state: "review", stability: 20, lapses: 5 }),
      makeCard({ id: "c3", deckId: "d1", state: "new", stability: 0, lapses: 0 }),
      makeCard({ id: "c4", deckId: "d2", state: "review", stability: 50, lapses: 0 }), // other deck
    ];
    const logs = [
      makeReviewLog({ id: "l1", cardId: "c1", rating: "good" }),
      makeReviewLog({ id: "l2", cardId: "c1", rating: "easy" }),
      makeReviewLog({ id: "l3", cardId: "c2", rating: "again" }),
      makeReviewLog({ id: "l4", cardId: "c2", rating: "good" }),
    ];

    const health = getDeckHealth("d1", cards, logs, 5);
    // retention: good+easy = 3, total = 4 -> round(75) = 75
    expect(health.retention).toBe(75);
    // leeches: c2 has lapses >= 5
    expect(health.leeches).toBe(1);
    // avgStability: (10 + 20) / 2 = 15
    expect(health.avgStability).toBe(15);
  });

  it("returns 0 retention when no logs", () => {
    const cards = [makeCard({ id: "c1", deckId: "d1", state: "review", stability: 10 })];
    const health = getDeckHealth("d1", cards, [], 5);
    expect(health.retention).toBe(0);
    expect(health.leeches).toBe(0);
    expect(health.avgStability).toBe(10);
  });

  it("returns 0 avgStability when no review-state cards", () => {
    const cards = [makeCard({ id: "c1", deckId: "d1", state: "new", stability: 0 })];
    const health = getDeckHealth("d1", cards, [], 5);
    expect(health.avgStability).toBe(0);
  });

  it("counts overdue cards", () => {
    const cards = [
      makeCard({ id: "c1", deckId: "d1", state: "review", nextReviewDate: "2020-01-01T00:00:00Z", stability: 5 }),
      makeCard({ id: "c2", deckId: "d1", state: "new", nextReviewDate: "2020-01-01T00:00:00Z", stability: 0 }),
    ];
    const health = getDeckHealth("d1", cards, [], 5);
    // c1 is overdue (review, past date), c2 is new so excluded
    expect(health.overdue).toBe(1);
  });
});

// ── getStudyStreak ──

describe("getStudyStreak", () => {
  it("returns streak for consecutive days ending today", () => {
    const at = new Date("2026-06-27T12:00:00Z");
    const logs = [
      makeReviewLog({ reviewDate: "2026-06-27T10:00:00Z" }),
      makeReviewLog({ reviewDate: "2026-06-26T10:00:00Z" }),
      makeReviewLog({ reviewDate: "2026-06-25T10:00:00Z" }),
    ];
    expect(getStudyStreak(logs, at)).toBe(3);
  });

  it("returns 1 if only yesterday was studied (streak starts from yesterday)", () => {
    const at = new Date("2026-06-27T12:00:00Z");
    const logs = [
      makeReviewLog({ reviewDate: "2026-06-26T10:00:00Z" }),
    ];
    expect(getStudyStreak(logs, at)).toBe(1);
  });

  it("returns 0 when no reviews in the last 2 days", () => {
    const at = new Date("2026-06-27T12:00:00Z");
    const logs = [
      makeReviewLog({ reviewDate: "2026-06-24T10:00:00Z" }),
    ];
    expect(getStudyStreak(logs, at)).toBe(0);
  });

  it("returns 0 for empty review logs", () => {
    const at = new Date("2026-06-27T12:00:00Z");
    expect(getStudyStreak([], at)).toBe(0);
  });

  it("breaks streak on a gap day", () => {
    const at = new Date("2026-06-27T12:00:00Z");
    const logs = [
      makeReviewLog({ reviewDate: "2026-06-27T10:00:00Z" }),
      makeReviewLog({ reviewDate: "2026-06-26T10:00:00Z" }),
      // gap on 2026-06-25
      makeReviewLog({ reviewDate: "2026-06-24T10:00:00Z" }),
    ];
    expect(getStudyStreak(logs, at)).toBe(2);
  });

  it("handles multiple reviews on the same day as one streak day", () => {
    const at = new Date("2026-06-27T12:00:00Z");
    const logs = [
      makeReviewLog({ id: "l1", reviewDate: "2026-06-27T08:00:00Z" }),
      makeReviewLog({ id: "l2", reviewDate: "2026-06-27T09:00:00Z" }),
      makeReviewLog({ id: "l3", reviewDate: "2026-06-27T10:00:00Z" }),
    ];
    expect(getStudyStreak(logs, at)).toBe(1);
  });
});

// ── getDueForecast ──

describe("getDueForecast", () => {
  it("returns correct number of days", () => {
    const result = getDueForecast([], 14);
    expect(result).toHaveLength(14);
  });

  it("defaults to 30 days", () => {
    const result = getDueForecast([]);
    expect(result).toHaveLength(30);
  });

  it("excludes new cards from forecast", () => {
    const cards = [makeCard({ state: "new", nextReviewDate: "2099-01-01T00:00:00Z" })];
    const result = getDueForecast(cards, 7);
    const total = result.reduce((sum, d) => sum + d.count, 0);
    expect(total).toBe(0);
  });

  it("counts cards due in future days", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const cards = [
      makeCard({ id: "c1", state: "review", nextReviewDate: futureDate.toISOString() }),
      makeCard({ id: "c2", state: "review", nextReviewDate: futureDate.toISOString() }),
    ];
    const result = getDueForecast(cards, 7);
    // Should have 2 cards on day 3
    expect(result[3].count).toBe(2);
  });

  it("excludes cards already past due (not after now)", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const cards = [
      makeCard({ state: "review", nextReviewDate: pastDate.toISOString() }),
    ];
    const result = getDueForecast(cards, 7);
    const total = result.reduce((sum, d) => sum + d.count, 0);
    expect(total).toBe(0);
  });

  it("returns date strings in YYYY-MM-DD format", () => {
    const result = getDueForecast([], 3);
    for (const day of result) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

// ── getForgettingCurve ──

describe("getForgettingCurve", () => {
  it("returns empty array for no logs", () => {
    expect(getForgettingCurve([])).toEqual([]);
  });

  it("buckets reviews by scheduledDays interval", () => {
    const logs = [
      makeReviewLog({ id: "l1", scheduledDays: 1, rating: "good" }),
      makeReviewLog({ id: "l2", scheduledDays: 1, rating: "again" }),
      makeReviewLog({ id: "l3", scheduledDays: 5, rating: "easy" }),
      makeReviewLog({ id: "l4", scheduledDays: 10, rating: "good" }),
      makeReviewLog({ id: "l5", scheduledDays: 20, rating: "hard" }),
      makeReviewLog({ id: "l6", scheduledDays: 45, rating: "good" }),
    ];
    const result = getForgettingCurve(logs);

    // Should have entries for buckets with data
    expect(result.length).toBeGreaterThan(0);

    // 1d bucket: 1 good out of 2 = 50%
    const oneDayBucket = result.find((p) => p.interval === "1d");
    expect(oneDayBucket).toBeDefined();
    expect(oneDayBucket!.retention).toBe(50);
    expect(oneDayBucket!.reviewCount).toBe(2);

    // 4-7d bucket: 1 easy out of 1 = 100%
    const weekBucket = result.find((p) => p.interval === "4-7d");
    expect(weekBucket).toBeDefined();
    expect(weekBucket!.retention).toBe(100);
    expect(weekBucket!.reviewCount).toBe(1);

    // 8-14d bucket: 1 good out of 1 = 100%
    const twoWeekBucket = result.find((p) => p.interval === "8-14d");
    expect(twoWeekBucket).toBeDefined();
    expect(twoWeekBucket!.retention).toBe(100);

    // 15-30d bucket: 1 hard out of 1 = 0%
    const monthBucket = result.find((p) => p.interval === "15-30d");
    expect(monthBucket).toBeDefined();
    expect(monthBucket!.retention).toBe(0);

    // 30d+ bucket: 1 good out of 1 = 100%
    const longBucket = result.find((p) => p.interval === "30d+");
    expect(longBucket).toBeDefined();
    expect(longBucket!.retention).toBe(100);
  });

  it("filters out buckets with no data", () => {
    const logs = [
      makeReviewLog({ scheduledDays: 1, rating: "good" }),
    ];
    const result = getForgettingCurve(logs);
    expect(result).toHaveLength(1);
    expect(result[0].interval).toBe("1d");
  });

  it("handles 2-3d bucket", () => {
    const logs = [
      makeReviewLog({ id: "l1", scheduledDays: 2, rating: "good" }),
      makeReviewLog({ id: "l2", scheduledDays: 3, rating: "again" }),
    ];
    const result = getForgettingCurve(logs);
    const bucket = result.find((p) => p.interval === "2-3d");
    expect(bucket).toBeDefined();
    expect(bucket!.retention).toBe(50);
    expect(bucket!.reviewCount).toBe(2);
  });
});

// ── getBestStudyTime ──

describe("getBestStudyTime", () => {
  it("returns null for empty logs", () => {
    expect(getBestStudyTime([])).toBeNull();
  });

  it("returns null when no hour has at least 10 reviews", () => {
    const logs = Array.from({ length: 5 }, (_, i) =>
      makeReviewLog({
        id: `l${i}`,
        reviewDate: `2026-06-27T10:${i.toString().padStart(2, "0")}:00Z`,
        rating: "good",
      }),
    );
    expect(getBestStudyTime(logs)).toBeNull();
  });

  it("returns the hour with highest accuracy when >= 10 reviews", () => {
    // 12 reviews at hour 10 (local): 10 good, 2 again -> 83%
    // 10 reviews at hour 15 (local): 5 good, 5 again -> 50%
    // Use local-time strings (no Z) so getHours() matches the hour in the string.
    const logs = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeReviewLog({
          id: `l-am-${i}`,
          reviewDate: `2026-06-27T10:${i.toString().padStart(2, "0")}:00`,
          rating: "good" as const,
        }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        makeReviewLog({
          id: `l-am-bad-${i}`,
          reviewDate: `2026-06-27T10:${(10 + i).toString().padStart(2, "0")}:00`,
          rating: "again" as const,
        }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        makeReviewLog({
          id: `l-pm-good-${i}`,
          reviewDate: `2026-06-27T15:${i.toString().padStart(2, "0")}:00`,
          rating: "good" as const,
        }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        makeReviewLog({
          id: `l-pm-bad-${i}`,
          reviewDate: `2026-06-27T15:${(5 + i).toString().padStart(2, "0")}:00`,
          rating: "again" as const,
        }),
      ),
    ];

    const result = getBestStudyTime(logs);
    expect(result).not.toBeNull();
    expect(result!.hour).toBe(10);
    expect(result!.accuracy).toBe(83);
    expect(result!.reviewCount).toBe(12);
    expect(result!.label).toBe("10 AM");
  });

  it("formats label correctly for midnight (12 AM)", () => {
    const logs = Array.from({ length: 10 }, (_, i) =>
      makeReviewLog({
        id: `l${i}`,
        reviewDate: `2026-06-27T00:${i.toString().padStart(2, "0")}:00`,
        rating: "easy" as const,
      }),
    );
    const result = getBestStudyTime(logs);
    expect(result).not.toBeNull();
    expect(result!.label).toBe("12 AM");
    expect(result!.hour).toBe(0);
  });

  it("formats label correctly for noon (12 PM)", () => {
    const logs = Array.from({ length: 10 }, (_, i) =>
      makeReviewLog({
        id: `l${i}`,
        reviewDate: `2026-06-27T12:${i.toString().padStart(2, "0")}:00`,
        rating: "good" as const,
      }),
    );
    const result = getBestStudyTime(logs);
    expect(result).not.toBeNull();
    expect(result!.label).toBe("12 PM");
    expect(result!.hour).toBe(12);
  });

  it("formats label correctly for PM hours", () => {
    const logs = Array.from({ length: 10 }, (_, i) =>
      makeReviewLog({
        id: `l${i}`,
        reviewDate: `2026-06-27T18:${i.toString().padStart(2, "0")}:00`,
        rating: "good" as const,
      }),
    );
    const result = getBestStudyTime(logs);
    expect(result).not.toBeNull();
    expect(result!.label).toBe("6 PM");
    expect(result!.hour).toBe(18);
  });

  it("formats label correctly for AM hours (not 12)", () => {
    const logs = Array.from({ length: 10 }, (_, i) =>
      makeReviewLog({
        id: `l${i}`,
        reviewDate: `2026-06-27T06:${i.toString().padStart(2, "0")}:00`,
        rating: "good" as const,
      }),
    );
    const result = getBestStudyTime(logs);
    expect(result).not.toBeNull();
    expect(result!.label).toBe("6 AM");
  });
});
