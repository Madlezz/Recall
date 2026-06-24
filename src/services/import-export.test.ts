import { describe, expect, it } from "vitest";
import type { RecallStateSnapshot } from "@/types";
import { buildExportPayload, mergeImportPayload, parseImportPayload } from "./import-export";

const snapshot: RecallStateSnapshot = {
  decks: [
    {
      id: "deck-1",
      name: "TypeScript",
      description: "Type safety fundamentals",
      color: "blue",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  cards: [
    {
      id: "card-1",
            deckId: "deck-1",
            front: "What is a discriminated union?",
            back: "A union narrowed by a shared literal field.",
            hint: "",
                        source: "",
                        tags: ["typescript"],
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
    accentColor: "zinc" as const,
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
    backupSchedule: "never",
    lastBackupAt: null,
      syncFolder: null,
      syncEnabled: false,
    ttsEnabled: false,
    ttsAutoRead: false,
    ttsSpeed: 1,
    fsrsWeights: null,
  },
};

describe("import/export", () => {
  it("exports versioned recall data", () => {
    const payload = buildExportPayload(snapshot, new Date("2026-06-01T12:00:00.000Z"));

    expect(payload.version).toBe(2);
    expect(payload.exportedAt).toBe("2026-06-01T12:00:00.000Z");
    expect(payload.decks).toHaveLength(1);
    expect(payload.cards).toHaveLength(1);
  });

  it("rejects malformed import payloads", () => {
    expect(() => parseImportPayload('{"version":2,"decks":"bad"}')).toThrow("Invalid import file");
    expect(() =>
      parseImportPayload(
        JSON.stringify({
          ...buildExportPayload(snapshot),
          decks: [{ ...snapshot.decks[0], color: "neon" }],
        }),
      ),
    ).toThrow("Invalid import file");
  });

  it("merges new cards and skips duplicates by deck name and card front", () => {
    const incoming = buildExportPayload(
      {
        ...snapshot,
        cards: [
          snapshot.cards[0],
          {
            ...snapshot.cards[0],
            id: "card-2",
            front: "What is never?",
          },
        ],
      },
      new Date("2026-06-01T12:00:00.000Z"),
    );

    const merged = mergeImportPayload(snapshot, incoming);

    expect(merged.decks).toHaveLength(1);
    expect(merged.cards.map((card) => card.front).sort()).toEqual([
      "What is a discriminated union?",
      "What is never?",
    ]);
  });

  it("merges self-contained review history for newly imported cards", () => {
    const incoming = buildExportPayload(
      {
        ...snapshot,
        cards: [
          {
            ...snapshot.cards[0],
            id: "card-2",
            front: "What is narrowing?",
          },
        ],
        studySessions: [
          {
            id: "session-2",
            deckId: "deck-1",
            startedAt: "2026-06-01T12:00:00.000Z",
            endedAt: "2026-06-01T12:05:00.000Z",
            cardsStudied: 1,
          },
        ],
        reviewLogs: [
          {
            id: "review-2",
            cardId: "card-2",
            rating: "good" as const,
            reviewDate: "2026-06-01T12:04:00.000Z",
            stability: 1.0,
            difficulty: 5.0,
            elapsedDays: 0,
            scheduledDays: 1,
          },
        ],
      },
      new Date("2026-06-01T12:10:00.000Z"),
    );

    const merged = mergeImportPayload(snapshot, incoming);

    expect(merged.cards.some((card) => card.id === "card-2")).toBe(true);
    expect(merged.studySessions).toHaveLength(1);
    expect(merged.studySessions[0]).toMatchObject({ id: "session-2", deckId: "deck-1" });
    expect(merged.reviewLogs).toEqual([
      {
        id: "review-2",
        cardId: "card-2",
        rating: "good",
        reviewDate: "2026-06-01T12:04:00.000Z",
        stability: 1.0,
        difficulty: 5.0,
        elapsedDays: 0,
        scheduledDays: 1,
      },
    ]);
  });

  it("round-trip: export → re-import into empty state preserves all data", () => {
    // Build a richer snapshot with multiple decks, cards, logs, settings
    const rich: RecallStateSnapshot = {
      decks: [
        { ...snapshot.decks[0], id: "d1", name: "Alpha" },
        { ...snapshot.decks[0], id: "d2", name: "Beta", color: "green" },
      ],
      cards: [
        { ...snapshot.cards[0], id: "c1", deckId: "d1", front: "Q1", back: "A1" },
        { ...snapshot.cards[0], id: "c2", deckId: "d1", front: "Q2", back: "A2" },
        { ...snapshot.cards[0], id: "c3", deckId: "d2", front: "Q3", back: "A3", tags: ["x"] },
      ],
      studySessions: [
        { id: "s1", deckId: "d1", startedAt: "2026-06-01T10:00:00.000Z", endedAt: "2026-06-01T10:05:00.000Z", cardsStudied: 2 },
      ],
      reviewLogs: [
        { id: "r1", cardId: "c1", rating: "good", reviewDate: "2026-06-01T10:01:00.000Z", stability: 2, difficulty: 5, elapsedDays: 0, scheduledDays: 3 },
        { id: "r2", cardId: "c2", rating: "again", reviewDate: "2026-06-01T10:02:00.000Z", stability: 0, difficulty: 8, elapsedDays: 0, scheduledDays: 1 },
      ],
      settings: { ...snapshot.settings },
    };

    // Export it
    const exported = buildExportPayload(rich, new Date("2026-06-01T12:00:00.000Z"));
    const json = JSON.stringify(exported);

    // Parse it back
    const parsed = parseImportPayload(json);

    // Merge into an empty snapshot
    const empty: RecallStateSnapshot = {
      decks: [],
      cards: [],
      studySessions: [],
      reviewLogs: [],
      settings: { ...snapshot.settings },
    };
    const restored = mergeImportPayload(empty, parsed);

    // Verify decks
    expect(restored.decks).toHaveLength(2);
    expect(restored.decks.map((d) => d.name).sort()).toEqual(["Alpha", "Beta"]);

    // Verify cards
    expect(restored.cards).toHaveLength(3);
    expect(restored.cards.map((c) => c.front).sort()).toEqual(["Q1", "Q2", "Q3"]);

    // Verify review logs survived
    expect(restored.reviewLogs).toHaveLength(2);
    expect(restored.reviewLogs.map((r) => r.rating).sort()).toEqual(["again", "good"]);

    // Verify study sessions survived
    expect(restored.studySessions).toHaveLength(1);
    expect(restored.studySessions[0].cardsStudied).toBe(2);
  });

  it("round-trip: export → re-import into same state is a no-op (idempotent)", () => {
    const exported = buildExportPayload(snapshot, new Date("2026-06-01T12:00:00.000Z"));
    const parsed = parseImportPayload(JSON.stringify(exported));
    const merged = mergeImportPayload(snapshot, parsed);

    // Should have same number of decks and cards (dedup by name+front)
    expect(merged.decks).toHaveLength(snapshot.decks.length);
    expect(merged.cards).toHaveLength(snapshot.cards.length);
  });
});
