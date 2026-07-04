import { describe, it, expect } from "vitest";
import { calculateNextReview, createNewCard, previewIntervals, formatInterval, applyReview } from "../fsrs-engine";
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
      learningSteps: 0,
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
      lapses: 0, learningSteps: 0,
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

describe("FSRS graduation regression (bug 4a)", () => {
  // Bug: learning_steps was hardcoded to 0 on every call, so cards never
  // graduated past ~10-minute intervals. Also, "relearning" was mapped to
  // State.Learning instead of State.Relearning, preventing graduation back to Review.

  it("card rated 'good' twice graduates from learning to review state", () => {
    let card = createNewCard("deck-1", "front", "back", "", []);
    const t0 = new Date("2026-01-01T10:00:00Z");

    // Review 1: New -> Learning (step 1, ~10 min)
    card = applyReview(card, "good", t0, 0.9);
    expect(card.state).toBe("learning");
    expect(card.learningSteps).toBe(1);

    // Review 2: Learning -> Review (graduated, multi-day interval)
    const t1 = new Date(t0.getTime() + 10 * 60_000); // 10 min later
    card = applyReview(card, "good", t1, 0.9);
    expect(card.state).toBe("review");
    // After graduation, the interval should be in days, not minutes
    const intervalMs = new Date(card.nextReviewDate).getTime() - t1.getTime();
    expect(intervalMs).toBeGreaterThan(60 * 60_000); // > 1 hour (should be days)
  });

  it("card stuck at learning if learning_steps never persisted (simulating old bug)", () => {
    // This test proves the bug exists when learning_steps is always 0.
    // We simulate the old behavior by zeroing learningSteps before each call.
    let card = createNewCard("deck-1", "front", "back", "", []);
    const t0 = new Date("2026-01-01T10:00:00Z");

    for (let i = 0; i < 5; i++) {
      // Simulate bug: reset learningSteps to 0 before each review
      card = { ...card, learningSteps: 0 };
      const t = new Date(t0.getTime() + i * 10 * 60_000);
      card = applyReview(card, "good", t, 0.9);
    }
    // With the bug, card stays in learning state forever
    expect(card.state).toBe("learning");
  });

  it("relearning card graduates back to review when rated 'good'", () => {
    // Start with a review card that lapses (Again -> Relearning)
    const reviewCard: Card = {
      id: "test-relearn",
      deckId: "deck-1",
      front: "front",
      back: "back",
      hint: "",
      source: "",
      tags: [],
      cardType: "basic",
      state: "review",
      lastReviewDate: new Date("2025-12-27T10:00:00Z").toISOString(),
      nextReviewDate: new Date("2026-01-01T10:00:00Z").toISOString(),
      stability: 5.0,
      difficulty: 4.0,
      elapsedDays: 5,
      scheduledDays: 5,
      reps: 10,
      lapses: 0,
      learningSteps: 0,
      createdAt: new Date("2025-12-20T10:00:00Z").toISOString(),
      updatedAt: new Date("2025-12-27T10:00:00Z").toISOString(),
    };

    const t0 = new Date("2026-01-01T10:00:00Z");

    // Rate Again: Review -> Relearning
    let card = applyReview(reviewCard, "again", t0, 0.9);
    expect(card.state).toBe("relearning");
    expect(card.lapses).toBe(1);

    // Rate Good: Relearning should graduate back to Review
    // With the old bug (mapping relearning->Learning), this would stay in learning
    const t1 = new Date(t0.getTime() + 10 * 60_000);
    card = applyReview(card, "good", t1, 0.9);
    expect(card.state).toBe("review");
  });
});
