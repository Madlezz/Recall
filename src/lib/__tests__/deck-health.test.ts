import { describe, it, expect } from "vitest";
import { getDeckHealth } from "@/lib/stats";
import type { Card, ReviewLog } from "@/types";

const DECK_ID = "deck-1";
const NOW = "2025-06-15T12:00:00.000Z";

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: "c1",
    deckId: DECK_ID,
    front: "Q",
    back: "A",
    hint: "",
    source: "",
    tags: [],
    cardType: "basic",
    state: "review",
    lastReviewDate: "2025-06-10T00:00:00.000Z",
    nextReviewDate: "2025-06-20T00:00:00.000Z",
    stability: 10,
    difficulty: 0.3,
    elapsedDays: 5,
    scheduledDays: 10,
    reps: 5,
    lapses: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-06-10T00:00:00.000Z",
    ...overrides,
  };
}

function log(overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: "l1",
    cardId: "c1",
    rating: "good",
    reviewDate: "2025-06-10T00:00:00.000Z",
    stability: 10,
    difficulty: 0.3,
    elapsedDays: 5,
    scheduledDays: 10,
    ...overrides,
  };
}

describe("getDeckHealth", () => {
  it("returns 0 for all metrics with empty cards", () => {
    const result = getDeckHealth(DECK_ID, [], [], 5);
    expect(result).toEqual({ retention: 0, leeches: 0, avgStability: 0, overdue: 0 });
  });

  it("computes retention from review logs", () => {
    const cards = [card({ id: "c1" })];
    const logs = [
      log({ cardId: "c1", rating: "good" }),
      log({ cardId: "c1", rating: "good", id: "l2" }),
      log({ cardId: "c1", rating: "again", id: "l3" }),
      log({ cardId: "c1", rating: "good", id: "l4" }),
    ];
    // 3 good out of 4 total = 75%
    const result = getDeckHealth(DECK_ID, cards, logs, 5);
    expect(result.retention).toBe(75);
  });

  it("includes 'easy' ratings in retention", () => {
    const cards = [card({ id: "c1" })];
    const logs = [
      log({ cardId: "c1", rating: "good" }),
      log({ cardId: "c1", rating: "easy", id: "l2" }),
    ];
    const result = getDeckHealth(DECK_ID, cards, logs, 5);
    expect(result.retention).toBe(100);
  });

  it("counts leeches based on threshold", () => {
    const cards = [
      card({ id: "c1", lapses: 5 }),
      card({ id: "c2", lapses: 3 }),
      card({ id: "c3", lapses: 10 }),
    ];
    const result = getDeckHealth(DECK_ID, cards, [], 5);
    expect(result.leeches).toBe(2); // c1 and c3
  });

  it("computes average stability of review cards only", () => {
    const cards = [
      card({ id: "c1", state: "review", stability: 10 }),
      card({ id: "c2", state: "review", stability: 20 }),
      card({ id: "c3", state: "new", stability: 999 }),
    ];
    const result = getDeckHealth(DECK_ID, cards, [], 5);
    expect(result.avgStability).toBe(15); // (10+20)/2
  });

  it("counts overdue review cards", () => {
    const cards = [
      card({ id: "c1", state: "review", nextReviewDate: "2020-01-01T00:00:00.000Z" }),
      card({ id: "c2", state: "review", nextReviewDate: "2030-01-01T00:00:00.000Z" }),
      card({ id: "c3", state: "learning", nextReviewDate: "2020-01-01T00:00:00.000Z" }),
    ];
    const result = getDeckHealth(DECK_ID, cards, [], 5);
    expect(result.overdue).toBe(2); // c1 and c3 (c3 is not 'new', so counted)
  });

  it("only counts cards from the target deck", () => {
    const deck1Cards = [card({ id: "c1", deckId: "deck-1" })];
    const deck2Cards = [card({ id: "c2", deckId: "deck-2" })];
    const logs = [log({ cardId: "c1", rating: "good" }), log({ cardId: "c2", rating: "good", id: "l2" })];

    const r1 = getDeckHealth("deck-1", [...deck1Cards, ...deck2Cards], logs, 5);
    expect(r1.retention).toBe(100); // only c1's log counts

    const r2 = getDeckHealth("deck-2", [...deck1Cards, ...deck2Cards], logs, 5);
    expect(r2.retention).toBe(100); // only c2's log counts
  });
});