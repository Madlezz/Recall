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
            source: "",
            tags: ["sqlite"],
            cardType: "basic",
            state: "new",
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      lastReviewDate: null,
      nextReviewDate: "2026-06-01T00:00:00.000Z",
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
    },
  ],
  reviewLogs: [
    {
      id: "review-1",
      cardId: "card-1",
      rating: "good",
      reviewDate: "2026-06-01T00:03:00.000Z",
      stability: 1.0,
      difficulty: 5.0,
      elapsedDays: 0,
      scheduledDays: 1,
    },
  ],
  settings: {
      theme: "dark",
      seededAt: "2026-06-01T00:00:00.000Z",
      dailyNewCardLimit: 20,
      leechThreshold: 5,
      onboardingComplete: false,
            xp: 0,
            achievements: [],
            dailyGoal: 20,
            notificationsEnabled: false,
            soundVolume: 100,
            allowHtml: false,
            desiredRetention: 0.9,
                        backupFolder: null,
                        backupSchedule: "never" as const,
                        lastBackupAt: null,
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

  it("rejects dangling card, session, and review log references", () => {
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
        reviewLogs: [{ ...validSnapshot.reviewLogs[0], cardId: "missing-card" }],
      }),
    ).toThrow("Review log references missing card");
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
        cards: [{ ...validSnapshot.cards[0], state: "stuck" as never }],
      }),
    ).toThrow("Invalid card state");

    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        reviewLogs: [{ ...validSnapshot.reviewLogs[0], rating: "maybe" as never }],
      }),
    ).toThrow("Invalid review rating");
  });
});
