import { describe, expect, it } from "vitest";
import type { Card } from "@/types";
import { applyReviewResult } from "./study-engine";

const baseCard: Card = {
  id: "card-1",
  deckId: "deck-1",
  front: "What is a closure?",
  back: "A function that keeps access to its lexical scope.",
  hint: "",
  tags: ["javascript"],
  status: "learning",
  correctCount: 2,
  incorrectCount: 1,
  streak: 2,
  lastReviewedAt: null,
  nextReviewAt: "2026-06-01T00:00:00.000Z",
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-05-25T00:00:00.000Z",
};

describe("applyReviewResult", () => {
  it("marks incorrect cards due tomorrow and resets streak", () => {
    const reviewedAt = new Date("2026-06-01T10:00:00.000Z");

    const updated = applyReviewResult(baseCard, "incorrect", reviewedAt);

    expect(updated.streak).toBe(0);
    expect(updated.incorrectCount).toBe(2);
    expect(updated.correctCount).toBe(2);
    expect(updated.status).toBe("learning");
    expect(updated.lastReviewedAt).toBe("2026-06-01T10:00:00.000Z");
    expect(updated.nextReviewAt).toBe("2026-06-02T10:00:00.000Z");
  });

  it("doubles correct interval starting from one day", () => {
    const reviewedAt = new Date("2026-06-01T10:00:00.000Z");

    const updated = applyReviewResult(baseCard, "correct", reviewedAt);

    expect(updated.streak).toBe(3);
    expect(updated.correctCount).toBe(3);
    expect(updated.incorrectCount).toBe(1);
    expect(updated.status).toBe("learning");
    expect(updated.nextReviewAt).toBe("2026-06-05T10:00:00.000Z");
  });

  it("masters card after five correct streak", () => {
    const reviewedAt = new Date("2026-06-01T10:00:00.000Z");

    const updated = applyReviewResult({ ...baseCard, streak: 4 }, "correct", reviewedAt);

    expect(updated.streak).toBe(5);
    expect(updated.status).toBe("mastered");
  });
});
