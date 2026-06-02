import { describe, expect, it } from "vitest";
import type { RecallStateSnapshot } from "@/types";
import { validateImportSnapshot } from "@/services/repository";

const validSnapshot: RecallStateSnapshot = {
  decks: [
    {
      id: "deck-1",
      name: "SQLite",
      description: "Local data",
      color: "green",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  cards: [
    {
      id: "card-1",
      deckId: "deck-1",
      front: "What is SQLite?",
      back: "A local relational database.",
      hint: "",
      tags: ["sqlite"],
      status: "new",
      correctCount: 0,
      incorrectCount: 0,
      streak: 0,
      lastReviewedAt: null,
      nextReviewAt: "2026-06-01T00:00:00.000Z",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  studySessions: [
    {
      id: "session-1",
      deckId: "deck-1",
      startedAt: "2026-06-01T00:00:00.000Z",
      endedAt: "2026-06-01T00:05:00.000Z",
      cardsStudied: 1,
      correct: 1,
      incorrect: 0,
    },
  ],
  reviews: [
    {
      id: "review-1",
      cardId: "card-1",
      sessionId: "session-1",
      answeredAt: "2026-06-01T00:03:00.000Z",
      result: "correct",
    },
  ],
  settings: {
    theme: "dark",
    seededAt: "2026-06-01T00:00:00.000Z",
  },
};

describe("validateImportSnapshot", () => {
  it("accepts a referentially valid snapshot", () => {
    expect(() => validateImportSnapshot(validSnapshot)).not.toThrow();
  });

  it("rejects duplicate deck names before replace/merge", () => {
    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        decks: [
          validSnapshot.decks[0],
          { ...validSnapshot.decks[0], id: "deck-2", name: " sqlite " },
        ],
      }),
    ).toThrow("Duplicate deck name");
  });

  it("rejects dangling card, session, and review references", () => {
    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        cards: [{ ...validSnapshot.cards[0], deckId: "missing-deck" }],
      }),
    ).toThrow("Card references missing deck");

    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        studySessions: [{ ...validSnapshot.studySessions[0], deckId: "missing-deck" }],
      }),
    ).toThrow("Session references missing deck");

    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        reviews: [{ ...validSnapshot.reviews[0], cardId: "missing-card" }],
      }),
    ).toThrow("Review references missing card");
  });

  it("rejects invalid enum values before persistence", () => {
    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        decks: [{ ...validSnapshot.decks[0], color: "neon" as never }],
      }),
    ).toThrow("Invalid deck color");

    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        cards: [{ ...validSnapshot.cards[0], status: "stuck" as never }],
      }),
    ).toThrow("Invalid card status");

    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        reviews: [{ ...validSnapshot.reviews[0], result: "maybe" as never }],
      }),
    ).toThrow("Invalid review result");
  });
});
