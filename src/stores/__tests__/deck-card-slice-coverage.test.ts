import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock repository so persist functions run but don't hit DB
vi.mock("@/services/repository", () => {
  const mockRepo = {
    upsertDeck: vi.fn().mockResolvedValue(undefined),
    upsertCard: vi.fn().mockResolvedValue(undefined),
    deleteDeck: vi.fn().mockResolvedValue(undefined),
    deleteCard: vi.fn().mockResolvedValue(undefined),
    deleteCards: vi.fn().mockResolvedValue(undefined),
    saveSnapshot: vi.fn().mockResolvedValue(undefined),
    loadAppData: vi.fn().mockResolvedValue({ decks: [], cards: [], studySessions: [], reviewLogs: [], settings: {} }),
    loadReviewLogs: vi.fn().mockResolvedValue([]),
    recordReview: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockImplementation(async (settings: any) => ({ settings, decks: [], cards: [], studySessions: [], reviewLogs: [] })),
    replaceDataFromImport: vi.fn(),
    mergeDataFromImport: vi.fn(),
  };
  return {
    getRecallRepository: vi.fn().mockResolvedValue(mockRepo),
    isTauriRuntime: () => false,
  };
});

// Mock storage side-effects
vi.mock("@/services/storage", () => ({
  applyTheme: vi.fn(),
  applyAccentColor: vi.fn(),
  applyDyslexiaFont: vi.fn(),
}));

vi.mock("@/services/audio", () => ({ setMasterVolume: vi.fn() }));
vi.mock("@/services/fsrs-engine", () => ({ setCustomWeights: vi.fn() }));
vi.mock("@/services/sync", () => ({ performSync: vi.fn() }));

import { deckCardSlice } from "@/stores/slices/deck-card.slice";
import type { Card, Deck, RecallStateSnapshot } from "@/types";

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: "deck-1", name: "Test", description: "desc", color: "slate",
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1", deckId: "deck-1", front: "Q", back: "A", hint: "", source: "",
    tags: [], cardType: "basic", state: "new", lastReviewDate: null,
    nextReviewDate: "2026-06-24T00:00:00.000Z", stability: 0, difficulty: 0,
    elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSettings() {
  return {
    theme: "light" as const, accentColor: "zinc" as const, dyslexiaFont: false,
    seededAt: "2026-01-01T00:00:00.000Z", dailyNewCardLimit: 20, leechThreshold: 5,
    onboardingComplete: true, xp: 0, achievements: [] as any[], dailyGoal: 20,
    notificationsEnabled: false, soundVolume: 100, allowHtml: false,
    desiredRetention: 0.9, backupFolder: null, backupSchedule: "never" as const,
    lastBackupAt: null, syncFolder: null, syncEnabled: false,
    ttsEnabled: false, ttsAutoRead: false, ttsSpeed: 1, fsrsWeights: null,
  };
}

function createSliceWithState(initialState?: Partial<RecallStateSnapshot>) {
  let state: Record<string, unknown> = {
    decks: [] as Deck[], cards: [] as Card[],
    studySessions: [], reviewLogs: [],
    settings: makeSettings(),
    ...initialState,
  };
  const set = (partial: Record<string, unknown>) => { state = { ...state, ...partial }; };
  const get = () => state as any;
  const slice = deckCardSlice(set as any, get);
  // Expose updateCard on get() for moveCard
  (state as any).updateCard = slice.updateCard;
  return { slice, getState: () => state as any };
}

describe("deckCardSlice – coverage tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateDeck", () => {
    it("updates deck name, description, and color", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1", name: "Old", description: "old desc", color: "blue" })],
      });

      await slice.updateDeck("d1", { name: "Renamed", description: " new desc ", color: "rose" });

      const deck = getState().decks[0];
      expect(deck.name).toBe("Renamed");
      expect(deck.description).toBe("new desc");
      expect(deck.color).toBe("rose");
      expect(deck.id).toBe("d1");
    });

    it("preserves other decks when updating one", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [
          makeDeck({ id: "d1", name: "Deck1" }),
          makeDeck({ id: "d2", name: "Deck2" }),
        ],
      });

      await slice.updateDeck("d1", { name: "Updated1", description: "desc", color: "green" });

      expect(getState().decks).toHaveLength(2);
      expect(getState().decks[0].name).toBe("Updated1");
      expect(getState().decks[1].name).toBe("Deck2");
    });

    it("allows keeping the same name (excludes self from duplicate check)", async () => {
      const { slice } = createSliceWithState({
        decks: [makeDeck({ id: "d1", name: "MyDeck" })],
      });

      // Should not throw – same name is fine when updating itself
      await expect(
        slice.updateDeck("d1", { name: "MyDeck", description: "desc", color: "slate" })
      ).resolves.toBeUndefined();
    });

    it("throws on duplicate name with another deck", async () => {
      const { slice } = createSliceWithState({
        decks: [
          makeDeck({ id: "d1", name: "Deck1" }),
          makeDeck({ id: "d2", name: "Deck2" }),
        ],
      });

      await expect(
        slice.updateDeck("d1", { name: "Deck2", description: "", color: "slate" })
      ).rejects.toThrow("unique");
    });

    it("throws on empty name", async () => {
      const { slice } = createSliceWithState({
        decks: [makeDeck({ id: "d1" })],
      });

      await expect(
        slice.updateDeck("d1", { name: "", description: "", color: "slate" })
      ).rejects.toThrow("Deck name is required");
    });

    it("updates updatedAt timestamp", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1", updatedAt: "2020-01-01T00:00:00.000Z" })],
      });

      await slice.updateDeck("d1", { name: "Test", description: "desc", color: "slate" });

      const deck = getState().decks[0];
      expect(deck.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    });
  });

  describe("updateCard", () => {
    it("updates card fields", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1" })],
        cards: [makeCard({ id: "c1", deckId: "d1", front: "Old Q", back: "Old A" })],
      });

      await slice.updateCard("c1", {
        deckId: "d1", front: " New Q ", back: " New A ",
        hint: " h ", source: " s ", tags: ["t1"],
      });

      const card = getState().cards[0];
      expect(card.front).toBe("New Q");
      expect(card.back).toBe("New A");
      expect(card.hint).toBe("h");
      expect(card.source).toBe("s");
      expect(card.tags).toEqual(["t1"]);
    });

    it("preserves existing cardType when input has none", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1" })],
        cards: [makeCard({ id: "c1", deckId: "d1", cardType: "cloze" })],
      });

      await slice.updateCard("c1", {
        deckId: "d1", front: "Q", back: "A",
        hint: "", source: "", tags: [],
      });

      expect(getState().cards[0].cardType).toBe("cloze");
    });

    it("overrides cardType when explicitly provided", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1" })],
        cards: [makeCard({ id: "c1", deckId: "d1", cardType: "basic" })],
      });

      await slice.updateCard("c1", {
        deckId: "d1", front: "Q", back: "A",
        hint: "", source: "", tags: [], cardType: "cloze",
      });

      expect(getState().cards[0].cardType).toBe("cloze");
    });

    it("preserves other cards when updating one", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1" })],
        cards: [
          makeCard({ id: "c1", deckId: "d1", front: "Q1" }),
          makeCard({ id: "c2", deckId: "d1", front: "Q2" }),
        ],
      });

      await slice.updateCard("c1", {
        deckId: "d1", front: "Updated", back: "A",
        hint: "", source: "", tags: [],
      });

      expect(getState().cards).toHaveLength(2);
      expect(getState().cards[0].front).toBe("Updated");
      expect(getState().cards[1].front).toBe("Q2");
    });

    it("throws on empty front", async () => {
      const { slice } = createSliceWithState({
        decks: [makeDeck({ id: "d1" })],
        cards: [makeCard({ id: "c1", deckId: "d1" })],
      });

      await expect(slice.updateCard("c1", {
        deckId: "d1", front: "", back: "A",
        hint: "", source: "", tags: [],
      })).rejects.toThrow("Front is required");
    });
  });

  describe("setExamDeadline", () => {
    it("sets a deadline on the deck", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1" })],
      });

      await slice.setExamDeadline("d1", "2026-12-31T23:59:59.000Z");

      const deck = getState().decks[0];
      expect(deck.examDeadline).toBe("2026-12-31T23:59:59.000Z");
    });

    it("clears deadline when null is passed", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1", examDeadline: "2026-12-31" })],
      });

      await slice.setExamDeadline("d1", null);

      const deck = getState().decks[0];
      expect(deck.examDeadline).toBeUndefined();
    });

    it("updates the deck updatedAt timestamp", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1", updatedAt: "2020-01-01T00:00:00.000Z" })],
      });

      await slice.setExamDeadline("d1", "2026-12-31");

      const deck = getState().decks[0];
      expect(deck.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    });

    it("preserves other decks", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [
          makeDeck({ id: "d1" }),
          makeDeck({ id: "d2", name: "Other" }),
        ],
      });

      await slice.setExamDeadline("d1", "2026-12-31");

      expect(getState().decks).toHaveLength(2);
      expect(getState().decks[1].name).toBe("Other");
      expect(getState().decks[1].examDeadline).toBeUndefined();
    });
  });
});
