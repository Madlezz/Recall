import { describe, it, expect } from "vitest";
import { dataState, ensureDeckName, ensureCardInput, touchDeck } from "@/stores/store-helpers";
import type { Deck, RecallStateSnapshot } from "@/types";

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: "deck-1",
    name: "Test Deck",
    description: "A test deck",
    color: "slate",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<RecallStateSnapshot> = {}): RecallStateSnapshot {
  return {
    decks: [],
    cards: [],
    studySessions: [],
    reviewLogs: [],
    settings: {
      theme: "light",
      accentColor: "zinc",
      dyslexiaFont: false,
      seededAt: "2026-01-01T00:00:00.000Z",
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
      syncFolder: null,
      syncEnabled: false,
      ttsEnabled: false,
      ttsAutoRead: false,
      ttsSpeed: 1,
      fsrsWeights: null,
    },
    ...overrides,
  };
}

describe("dataState", () => {
  it("extracts only snapshot fields from state", () => {
    const snapshot = makeSnapshot({ decks: [makeDeck()] });
    const state = { ...snapshot, view: "dashboard", selectedDeckId: null, extra: "ignored" };
    const result = dataState(state);
    expect(result).toEqual(snapshot);
    expect(result).not.toHaveProperty("view");
    expect(result).not.toHaveProperty("extra");
  });
});

describe("ensureDeckName", () => {
  it("throws on empty name", () => {
    expect(() => ensureDeckName("", [])).toThrow("Deck name is required");
  });

  it("throws on duplicate name (case-insensitive)", () => {
    const decks = [makeDeck({ name: "Japanese" })];
    expect(() => ensureDeckName("japanese", decks)).toThrow("unique");
    expect(() => ensureDeckName("JAPANESE", decks)).toThrow("unique");
  });

  it("accepts unique name", () => {
    const decks = [makeDeck({ name: "Japanese" })];
    expect(() => ensureDeckName("Science", decks)).not.toThrow();
  });
});

describe("ensureCardInput", () => {
  it("throws on empty front", () => {
    expect(() => ensureCardInput({ front: "", back: "answer" })).toThrow("Front is required");
    expect(() => ensureCardInput({ front: "  ", back: "answer" })).toThrow("Front is required");
  });

  it("throws on empty back for basic cards", () => {
    expect(() => ensureCardInput({ front: "question", back: "" })).toThrow("Back is required");
    expect(() => ensureCardInput({ front: "question", back: "  " })).toThrow("Back is required");
  });

  it("accepts empty back for cloze cards", () => {
    expect(() => ensureCardInput({ front: "The {{c1::sun}} rises in the east", back: "" })).not.toThrow();
  });

  it("accepts valid basic card", () => {
    expect(() => ensureCardInput({ front: "1+1", back: "2" })).not.toThrow();
  });
});

describe("touchDeck", () => {
  it("updates updatedAt for matching deck only", () => {
    const d1 = makeDeck({ id: "d1", updatedAt: "2026-01-01T00:00:00.000Z" });
    const d2 = makeDeck({ id: "d2", updatedAt: "2026-01-01T00:00:00.000Z" });
    const now = "2026-06-24T12:00:00.000Z";
    const result = touchDeck([d1, d2], "d1", now);
    expect(result[0].updatedAt).toBe(now);
    expect(result[1].updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns unchanged array if deck not found", () => {
    const d1 = makeDeck({ id: "d1" });
    const result = touchDeck([d1], "nonexistent", "2026-06-24T12:00:00.000Z");
    expect(result[0].updatedAt).toBe(d1.updatedAt);
  });
});
