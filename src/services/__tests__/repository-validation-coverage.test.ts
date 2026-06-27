import { describe, expect, it } from "vitest";
import type { RecallStateSnapshot } from "@/types";
import { validateImportSnapshot } from "@/services/repository";

function makeValidSnapshot(): RecallStateSnapshot {
  return {
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
    studySessions: [],
    reviewLogs: [],
    settings: {
      theme: "dark",
      accentColor: "zinc",
      dyslexiaFont: false,
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
      syncFolder: null,
      syncEnabled: false,
      ttsEnabled: false,
      ttsAutoRead: false,
      ttsSpeed: 1,
      fsrsWeights: null,
    },
  };
}

describe("validateImportSnapshot — deck validation", () => {
  it("accepts a valid snapshot", () => {
    expect(() => validateImportSnapshot(makeValidSnapshot())).not.toThrow();
  });

  it("rejects empty deck name", () => {
    const snap = makeValidSnapshot();
    snap.decks = [{ ...snap.decks[0], name: "   " }];
    expect(() => validateImportSnapshot(snap)).toThrow("Deck name is required");
  });

  it("rejects duplicate deck id", () => {
    const snap = makeValidSnapshot();
    snap.decks = [
      snap.decks[0],
      { ...snap.decks[0], name: "Different Name" },
    ];
    expect(() => validateImportSnapshot(snap)).toThrow("Duplicate deck id");
  });

  it("rejects duplicate deck name (normalized)", () => {
    const snap = makeValidSnapshot();
    snap.decks = [
      snap.decks[0],
      { ...snap.decks[0], id: "deck-2", name: "  sqlite  " },
    ];
    expect(() => validateImportSnapshot(snap)).toThrow("Duplicate deck name");
  });

  it("rejects invalid deck color", () => {
    const snap = makeValidSnapshot();
    snap.decks = [{ ...snap.decks[0], color: "neon" as never }];
    expect(() => validateImportSnapshot(snap)).toThrow("Invalid deck color");
  });
});

describe("validateImportSnapshot — card validation", () => {
  it("rejects card referencing missing deck", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], deckId: "missing-deck" }];
    expect(() => validateImportSnapshot(snap)).toThrow(
      "Card references missing deck",
    );
  });

  it("rejects card with empty front", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], front: "   " }];
    expect(() => validateImportSnapshot(snap)).toThrow(
      "Card front is required",
    );
  });

  it("rejects basic card with empty back", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], back: "   " }];
    expect(() => validateImportSnapshot(snap)).toThrow(
      "Card back is required",
    );
  });

  it("allows cloze card with empty back", () => {
    const snap = makeValidSnapshot();
    snap.cards = [
      {
        ...snap.cards[0],
        front: "{{c1::SQLite}} is a database",
        back: "",
        cardType: "basic",
      },
    ];
    expect(() => validateImportSnapshot(snap)).not.toThrow();
  });

  it("allows image-occlusion card with empty back", () => {
    const snap = makeValidSnapshot();
    snap.cards = [
      {
        ...snap.cards[0],
        back: "",
        cardType: "image-occlusion" as never,
      },
    ];
    expect(() => validateImportSnapshot(snap)).not.toThrow();
  });

  it("rejects duplicate card id", () => {
    const snap = makeValidSnapshot();
    snap.cards = [
      snap.cards[0],
      { ...snap.cards[0], front: "Different front" },
    ];
    expect(() => validateImportSnapshot(snap)).toThrow("Duplicate card id");
  });

  it("rejects invalid card state", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], state: "stuck" as never }];
    expect(() => validateImportSnapshot(snap)).toThrow("Invalid card state");
  });

  it("rejects invalid card type", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], cardType: "unknown" as never }];
    expect(() => validateImportSnapshot(snap)).toThrow("Invalid card type");
  });

  it("rejects NaN stability", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], stability: NaN }];
    expect(() => validateImportSnapshot(snap)).toThrow("must be a finite number");
  });

  it("rejects Infinity difficulty", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], difficulty: Infinity }];
    expect(() => validateImportSnapshot(snap)).toThrow("must be a finite number");
  });

  it("rejects negative reps", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], reps: -1 }];
    expect(() => validateImportSnapshot(snap)).toThrow("cannot be negative");
  });

  it("rejects negative lapses", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], lapses: -5 }];
    expect(() => validateImportSnapshot(snap)).toThrow("cannot be negative");
  });

  it("rejects invalid nextReviewDate", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], nextReviewDate: "not-a-date" }];
    expect(() => validateImportSnapshot(snap)).toThrow("invalid nextReviewDate");
  });

  it("rejects invalid lastReviewDate", () => {
    const snap = makeValidSnapshot();
    snap.cards = [
      { ...snap.cards[0], lastReviewDate: "not-a-date" },
    ];
    expect(() => validateImportSnapshot(snap)).toThrow("invalid lastReviewDate");
  });

  it("rejects too many tags (>50)", () => {
    const snap = makeValidSnapshot();
    const tags = Array.from({ length: 51 }, (_, i) => `tag-${i}`);
    snap.cards = [{ ...snap.cards[0], tags }];
    expect(() => validateImportSnapshot(snap)).toThrow("too many tags");
  });

  it("rejects front content exceeding 10,000 chars", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], front: "x".repeat(10001) }];
    expect(() => validateImportSnapshot(snap)).toThrow("exceeds 10,000");
  });

  it("rejects back content exceeding 10,000 chars", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], back: "x".repeat(10001) }];
    expect(() => validateImportSnapshot(snap)).toThrow("exceeds 10,000");
  });

  it("allows null nextReviewDate", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], nextReviewDate: "" as string }];
    expect(() => validateImportSnapshot(snap)).not.toThrow();
  });

  it("allows null lastReviewDate", () => {
    const snap = makeValidSnapshot();
    snap.cards = [{ ...snap.cards[0], lastReviewDate: null }];
    expect(() => validateImportSnapshot(snap)).not.toThrow();
  });
});

describe("validateImportSnapshot — session validation", () => {
  it("rejects session referencing missing deck", () => {
    const snap = makeValidSnapshot();
    snap.studySessions = [
      {
        id: "session-1",
        deckId: "missing-deck",
        startedAt: "2026-06-01T00:00:00.000Z",
        endedAt: "2026-06-01T00:05:00.000Z",
        cardsStudied: 1,
      },
    ];
    expect(() => validateImportSnapshot(snap)).toThrow(
      "Session references missing deck",
    );
  });

  it("allows session with null deckId", () => {
    const snap = makeValidSnapshot();
    snap.studySessions = [
      {
        id: "session-1",
        deckId: null,
        startedAt: "2026-06-01T00:00:00.000Z",
        endedAt: "2026-06-01T00:05:00.000Z",
        cardsStudied: 1,
      },
    ];
    expect(() => validateImportSnapshot(snap)).not.toThrow();
  });

  it("rejects duplicate session id", () => {
    const snap = makeValidSnapshot();
    const session = {
      id: "session-1",
      deckId: "deck-1",
      startedAt: "2026-06-01T00:00:00.000Z",
      endedAt: "2026-06-01T00:05:00.000Z",
      cardsStudied: 1,
    };
    snap.studySessions = [session, session];
    expect(() => validateImportSnapshot(snap)).toThrow("Duplicate session id");
  });
});

describe("validateImportSnapshot — review log validation", () => {
  it("rejects review log referencing missing card", () => {
    const snap = makeValidSnapshot();
    snap.reviewLogs = [
      {
        id: "review-1",
        cardId: "missing-card",
        rating: "good",
        reviewDate: "2026-06-01T00:03:00.000Z",
        stability: 1.0,
        difficulty: 5.0,
        elapsedDays: 0,
        scheduledDays: 1,
      },
    ];
    expect(() => validateImportSnapshot(snap)).toThrow(
      "Review log references missing card",
    );
  });

  it("rejects invalid review rating", () => {
    const snap = makeValidSnapshot();
    snap.reviewLogs = [
      {
        id: "review-1",
        cardId: "card-1",
        rating: "maybe" as never,
        reviewDate: "2026-06-01T00:03:00.000Z",
        stability: 1.0,
        difficulty: 5.0,
        elapsedDays: 0,
        scheduledDays: 1,
      },
    ];
    expect(() => validateImportSnapshot(snap)).toThrow("Invalid review rating");
  });
});

describe("validateImportSnapshot — size validation", () => {
  it("rejects import exceeding 10MB", () => {
    const snap = makeValidSnapshot();
    // Add a deck with a huge name to push size over 10MB
    snap.decks = [
      {
        ...snap.decks[0],
        description: "x".repeat(10 * 1024 * 1024 + 1),
      },
    ];
    expect(() => validateImportSnapshot(snap)).toThrow("Import too large");
  });
});