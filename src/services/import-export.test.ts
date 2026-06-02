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
      tags: ["typescript"],
      status: "new",
      correctCount: 0,
      incorrectCount: 0,
      streak: 0,
      easeFactor: 2.5,
      lastReviewedAt: null,
      nextReviewAt: "2026-06-01T00:00:00.000Z",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  studySessions: [],
  reviews: [],
  settings: { theme: "dark", seededAt: "2026-06-01T00:00:00.000Z" },
};

describe("import/export", () => {
  it("exports versioned recall data", () => {
    const payload = buildExportPayload(snapshot, new Date("2026-06-01T12:00:00.000Z"));

    expect(payload.version).toBe(1);
    expect(payload.exportedAt).toBe("2026-06-01T12:00:00.000Z");
    expect(payload.decks).toHaveLength(1);
    expect(payload.cards).toHaveLength(1);
  });

  it("rejects malformed import payloads", () => {
    expect(() => parseImportPayload('{"version":1,"decks":"bad"}')).toThrow("Invalid import file");
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
            correct: 1,
            incorrect: 0,
          },
        ],
        reviews: [
          {
            id: "review-2",
            cardId: "card-2",
            sessionId: "session-2",
            answeredAt: "2026-06-01T12:04:00.000Z",
            result: "correct",
          },
        ],
      },
      new Date("2026-06-01T12:10:00.000Z"),
    );

    const merged = mergeImportPayload(snapshot, incoming);

    expect(merged.cards.some((card) => card.id === "card-2")).toBe(true);
    expect(merged.studySessions).toHaveLength(1);
    expect(merged.studySessions[0]).toMatchObject({ id: "session-2", deckId: "deck-1" });
    expect(merged.reviews).toEqual([
      {
        id: "review-2",
        cardId: "card-2",
        sessionId: "session-2",
        answeredAt: "2026-06-01T12:04:00.000Z",
        result: "correct",
      },
    ]);
  });
});
