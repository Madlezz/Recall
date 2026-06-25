import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external deps so store logic runs without Tauri/DB
vi.mock("@/services/repository", () => ({
  getRecallRepository: vi.fn().mockResolvedValue({
    loadAppData: vi.fn().mockResolvedValue({
      decks: [], cards: [], studySessions: [], reviewLogs: [],
      settings: { theme: "light", accentColor: "zinc", dyslexiaFont: false, seededAt: "", dailyNewCardLimit: 20, leechThreshold: 5, onboardingComplete: true, xp: 0, achievements: [], dailyGoal: 20, notificationsEnabled: false, soundVolume: 100, allowHtml: false, desiredRetention: 0.9, backupFolder: null, backupSchedule: "never", lastBackupAt: null, syncFolder: null, syncEnabled: false, ttsEnabled: false, ttsAutoRead: false, ttsSpeed: 1, fsrsWeights: null },
    }),
    resetToSeedData: vi.fn().mockResolvedValue({
      decks: [], cards: [], studySessions: [], reviewLogs: [],
      settings: { theme: "light", accentColor: "zinc", dyslexiaFont: false, seededAt: "", dailyNewCardLimit: 20, leechThreshold: 5, onboardingComplete: true, xp: 0, achievements: [], dailyGoal: 20, notificationsEnabled: false, soundVolume: 100, allowHtml: false, desiredRetention: 0.9, backupFolder: null, backupSchedule: "never", lastBackupAt: null, syncFolder: null, syncEnabled: false, ttsEnabled: false, ttsAutoRead: false, ttsSpeed: 1, fsrsWeights: null },
    }),
    replaceDataFromImport: vi.fn(),
    mergeDataFromImport: vi.fn(),
    saveSnapshot: vi.fn().mockResolvedValue(undefined),
    upsertDeck: vi.fn().mockResolvedValue(undefined),
    upsertCard: vi.fn().mockResolvedValue(undefined),
    deleteDeck: vi.fn().mockResolvedValue(undefined),
    deleteCard: vi.fn().mockResolvedValue(undefined),
    deleteCards: vi.fn().mockResolvedValue(undefined),
    recordReview: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockImplementation(async (s: any) => ({ settings: s, decks: [], cards: [], studySessions: [], reviewLogs: [] })),
    loadReviewLogs: vi.fn().mockResolvedValue([]),
  }),
  isTauriRuntime: () => false,
}));

vi.mock("@/services/storage", () => ({
  applyTheme: vi.fn(),
  applyAccentColor: vi.fn(),
  applyDyslexiaFont: vi.fn(),
}));

vi.mock("@/services/audio", () => ({
  setMasterVolume: vi.fn(),
  playSessionStartSound: vi.fn(),
}));

vi.mock("@/services/fsrs-engine", () => ({
  applyReview: vi.fn((card: any, _rating: string, _date: Date, _retention: number) => ({
    ...card, state: "review", reps: card.reps + 1, stability: 1, difficulty: 5,
    elapsedDays: 0, scheduledDays: 1, lastReviewDate: new Date().toISOString(),
    nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
  })),
  setCustomWeights: vi.fn(),
}));

vi.mock("@/services/notifications", () => ({
  sendDueReminder: vi.fn(),
}));

vi.mock("@/services/sync", () => ({ performSync: vi.fn() }));

vi.mock("@/lib/xp", () => ({
  REVIEW_XP: { again: 0, hard: 1, good: 2, easy: 3 },
  triggerLevelUpConfetti: vi.fn(),
  triggerAchievementConfetti: vi.fn(),
}));

vi.mock("@/lib/session-summary", () => ({
  buildSessionSummary: vi.fn(() => ({
    summary: { totalCards: 1, totalTime: 60, ratings: { again: 0, hard: 0, good: 1, easy: 0 }, xpEarned: 2, newCards: 0, correctRate: 1, deckName: "Test" },
    updatedSettings: { xp: 2, achievements: [] },
    didLevelUp: false,
    newAchievementIds: [],
  })),
}));

vi.mock("@/data/seed", () => ({
  createSeedSnapshot: () => ({
    decks: [], cards: [], studySessions: [], reviewLogs: [],
    settings: { theme: "light", accentColor: "zinc", dyslexiaFont: false, seededAt: "", dailyNewCardLimit: 20, leechThreshold: 5, onboardingComplete: true, xp: 0, achievements: [], dailyGoal: 20, notificationsEnabled: false, soundVolume: 100, allowHtml: false, desiredRetention: 0.9, backupFolder: null, backupSchedule: "never", lastBackupAt: null, syncFolder: null, syncEnabled: false, ttsEnabled: false, ttsAutoRead: false, ttsSpeed: 1, fsrsWeights: null },
  }),
}));

import { useRecallStore } from "@/stores/recall-store";
import type { Card, Deck } from "@/types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1", deckId: "deck-1", front: "Q", back: "A", hint: "", source: "",
    tags: [], cardType: "basic", state: "new", lastReviewDate: null,
    nextReviewDate: new Date().toISOString(), // Due now
    stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0,
    reps: 0, lapses: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: "deck-1", name: "Test Deck", description: "desc", color: "slate",
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function setupStore(overrides: Record<string, unknown> = {}) {
  const defaults = {
    decks: [makeDeck()],
    cards: [makeCard({ id: "c1" }), makeCard({ id: "c2", nextReviewDate: new Date(Date.now() + 86400000).toISOString() })],
    studySessions: [],
    reviewLogs: [],
    settings: { theme: "light", accentColor: "zinc", dyslexiaFont: false, seededAt: "", dailyNewCardLimit: 20, leechThreshold: 5, onboardingComplete: true, xp: 0, achievements: [], dailyGoal: 20, notificationsEnabled: false, soundVolume: 100, allowHtml: false, desiredRetention: 0.9, backupFolder: null, backupSchedule: "never", lastBackupAt: null, syncFolder: null, syncEnabled: false, ttsEnabled: false, ttsAutoRead: false, ttsSpeed: 1, fsrsWeights: null },
    activeStudy: null,
    lastSessionSummary: null,
    view: "dashboard",
    selectedDeckId: null,
    error: null,
    isLoading: false,
    isInitialized: true,
    savedSearches: [],
  };
  useRecallStore.setState({ ...defaults, ...overrides } as any);
  return useRecallStore.getState as any;
}

describe("recall-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  describe("revealAnswer", () => {
    it("sets revealed=true when study is active", () => {
      setupStore({
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1"], currentIndex: 0, revealed: false, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: false, previousCardState: null, newCardsCount: 1, sessionXp: 0 },
      });
      useRecallStore.getState().revealAnswer();
      expect(useRecallStore.getState().activeStudy!.revealed).toBe(true);
    });

    it("is a no-op when no active study", () => {
      setupStore({ activeStudy: null });
      useRecallStore.getState().revealAnswer();
      expect(useRecallStore.getState().activeStudy).toBeNull();
    });

    it("is a no-op when study is completed", () => {
      setupStore({
        activeStudy: { id: "s1", deckId: null, cardIds: [], currentIndex: 0, revealed: false, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: true, previousCardState: null, newCardsCount: 0, sessionXp: 0 },
      });
      useRecallStore.getState().revealAnswer();
      expect(useRecallStore.getState().activeStudy!.revealed).toBe(false);
    });
  });

  describe("buryCard", () => {
    it("removes current card from queue and moves to next", () => {
      setupStore({
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1", "c2"], currentIndex: 0, revealed: true, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: false, previousCardState: null, newCardsCount: 1, sessionXp: 0 },
      });
      useRecallStore.getState().buryCard();
      const active = useRecallStore.getState().activeStudy!;
      expect(active.cardIds).toEqual(["c2"]);
      expect(active.currentIndex).toBe(0);
      expect(active.revealed).toBe(false);
    });

    it("completes study when burying last card", () => {
      setupStore({
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1"], currentIndex: 0, revealed: true, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: false, previousCardState: null, newCardsCount: 1, sessionXp: 0 },
      });
      useRecallStore.getState().buryCard();
      const active = useRecallStore.getState().activeStudy!;
      expect(active.completed).toBe(true);
      expect(active.cardIds).toEqual([]);
    });

    it("is a no-op when no active study", () => {
      setupStore({ activeStudy: null });
      useRecallStore.getState().buryCard();
      expect(useRecallStore.getState().activeStudy).toBeNull();
    });
  });

  describe("startReview", () => {
    it("starts review with due cards", () => {
      setupStore({
        cards: [makeCard({ id: "c1" }), makeCard({ id: "c2" })],
      });
      const result = useRecallStore.getState().startReview();
      expect(result).toBe(true);
      const active = useRecallStore.getState().activeStudy!;
      expect(active).not.toBeNull();
      expect(active.cardIds).toContain("c1");
      expect(active.cardIds).toContain("c2");
      expect(useRecallStore.getState().view).toBe("study");
    });

    it("returns false when no due cards", () => {
      setupStore({
        cards: [makeCard({ id: "c1", nextReviewDate: new Date(Date.now() + 86400000).toISOString() })],
      });
      const result = useRecallStore.getState().startReview();
      expect(result).toBe(false);
      expect(useRecallStore.getState().activeStudy).toBeNull();
    });

    it("filters by deckId when provided", () => {
      setupStore({
        cards: [
          makeCard({ id: "c1", deckId: "deck-1" }),
          makeCard({ id: "c2", deckId: "deck-2" }),
        ],
        decks: [makeDeck({ id: "deck-1" }), makeDeck({ id: "deck-2" })],
      });
      const result = useRecallStore.getState().startReview("deck-1");
      expect(result).toBe(true);
      const active = useRecallStore.getState().activeStudy!;
      expect(active.cardIds).toEqual(["c1"]);
    });

    it("respects dailyNewCardLimit for new cards", () => {
      setupStore({
        cards: [
          makeCard({ id: "c1", state: "new" }),
          makeCard({ id: "c2", state: "new" }),
          makeCard({ id: "c3", state: "review" }),
        ],
        settings: { ...useRecallStore.getState().settings, dailyNewCardLimit: 0 },
      });
      const result = useRecallStore.getState().startReview();
      expect(result).toBe(true);
      const active = useRecallStore.getState().activeStudy!;
      // Only review card should be included (new cards blocked by limit=0)
      expect(active.cardIds).toEqual(["c3"]);
    });
  });

  describe("startCustomStudy", () => {
    it("starts custom study with all cards in deck", () => {
      setupStore({
        cards: [makeCard({ id: "c1", deckId: "d1" }), makeCard({ id: "c2", deckId: "d1" })],
        decks: [makeDeck({ id: "d1" })],
      });
      const result = useRecallStore.getState().startCustomStudy({ deckId: "d1" });
      expect(result).toBe(true);
      const active = useRecallStore.getState().activeStudy!;
      expect(active.cardIds).toHaveLength(2);
    });

    it("filters by tag", () => {
      setupStore({
        cards: [
          makeCard({ id: "c1", deckId: "d1", tags: ["math"] }),
          makeCard({ id: "c2", deckId: "d1", tags: ["history"] }),
        ],
        decks: [makeDeck({ id: "d1" })],
      });
      const result = useRecallStore.getState().startCustomStudy({ deckId: "d1", tagFilter: "math" });
      expect(result).toBe(true);
      expect(useRecallStore.getState().activeStudy!.cardIds).toEqual(["c1"]);
    });

    it("filters by multiple tags (match all)", () => {
      setupStore({
        cards: [
          makeCard({ id: "c1", deckId: "d1", tags: ["math", "easy"] }),
          makeCard({ id: "c2", deckId: "d1", tags: ["math"] }),
        ],
        decks: [makeDeck({ id: "d1" })],
      });
      const result = useRecallStore.getState().startCustomStudy({ deckId: "d1", tags: ["math", "easy"], matchMode: "all" });
      expect(result).toBe(true);
      expect(useRecallStore.getState().activeStudy!.cardIds).toEqual(["c1"]);
    });

    it("filters by multiple tags (match any)", () => {
      setupStore({
        cards: [
          makeCard({ id: "c1", deckId: "d1", tags: ["math"] }),
          makeCard({ id: "c2", deckId: "d1", tags: ["history"] }),
        ],
        decks: [makeDeck({ id: "d1" })],
      });
      const result = useRecallStore.getState().startCustomStudy({ deckId: "d1", tags: ["math", "history"], matchMode: "any" });
      expect(result).toBe(true);
      expect(useRecallStore.getState().activeStudy!.cardIds).toHaveLength(2);
    });

    it("filters newOnly", () => {
      setupStore({
        cards: [
          makeCard({ id: "c1", deckId: "d1", state: "new" }),
          makeCard({ id: "c2", deckId: "d1", state: "review" }),
        ],
        decks: [makeDeck({ id: "d1" })],
      });
      const result = useRecallStore.getState().startCustomStudy({ deckId: "d1", newOnly: true });
      expect(result).toBe(true);
      expect(useRecallStore.getState().activeStudy!.cardIds).toEqual(["c1"]);
    });

    it("limits count", () => {
      setupStore({
        cards: [
          makeCard({ id: "c1", deckId: "d1" }),
          makeCard({ id: "c2", deckId: "d1" }),
          makeCard({ id: "c3", deckId: "d1" }),
        ],
        decks: [makeDeck({ id: "d1" })],
      });
      const result = useRecallStore.getState().startCustomStudy({ deckId: "d1", count: 2 });
      expect(result).toBe(true);
      expect(useRecallStore.getState().activeStudy!.cardIds).toHaveLength(2);
    });

    it("returns false when no cards match", () => {
      setupStore({ cards: [], decks: [makeDeck({ id: "d1" })] });
      const result = useRecallStore.getState().startCustomStudy({ deckId: "d1" });
      expect(result).toBe(false);
    });
  });

  describe("answerCurrentCard", () => {
    it("advances to next card and records rating", async () => {
      setupStore({
        cards: [makeCard({ id: "c1" }), makeCard({ id: "c2" })],
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1", "c2"], currentIndex: 0, revealed: true, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: false, previousCardState: null, newCardsCount: 2, sessionXp: 0 },
      });
      await useRecallStore.getState().answerCurrentCard("good");
      const active = useRecallStore.getState().activeStudy!;
      expect(active.currentIndex).toBe(1);
      expect(active.revealed).toBe(false);
      expect(active.ratings.good).toBe(1);
      expect(active.sessionXp).toBe(2); // REVIEW_XP.good = 2
      expect(active.previousCardState!.id).toBe("c1");
    });

    it("completes study on last card", async () => {
      setupStore({
        cards: [makeCard({ id: "c1" })],
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1"], currentIndex: 0, revealed: true, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: false, previousCardState: null, newCardsCount: 1, sessionXp: 0 },
      });
      await useRecallStore.getState().answerCurrentCard("easy");
      const active = useRecallStore.getState().activeStudy!;
      expect(active.completed).toBe(true);
      expect(active.ratings.easy).toBe(1);
      expect(active.sessionXp).toBe(3); // REVIEW_XP.easy = 3
    });

    it("is a no-op when not revealed", async () => {
      setupStore({
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1"], currentIndex: 0, revealed: false, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: false, previousCardState: null, newCardsCount: 1, sessionXp: 0 },
      });
      await useRecallStore.getState().answerCurrentCard("good");
      // State unchanged
      expect(useRecallStore.getState().activeStudy!.ratings.good).toBe(0);
    });

    it("is a no-op when completed", async () => {
      setupStore({
        activeStudy: { id: "s1", deckId: null, cardIds: [], currentIndex: 0, revealed: true, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: true, previousCardState: null, newCardsCount: 0, sessionXp: 0 },
      });
      await useRecallStore.getState().answerCurrentCard("good");
      expect(useRecallStore.getState().activeStudy!.ratings.good).toBe(0);
    });

    it("records review log", async () => {
      setupStore({
        cards: [makeCard({ id: "c1" })],
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1"], currentIndex: 0, revealed: true, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: false, previousCardState: null, newCardsCount: 1, sessionXp: 0 },
      });
      await useRecallStore.getState().answerCurrentCard("good");
      expect(useRecallStore.getState().reviewLogs).toHaveLength(1);
      expect(useRecallStore.getState().reviewLogs[0].rating).toBe("good");
      expect(useRecallStore.getState().reviewLogs[0].cardId).toBe("c1");
    });
  });

  describe("undoLastReview", () => {
    it("reverts to previous card and removes last review log", async () => {
      const prevCard = makeCard({ id: "c1", state: "new", reps: 0 });
      const reviewedCard = makeCard({ id: "c1", state: "review", reps: 1 });
      setupStore({
        cards: [reviewedCard],
        reviewLogs: [{ id: "r1", cardId: "c1", rating: "good", reviewDate: new Date().toISOString(), stability: 1, difficulty: 5, elapsedDays: 0, scheduledDays: 1 } as any],
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1", "c2"], currentIndex: 1, revealed: true, startedAt: "", ratings: { again: 0, hard: 0, good: 1, easy: 0 }, completed: false, previousCardState: prevCard, newCardsCount: 1, sessionXp: 2 },
      });
      // Need c2 in cards array
      useRecallStore.setState({ cards: [reviewedCard, makeCard({ id: "c2" })] } as any);

      const result = await useRecallStore.getState().undoLastReview();
      expect(result).toBe(true);
      const active = useRecallStore.getState().activeStudy!;
      expect(active.currentIndex).toBe(0);
      expect(active.ratings.good).toBe(0);
      expect(active.sessionXp).toBe(0);
      // Card reverted to previous state
      expect(useRecallStore.getState().cards[0].state).toBe("new");
      expect(useRecallStore.getState().cards[0].reps).toBe(0);
      // Review log removed
      expect(useRecallStore.getState().reviewLogs).toHaveLength(0);
    });

    it("returns false when at first card (no undo)", async () => {
      setupStore({
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1"], currentIndex: 0, revealed: true, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: false, previousCardState: null, newCardsCount: 1, sessionXp: 0 },
      });
      const result = await useRecallStore.getState().undoLastReview();
      expect(result).toBe(false);
    });

    it("returns false when study is completed", async () => {
      setupStore({
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1", "c2"], currentIndex: 1, revealed: true, startedAt: "", ratings: { again: 0, hard: 0, good: 1, easy: 0 }, completed: true, previousCardState: null, newCardsCount: 1, sessionXp: 2 },
      });
      const result = await useRecallStore.getState().undoLastReview();
      expect(result).toBe(false);
    });
  });

  describe("clearSessionSummary", () => {
    it("clears lastSessionSummary", () => {
      setupStore({ lastSessionSummary: { totalCards: 5 } as any });
      useRecallStore.getState().clearSessionSummary();
      expect(useRecallStore.getState().lastSessionSummary).toBeNull();
    });
  });

  describe("exitStudy", () => {
    it("navigates to dashboard when exiting incomplete study", async () => {
      setupStore({
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1"], currentIndex: 0, revealed: false, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: false, previousCardState: null, newCardsCount: 1, sessionXp: 0 },
        view: "study",
      });
      await useRecallStore.getState().exitStudy();
      expect(useRecallStore.getState().view).toBe("dashboard");
      expect(useRecallStore.getState().activeStudy).toBeNull();
    });

    it("navigates to deck view when exiting with deckId", async () => {
      setupStore({
        activeStudy: { id: "s1", deckId: "deck-1", cardIds: ["c1"], currentIndex: 0, revealed: false, startedAt: "", ratings: { again: 0, hard: 0, good: 0, easy: 0 }, completed: false, previousCardState: null, newCardsCount: 1, sessionXp: 0 },
        view: "study",
        decks: [makeDeck({ id: "deck-1" })],
        selectedDeckId: "deck-1",
      });
      await useRecallStore.getState().exitStudy();
      expect(useRecallStore.getState().view).toBe("deck");
      expect(useRecallStore.getState().selectedDeckId).toBe("deck-1");
    });

    it("builds session summary when study is completed", async () => {
      setupStore({
        cards: [makeCard({ id: "c1" })],
        activeStudy: { id: "s1", deckId: null, cardIds: ["c1"], currentIndex: 0, revealed: true, startedAt: "", ratings: { again: 0, hard: 0, good: 1, easy: 0 }, completed: true, previousCardState: null, newCardsCount: 1, sessionXp: 2 },
        view: "study",
      });
      await useRecallStore.getState().exitStudy();
      expect(useRecallStore.getState().activeStudy).toBeNull();
      expect(useRecallStore.getState().lastSessionSummary).not.toBeNull();
    });
  });

  describe("exportData", () => {
    it("returns export payload with current state", () => {
      setupStore({
        decks: [makeDeck({ id: "d1" })],
        cards: [makeCard({ id: "c1", deckId: "d1" })],
      });
      const payload = useRecallStore.getState().exportData();
      expect(payload).toBeDefined();
      expect(payload.decks).toHaveLength(1);
      expect(payload.cards).toHaveLength(1);
    });
  });

  describe("loadAllReviewLogs", () => {
    it("merges new logs without duplicates", async () => {
      setupStore({
        reviewLogs: [{ id: "r1", cardId: "c1", rating: "good", reviewDate: "", stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0 } as any],
      });
      // Mock loadReviewLogs to return r1 + r2
      const { getRecallRepository } = await import("@/services/repository");
      const repo = await getRecallRepository();
      (repo.loadReviewLogs as any).mockResolvedValue([
        { id: "r1", cardId: "c1", rating: "good", reviewDate: "", stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0 },
        { id: "r2", cardId: "c2", rating: "hard", reviewDate: "", stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0 },
      ]);
      await useRecallStore.getState().loadAllReviewLogs();
      expect(useRecallStore.getState().reviewLogs).toHaveLength(2);
    });
  });
});
