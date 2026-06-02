import { describe, expect, it } from "vitest";
import type { CardRow, DeckRow, ReviewRow, StudySessionRow } from "@/db/mappers";
import {
  cardFromRow,
  cardToRow,
  deckFromRow,
  deckToRow,
  reviewFromRow,
  reviewToRow,
  settingsFromRows,
  settingsToRows,
  studySessionFromRow,
  studySessionToRow,
} from "@/db/mappers";
import type { Card, Deck, RecallSettings, Review, StudySession } from "@/types";

describe("database mappers", () => {
  it("round-trips card rows with JSON tags and nullable review date", () => {
    const card: Card = {
      id: "card-1",
      deckId: "deck-1",
      front: "Question",
      back: "Answer",
      hint: "",
      tags: ["sqlite", "tauri"],
      status: "new",
      correctCount: 0,
      incorrectCount: 0,
      streak: 0,
      lastReviewedAt: null,
      nextReviewAt: "2026-06-01T00:00:00.000Z",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };

    const row = cardToRow(card);

    expect(row.tags).toBe("[\"sqlite\",\"tauri\"]");
    expect(row.last_reviewed_at).toBeNull();
    expect(cardFromRow(row)).toEqual(card);
  });

  it("round-trips deck, session, review, and settings rows", () => {
    const deck: Deck = {
      id: "deck-1",
      name: "SQLite",
      description: "Local data",
      color: "green",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const session: StudySession = {
      id: "session-1",
      deckId: null,
      startedAt: "2026-06-01T00:00:00.000Z",
      endedAt: "2026-06-01T00:15:00.000Z",
      cardsStudied: 2,
      correct: 1,
      incorrect: 1,
    };
    const review: Review = {
      id: "review-1",
      cardId: "card-1",
      sessionId: "session-1",
      answeredAt: "2026-06-01T00:10:00.000Z",
      result: "correct",
    };
    const settings: RecallSettings = {
      theme: "dark",
      seededAt: "2026-06-01T00:00:00.000Z",
    };

    expect(deckFromRow(deckToRow(deck) as DeckRow)).toEqual(deck);
    expect(studySessionFromRow(studySessionToRow(session) as StudySessionRow)).toEqual(session);
    expect(reviewFromRow(reviewToRow(review) as ReviewRow)).toEqual(review);
    expect(settingsFromRows(settingsToRows(settings))).toEqual(settings);
    expect(settingsToRows(settings)).toContainEqual({ key: "schema_version", value: "2" });
  });

  it("rejects invalid card status and review result rows", () => {
    const cardRow: CardRow = {
      id: "card-1",
      deck_id: "deck-1",
      front: "Question",
      back: "Answer",
      hint: "",
      tags: "[]",
      status: "bad",
      correct_count: 0,
      incorrect_count: 0,
      streak: 0,
      last_reviewed_at: null,
      next_review_at: "2026-06-01T00:00:00.000Z",
      created_at: "2026-06-01T00:00:00.000Z",
      updated_at: "2026-06-01T00:00:00.000Z",
    };
    const reviewRow: ReviewRow = {
      id: "review-1",
      card_id: "card-1",
      session_id: "session-1",
      answered_at: "2026-06-01T00:10:00.000Z",
      result: "bad",
    };

    expect(() => cardFromRow(cardRow)).toThrow("Invalid card status");
    expect(() => reviewFromRow(reviewRow)).toThrow("Invalid review result");
  });
});
