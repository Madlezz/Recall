import { describe, it, expect } from "vitest";
import { forecastDueByDay } from "../stats";
import type { Card } from "@/types";

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

describe("forecastDueByDay", () => {
  it("returns correct number of days", () => {
    const result = forecastDueByDay([], 7);
    expect(result).toHaveLength(7);
  });

  it("returns all zeros for empty input", () => {
    const result = forecastDueByDay([], 7);
    for (const day of result) {
      expect(day.due).toBe(0);
      expect(day.newCount).toBe(0);
    }
  });

  it("buckets overdue cards into day 0", () => {
    const now = new Date("2026-06-22T12:00:00Z");
    const overdueCard = makeCard({
      id: "overdue",
      nextReviewDate: "2026-06-20T00:00:00Z", // 2 days ago
    });
    const result = forecastDueByDay([overdueCard], 7, now);
    expect(result[0].due).toBe(1);
    expect(result[1].due).toBe(0);
  });

  it("separates new cards from review cards", () => {
    const now = new Date("2026-06-22T12:00:00Z");
    const newCard = makeCard({ id: "new", state: "new" });
    const reviewCard = makeCard({
      id: "review",
      nextReviewDate: "2026-06-25T00:00:00Z", // 3 days from now
    });
    const result = forecastDueByDay([newCard, reviewCard], 7, now);
    expect(result[0].newCount).toBe(1);
    expect(result[0].due).toBe(0);
    expect(result[3].due).toBe(1);
    expect(result[3].newCount).toBe(0);
  });

  it("handles cards due today", () => {
    const now = new Date("2026-06-22T12:00:00Z");
    const todayCard = makeCard({
      id: "today",
      nextReviewDate: "2026-06-22T00:00:00Z", // today
    });
    const result = forecastDueByDay([todayCard], 7, now);
    expect(result[0].due).toBe(1);
  });

  it("handles cards beyond the forecast window", () => {
    const now = new Date("2026-06-22T12:00:00Z");
    const futureCard = makeCard({
      id: "future",
      nextReviewDate: "2026-07-01T00:00:00Z", // 9 days from now
    });
    const result = forecastDueByDay([futureCard], 7, now);
    // Should not appear in any bucket
    const totalDue = result.reduce((sum, d) => sum + d.due, 0);
    expect(totalDue).toBe(0);
  });

  it("handles multiple cards on the same day", () => {
    const now = new Date("2026-06-22T12:00:00Z");
    // Use times well within the day to avoid timezone edge cases
    const cards = [
      makeCard({ id: "c1", nextReviewDate: "2026-06-24T12:00:00Z" }),
      makeCard({ id: "c2", nextReviewDate: "2026-06-24T14:00:00Z" }),
      makeCard({ id: "c3", nextReviewDate: "2026-06-24T16:00:00Z" }),
    ];
    const result = forecastDueByDay(cards, 7, now);
    // All three should land on the same day (day index 2)
    const totalDue = result.reduce((sum, d) => sum + d.due, 0);
    expect(totalDue).toBe(3);
  });

  it("respects custom days parameter", () => {
    const result = forecastDueByDay([], 14);
    expect(result).toHaveLength(14);
  });
});
