import { describe, it, expect } from "vitest";
import { calculateNextReview, createNewCard, previewIntervals, formatInterval } from "../fsrs-engine";
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
      source: "",
      tags: [],
      cardType: "basic",
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

describe("formatInterval", () => {
  it("formats sub-minute", () => {
    expect(formatInterval(0)).toBe("<1m");
    expect(formatInterval(30_000)).toBe("<1m");
  });
  it("formats minutes", () => {
    expect(formatInterval(5 * 60_000)).toBe("5m");
    expect(formatInterval(45 * 60_000)).toBe("45m");
  });
  it("formats hours", () => {
    expect(formatInterval(3 * 3_600_000)).toBe("3h");
  });
  it("formats days", () => {
    expect(formatInterval(12 * 86_400_000)).toBe("12d");
  });
  it("formats months", () => {
    expect(formatInterval(45 * 86_400_000)).toMatch(/mo$/);
  });
  it("formats years", () => {
    expect(formatInterval(400 * 86_400_000)).toMatch(/y$/);
  });
});

describe("previewIntervals", () => {
  it("returns 4 non-empty strings", () => {
    const card = createNewCard("deck-1", "front", "back", "", []);
    const result = previewIntervals(card);
    expect(result.again).toBeTruthy();
    expect(result.hard).toBeTruthy();
    expect(result.good).toBeTruthy();
    expect(result.easy).toBeTruthy();
  });

  it("easy >= good >= hard for review card", () => {
    const reviewCard: Card = {
      id: "test-1",
      deckId: "deck-1",
      front: "front",
      back: "back",
      hint: "",
      source: "",
      tags: [],
      cardType: "basic",
      state: "review",
      lastReviewDate: new Date(Date.now() - 5 * 86_400_000).toISOString(),
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
    const result = previewIntervals(reviewCard);

    // Convert to ms for comparison
    const toMs = (s: string): number => {
      if (s === "<1m") return 0;
      const num = parseFloat(s);
      if (s.endsWith("m")) return num * 60_000;
      if (s.endsWith("h")) return num * 3_600_000;
      if (s.endsWith("d")) return num * 86_400_000;
      if (s.endsWith("mo")) return num * 30 * 86_400_000;
      if (s.endsWith("y")) return num * 365 * 86_400_000;
      return num;
    };

    expect(toMs(result.easy)).toBeGreaterThanOrEqual(toMs(result.good));
    expect(toMs(result.good)).toBeGreaterThanOrEqual(toMs(result.hard));
  });
});
