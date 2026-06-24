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
  // Also expose updateCard on get() for moveCard
  (state as any).updateCard = slice.updateCard;
  return { slice, getState: () => state as any };
}

describe("deckCardSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createDeck", () => {
    it("creates a deck and returns its id", async () => {
      const { slice, getState } = createSliceWithState();
      const id = await slice.createDeck({ name: "New Deck", description: "Test", color: "blue" });
      expect(id).toMatch(/^deck/);
      expect(getState().decks).toHaveLength(1);
      expect(getState().decks[0].name).toBe("New Deck");
    });

    it("throws on empty name", async () => {
      const { slice } = createSliceWithState();
      await expect(slice.createDeck({ name: "", description: "", color: "slate" }))
        .rejects.toThrow("Deck name is required");
    });

    it("throws on duplicate name", async () => {
      const { slice } = createSliceWithState({ decks: [makeDeck({ name: "Existing" })] });
      await expect(slice.createDeck({ name: "Existing", description: "", color: "slate" }))
        .rejects.toThrow("unique");
    });
  });

  describe("createCard", () => {
    it("creates a basic card", async () => {
      const { slice, getState } = createSliceWithState({ decks: [makeDeck()] });
      const id = await slice.createCard({
        deckId: "deck-1", front: "1+1", back: "2",
        hint: "", source: "", tags: ["math"],
      });
      expect(id).toMatch(/^card/);
      expect(getState().cards).toHaveLength(1);
      expect(getState().cards[0].cardType).toBe("basic");
    });

    it("creates a cloze card when front has cloze syntax", async () => {
      const { slice, getState } = createSliceWithState({ decks: [makeDeck()] });
      await slice.createCard({
        deckId: "deck-1", front: "The {{c1::sun}} is hot", back: "",
        hint: "", source: "", tags: [],
      });
      expect(getState().cards[0].cardType).toBe("cloze");
    });

    it("throws on empty front", async () => {
      const { slice } = createSliceWithState({ decks: [makeDeck()] });
      await expect(slice.createCard({
        deckId: "deck-1", front: "", back: "A", hint: "", source: "", tags: [],
      })).rejects.toThrow("Front is required");
    });
  });

  describe("deleteDeck", () => {
    it("removes deck, its cards, review logs, and sessions", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck()],
        cards: [makeCard({ deckId: "deck-1" }), makeCard({ id: "card-2", deckId: "deck-1" })],
        reviewLogs: [{ id: "r1", cardId: "card-1" } as any],
        studySessions: [{ id: "s1", deckId: "deck-1" } as any],
      });

      await slice.deleteDeck("deck-1");

      expect(getState().decks).toHaveLength(0);
      expect(getState().cards).toHaveLength(0);
      expect(getState().reviewLogs).toHaveLength(0);
      expect(getState().studySessions).toHaveLength(0);
    });
  });

  describe("deleteCard", () => {
    it("removes card and its review logs", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck()],
        cards: [makeCard({ id: "c1" }), makeCard({ id: "c2" })],
        reviewLogs: [{ id: "r1", cardId: "c1" } as any, { id: "r2", cardId: "c2" } as any],
      });

      await slice.deleteCard("c1");

      expect(getState().cards).toHaveLength(1);
      expect(getState().cards[0].id).toBe("c2");
      expect(getState().reviewLogs).toHaveLength(1);
      expect(getState().reviewLogs[0].cardId).toBe("c2");
    });
  });

  describe("deleteCards (batch)", () => {
    it("removes multiple cards and their logs in one call", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck()],
        cards: [makeCard({ id: "c1" }), makeCard({ id: "c2" }), makeCard({ id: "c3" })],
        reviewLogs: [
          { id: "r1", cardId: "c1" } as any,
          { id: "r2", cardId: "c2" } as any,
          { id: "r3", cardId: "c3" } as any,
        ],
      });

      await slice.deleteCards(["c1", "c3"]);

      expect(getState().cards).toHaveLength(1);
      expect(getState().cards[0].id).toBe("c2");
      expect(getState().reviewLogs).toHaveLength(1);
      expect(getState().reviewLogs[0].cardId).toBe("c2");
    });

    it("is a no-op for empty array", async () => {
      const { slice } = createSliceWithState({ decks: [makeDeck()] });
      await slice.deleteCards([]);
      // Should not throw, should not call repo
    });
  });

  describe("moveCard", () => {
    it("calls updateCard with new deckId", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1" }), makeDeck({ id: "d2" })],
        cards: [makeCard({ id: "c1", deckId: "d1" })],
      });

      await slice.moveCard("c1", "d2");

      expect(getState().cards[0].deckId).toBe("d2");
    });

    it("is a no-op if card already in target deck", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1" })],
        cards: [makeCard({ id: "c1", deckId: "d1" })],
      });

      await slice.moveCard("c1", "d1");
      // State unchanged - card stays in d1
      expect(getState().cards[0].deckId).toBe("d1");
    });

    it("is a no-op if card not found", async () => {
      const { slice } = createSliceWithState({ decks: [makeDeck()], cards: [] });
      await slice.moveCard("nonexistent", "deck-1");
      // Should not throw
    });
  });

  describe("resetDeckProgress", () => {
    it("resets all cards in deck to new state", async () => {
      const { slice, getState } = createSliceWithState({
        decks: [makeDeck({ id: "d1" })],
        cards: [
          makeCard({ id: "c1", deckId: "d1", state: "review", reps: 5, lapses: 2, stability: 10 }),
          makeCard({ id: "c2", deckId: "d1", state: "learning", reps: 3 }),
          makeCard({ id: "c3", deckId: "other", state: "review", reps: 1 }),
        ],
        reviewLogs: [{ id: "r1", cardId: "c1" } as any, { id: "r2", cardId: "c3" } as any],
        studySessions: [{ id: "s1", deckId: "d1" } as any, { id: "s2", deckId: "other" } as any],
      });

      await slice.resetDeckProgress("d1");

      const cards = getState().cards;
      expect(cards[0].state).toBe("new");
      expect(cards[0].reps).toBe(0);
      expect(cards[0].lapses).toBe(0);
      expect(cards[0].stability).toBe(0);
      expect(cards[1].state).toBe("new");
      expect(cards[2].state).toBe("review");
      expect(getState().reviewLogs).toHaveLength(1);
      expect(getState().reviewLogs[0].cardId).toBe("c3");
      expect(getState().studySessions).toHaveLength(1);
      expect(getState().studySessions[0].deckId).toBe("other");
    });
  });
});
