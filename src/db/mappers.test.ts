import { describe, expect, it } from "vitest";
import type { CardRow, DeckRow, ReviewLogRow, StudySessionRow } from "@/db/mappers";
import {
  cardFromRow,
  cardToRow,
  deckFromRow,
  deckToRow,
  reviewLogFromRow,
  reviewLogToRow,
  settingsFromRows,
  settingsToRows,
  studySessionFromRow,
  studySessionToRow,
} from "@/db/mappers";
import type { Card, Deck, RecallSettings, ReviewLog, StudySession } from "@/types";

describe("database mappers", () => {
  it("round-trips card rows with JSON tags and nullable review date", () => {
    const card: Card = {
      id: "card-1",
      deckId: "deck-1",
      front: "Question",
      back: "Answer",
      hint: "",
      source: "",
      tags: ["sqlite", "tauri"],
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
    };

    const row = cardToRow(card);
    expect(row.tags).toBe('["sqlite","tauri"]');
    expect(row.last_review_date).toBeNull();
    expect(cardFromRow(row)).toEqual(card);
  });

  it("round-trips deck, session, review log, and settings rows", () => {
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
    };
    const reviewLog: ReviewLog = {
      id: "review-1",
      cardId: "card-1",
      rating: "good",
      reviewDate: "2026-06-01T00:10:00.000Z",
      stability: 1.0,
      difficulty: 5.0,
      elapsedDays: 0,
      scheduledDays: 1,
    };
    const settings: RecallSettings = {
      theme: "dark",
      seededAt: "2026-06-01T00:00:00.000Z",
      dailyNewCardLimit: 20,
      leechThreshold: 5,
      onboardingComplete: true,
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
    ttsEnabled: false,
    ttsAutoRead: false,
    ttsSpeed: 1,
    };

    expect(deckFromRow(deckToRow(deck) as DeckRow)).toEqual(deck);
    expect(studySessionFromRow(studySessionToRow(session) as StudySessionRow)).toEqual(session);
    expect(reviewLogFromRow(reviewLogToRow(reviewLog) as ReviewLogRow)).toEqual(reviewLog);
    expect(settingsFromRows(settingsToRows(settings))).toEqual(settings);
    expect(settingsToRows(settings)).toContainEqual({ key: "schema_version", value: "4" });
  });

  it("rejects invalid card state and review rating rows", () => {
    const cardRow: CardRow = {
      id: "card-1",
      deck_id: "deck-1",
      front: "Question",
      back: "Answer",
      hint: "",
      source: "",
      tags: "[]",
      card_type: "basic",
      state: "bad",
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      last_review_date: null,
      next_review_date: "2026-06-01T00:00:00.000Z",
      created_at: "2026-06-01T00:00:00.000Z",
      updated_at: "2026-06-01T00:00:00.000Z",
    };
    const reviewLogRow: ReviewLogRow = {
      id: "review-1",
      card_id: "card-1",
      rating: "bad",
      review_date: "2026-06-01T00:10:00.000Z",
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
    };

    expect(() => cardFromRow(cardRow)).toThrow("Invalid card state");
    expect(() => reviewLogFromRow(reviewLogRow)).toThrow("Invalid review rating");
  });
});