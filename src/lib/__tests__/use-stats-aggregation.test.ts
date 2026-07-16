import { describe, it, expect } from "vitest";
import { aggregateStats, retentionOverTime } from "@/components/use-stats";
import type { ReviewLog } from "@/types";

function makeLog(cardId: string, day: string, rating: ReviewLog["rating"]): ReviewLog {
  return {
    id: `${cardId}-${day}-${rating}`,
    cardId,
    deckId: "deck1",
    reviewDate: `${day}T10:00:00.000Z`,
    rating,
    responseMs: 1000,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
  } as ReviewLog;
}

describe("aggregateStats", () => {
  const cards = [{ id: "c1", deckId: "deck1" }, { id: "c2", deckId: "deck2" }];

  it("counts reviews, ratings, hours, decks, and distribution in one pass", () => {
    const logs: ReviewLog[] = [
      makeLog("c1", "2026-07-10", "good"),
      makeLog("c1", "2026-07-10", "easy"),
      makeLog("c2", "2026-07-10", "again"),
      makeLog("c1", "2026-07-11", "hard"),
    ];

    const s = aggregateStats(logs, cards);

    expect(s.byDay.get("2026-07-10")).toBe(3);
    expect(s.byDay.get("2026-07-11")).toBe(1);
    expect(s.ratingDist).toEqual({ again: 1, hard: 1, good: 1, easy: 1 });
    expect(s.deckCounts.get("deck1")).toBe(3);
    expect(s.deckCounts.get("deck2")).toBe(1);
    expect(s.byHour.reduce((a, b) => a + b, 0)).toBe(4);
    expect(s.buckets.get("2026-07-10")?.good).toBe(1);
  });

  it("handles empty logs without throwing", () => {
    const s = aggregateStats([], []);
    expect(s.byDay.size).toBe(0);
    expect(s.ratingDist).toEqual({ again: 0, hard: 0, good: 0, easy: 0 });
  });
});

describe("retentionOverTime", () => {
  it("returns -1 for windows with fewer than 3 reviews", () => {
    const buckets = new Map([
      ["2026-07-01", { again: 0, hard: 0, good: 1, easy: 0 }],
    ]);
    const days = ["2026-07-01", "2026-07-02", "2026-07-03"];
    const result = retentionOverTime(buckets, days);
    expect(result[0]).toBe(-1);
  });

  it("computes rolling 7-day retention as (good+easy)/total * 100", () => {
    // 3 good on day 1, then 3 good on day 8 → window at day 8 = 6 reviews all good
    const buckets = new Map<string, { again: number; hard: number; good: number; easy: number }>([
      ["2026-07-01", { again: 0, hard: 0, good: 3, easy: 0 }],
      ["2026-07-08", { again: 0, hard: 0, good: 3, easy: 0 }],
    ]);
    const days = [
      "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05",
      "2026-07-06", "2026-07-07", "2026-07-08",
    ];
    const result = retentionOverTime(buckets, days);
    // day 8 window includes day1..day8 = 6 good → 100%
    expect(result[7]).toBe(100);
  });

  it("drops old days outside the 7-day window", () => {
    const buckets = new Map<string, { again: number; hard: number; good: number; easy: number }>([
      ["2026-07-01", { again: 10, hard: 0, good: 0, easy: 0 }],
      ["2026-07-08", { again: 0, hard: 0, good: 3, easy: 0 }],
    ]);
    const days = [
      "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05",
      "2026-07-06", "2026-07-07", "2026-07-08",
    ];
    const result = retentionOverTime(buckets, days);
    // day 8 window should have dropped day1's 10 again → only 3 good → 100%
    expect(result[7]).toBe(100);
  });
});
