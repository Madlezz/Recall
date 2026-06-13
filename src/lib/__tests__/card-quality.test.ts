import { describe, expect, it } from "vitest";
import { checkCardQuality, checkDeckQuality } from "@/lib/card-quality";
import type { Card } from "@/types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "test-1",
    deckId: "deck-1",
    front: "What is the capital of France?",
    back: "Paris",
    hint: "City of Light",
    source: "",
    tags: [],
    cardType: "basic",
    state: "review",
    lastReviewDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    nextReviewDate: new Date().toISOString(),
    stability: 5,
    difficulty: 3,
    elapsedDays: 0,
    scheduledDays: 5,
    reps: 3,
    lapses: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("card quality checker", () => {
  it("returns no warnings for healthy card", () => {
    const warnings = checkCardQuality(makeCard());
    expect(warnings).toEqual([]);
  });

  it("flags card that is too long", () => {
    const long = "x".repeat(501);
    const card = makeCard({ front: long, hint: "" });
    const warnings = checkCardQuality(card);
    expect(warnings.some((w) => w.message.includes("very long"))).toBe(true);
  });

  it("flags card that is too short", () => {
    const card = makeCard({ front: "Hi", back: "Yo", hint: "" });
    const warnings = checkCardQuality(card);
    expect(warnings.some((w) => w.message.includes("very short"))).toBe(true);
  });

  it("flags card with no hint", () => {
    const card = makeCard({ hint: "" });
    const warnings = checkCardQuality(card);
    expect(warnings.some((w) => w.message.includes("No hint"))).toBe(true);
  });

  it("flags stale card not reviewed in 60+ days", () => {
    const card = makeCard({
      lastReviewDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      hint: "",
    });
    const warnings = checkCardQuality(card);
    expect(warnings.some((w) => w.message.includes("Not reviewed in"))).toBe(true);
  });

  it("does not flag new card as stale", () => {
    const card = makeCard({ state: "new", lastReviewDate: null, hint: "" });
    const warnings = checkCardQuality(card);
    expect(warnings.some((w) => w.message.includes("Not reviewed in"))).toBe(false);
  });

  it("flags nearly identical front/back", () => {
    const card = makeCard({
      front: "Paris is the capital of France",
      back: "Paris capital of France city",
      hint: "big clue",
    });
    const warnings = checkCardQuality(card);
    expect(warnings.some((w) => w.message.includes("nearly identical"))).toBe(true);
  });

  it("deck checker returns proper stats", () => {
    const healthy = makeCard({ id: "h1" });
    const bad = makeCard({ id: "b1", hint: "", front: "x".repeat(600) });
    const result = checkDeckQuality([healthy, bad]);
    expect(result.total).toBe(2);
    expect(result.healthy).toBe(1);
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("sorts warnings by severity", () => {
    const bad = makeCard({ id: "b1", hint: "", front: "x".repeat(600) });
    const result = checkDeckQuality([bad]);
    // medium severity (too long) should come before low (no hint)
    const sevs = result.warnings.map((w) => w.severity);
    expect(sevs[0]).toBe("medium");
    // at least medium before low
    const medIdx = sevs.indexOf("medium");
    const lowIdx = sevs.indexOf("low");
    if (medIdx >= 0 && lowIdx >= 0) {
      expect(medIdx).toBeLessThan(lowIdx);
    }
  });
});