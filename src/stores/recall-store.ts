import { create } from "zustand";
import { createSeedSnapshot } from "@/data/seed";
import { isCardDueToday } from "@/lib/stats";
import { createId, normalizeName } from "@/lib/utils";
import { buildExportPayload } from "@/services/import-export";
import { getRecallRepository, type RecallRepository } from "@/services/repository";
import { applyReviewResult } from "@/services/study-engine";
import { applyTheme } from "@/services/storage";
import type {
  ActiveStudySession,
  AppView,
  Card,
  Deck,
  DeckColor,
  RecallExportPayload,
  RecallStateSnapshot,
  Review,
  ReviewResult,
  StudySession,
  Theme,
} from "@/types";

interface DeckInput {
  name: string;
  description: string;
  color: DeckColor;
}

interface CardInput {
  deckId: string;
  front: string;
  back: string;
  hint: string;
  tags: string[];
}

interface RecallStore extends RecallStateSnapshot {
  view: AppView;
  selectedDeckId: string | null;
  activeStudy: ActiveStudySession | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  showDashboard: () => void;
  showSettings: () => void;
  showDeck: (deckId: string) => void;
  createDeck: (input: DeckInput) => Promise<string>;
  updateDeck: (deckId: string, input: DeckInput) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  createCard: (input: CardInput) => Promise<string>;
  updateCard: (cardId: string, input: CardInput) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, deckId: string) => Promise<void>;
  startReview: (deckId?: string | null) => boolean;
  revealAnswer: () => void;
  answerCurrentCard: (result: ReviewResult) => Promise<void>;
  exitStudy: () => void;
  resetData: () => Promise<void>;
  replaceData: (payload: RecallExportPayload) => Promise<void>;
  mergeData: (payload: RecallExportPayload) => Promise<void>;
  exportData: () => RecallExportPayload;
}

const initialSnapshot = createSeedSnapshot();
let repositoryPromise: Promise<RecallRepository> | null = null;

applyTheme(initialSnapshot.settings.theme);

export const useRecallStore = create<RecallStore>((set, get) => ({
  ...initialSnapshot,
  view: "dashboard",
  selectedDeckId: null,
  activeStudy: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  async initialize() {
    if (get().isInitialized) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const repository = await getRepository();
      const snapshot = await repository.loadAppData();
      applyTheme(snapshot.settings.theme);
      set({ ...snapshot, isLoading: false, isInitialized: true, error: null });
    } catch (error) {
      set({
        isLoading: false,
        isInitialized: true,
        error: error instanceof Error ? error.message : "Failed to load app data",
      });
    }
  },

  async setTheme(theme) {
    const repository = await getRepository();
    const snapshot = await repository.saveTheme(theme, dataState(get()));
    commitSnapshot(set, snapshot);
  },

  showDashboard() {
    set({ view: "dashboard", selectedDeckId: null, activeStudy: null });
  },

  showSettings() {
    set({ view: "settings", selectedDeckId: null, activeStudy: null });
  },

  showDeck(deckId) {
    set({ view: "deck", selectedDeckId: deckId, activeStudy: null });
  },

  async createDeck(input) {
    const name = normalizeName(input.name);
    ensureDeckName(name, get().decks);

    const now = new Date().toISOString();
    const deck: Deck = {
      id: createId("deck"),
      name,
      description: input.description.trim(),
      color: input.color,
      createdAt: now,
      updatedAt: now,
    };
    const snapshot = { ...dataState(get()), decks: [...get().decks, deck] };

    await persist(set, snapshot);
    return deck.id;
  },

  async updateDeck(deckId, input) {
    const name = normalizeName(input.name);
    ensureDeckName(
      name,
      get().decks.filter((deck) => deck.id !== deckId),
    );

    const now = new Date().toISOString();
    const snapshot = {
      ...dataState(get()),
      decks: get().decks.map((deck) =>
        deck.id === deckId
          ? { ...deck, name, description: input.description.trim(), color: input.color, updatedAt: now }
          : deck,
      ),
    };
    await persist(set, snapshot);
  },

  async deleteDeck(deckId) {
    const deletedCardIds = new Set(get().cards.filter((card) => card.deckId === deckId).map((card) => card.id));
    const snapshot = {
      ...dataState(get()),
      decks: get().decks.filter((deck) => deck.id !== deckId),
      cards: get().cards.filter((card) => card.deckId !== deckId),
      reviews: get().reviews.filter((review) => !deletedCardIds.has(review.cardId)),
      studySessions: get().studySessions.filter((session) => session.deckId !== deckId),
    };

    await persist(set, snapshot, { view: "dashboard", selectedDeckId: null, activeStudy: null });
  },

  async createCard(input) {
    ensureCardInput(input);

    const now = new Date().toISOString();
    const card: Card = {
      id: createId("card"),
      deckId: input.deckId,
      front: input.front.trim(),
      back: input.back.trim(),
      hint: input.hint.trim(),
      tags: input.tags,
      status: "new",
      correctCount: 0,
      incorrectCount: 0,
      streak: 0,
      easeFactor: 2.5,
      lastReviewedAt: null,
      nextReviewAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const snapshot = {
      ...dataState(get()),
      cards: [...get().cards, card],
      decks: touchDeck(get().decks, input.deckId, now),
    };

    await persist(set, snapshot);
    return card.id;
  },

  async updateCard(cardId, input) {
    ensureCardInput(input);

    const now = new Date().toISOString();
    const snapshot = {
      ...dataState(get()),
      cards: get().cards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              deckId: input.deckId,
              front: input.front.trim(),
              back: input.back.trim(),
              hint: input.hint.trim(),
              tags: input.tags,
              updatedAt: now,
            }
          : card,
      ),
      decks: touchDeck(get().decks, input.deckId, now),
    };

    await persist(set, snapshot);
  },

  async deleteCard(cardId) {
    const snapshot = {
      ...dataState(get()),
      cards: get().cards.filter((card) => card.id !== cardId),
      reviews: get().reviews.filter((review) => review.cardId !== cardId),
    };
    await persist(set, snapshot);
  },

  async moveCard(cardId, deckId) {
    const card = get().cards.find((item) => item.id === cardId);
    if (!card || card.deckId === deckId) {
      return;
    }

    await get().updateCard(cardId, { deckId, front: card.front, back: card.back, hint: card.hint, tags: card.tags });
  },

  startReview(deckId = null) {
    const dueCards = get()
      .cards.filter((card) => (deckId ? card.deckId === deckId : true))
      .filter((card) => isCardDueToday(card))
      .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));

    if (dueCards.length === 0) {
      return false;
    }

    const now = new Date().toISOString();
    set({
      view: "study",
      selectedDeckId: deckId,
      activeStudy: {
        id: createId("session"),
        deckId,
        cardIds: dueCards.map((card) => card.id),
        currentIndex: 0,
        revealed: false,
        startedAt: now,
        correct: 0,
        incorrect: 0,
        completed: false,
      },
    });
    return true;
  },

  revealAnswer() {
    const activeStudy = get().activeStudy;
    if (!activeStudy || activeStudy.completed) {
      return;
    }

    set({ activeStudy: { ...activeStudy, revealed: true } });
  },

  async answerCurrentCard(result) {
    const state = get();
    const activeStudy = state.activeStudy;
    if (!activeStudy || activeStudy.completed || !activeStudy.revealed) {
      return;
    }

    const cardId = activeStudy.cardIds[activeStudy.currentIndex];
    const card = state.cards.find((item) => item.id === cardId);
    if (!card) {
      return;
    }

    const reviewedAt = new Date();
    const updatedCard = applyReviewResult(card, result, reviewedAt);
    const review: Review = {
      id: createId("review"),
      cardId,
      sessionId: activeStudy.id,
      answeredAt: reviewedAt.toISOString(),
      result,
    };
    const nextCorrect = activeStudy.correct + (result === "correct" ? 1 : 0);
    const nextIncorrect = activeStudy.incorrect + (result === "incorrect" ? 1 : 0);
    const isLast = activeStudy.currentIndex >= activeStudy.cardIds.length - 1;
    const nextActiveStudy: ActiveStudySession = isLast
      ? { ...activeStudy, correct: nextCorrect, incorrect: nextIncorrect, completed: true }
      : {
          ...activeStudy,
          currentIndex: activeStudy.currentIndex + 1,
          revealed: false,
          correct: nextCorrect,
          incorrect: nextIncorrect,
        };
    const nextStudySessions: StudySession[] = isLast
      ? [
          ...state.studySessions,
          {
            id: activeStudy.id,
            deckId: activeStudy.deckId,
            startedAt: activeStudy.startedAt,
            endedAt: reviewedAt.toISOString(),
            cardsStudied: activeStudy.cardIds.length,
            correct: nextCorrect,
            incorrect: nextIncorrect,
          },
        ]
      : state.studySessions;
    const snapshot: RecallStateSnapshot = {
      decks: state.decks,
      cards: state.cards.map((item) => (item.id === cardId ? updatedCard : item)),
      studySessions: nextStudySessions,
      reviews: [...state.reviews, review],
      settings: state.settings,
    };

    await persistReview(set, snapshot, { activeStudy: nextActiveStudy });
  },

  exitStudy() {
    const deckId = get().activeStudy?.deckId ?? get().selectedDeckId;
    set({ view: deckId ? "deck" : "dashboard", selectedDeckId: deckId, activeStudy: null });
  },

  async resetData() {
    const repository = await getRepository();
    const snapshot = await repository.resetToSeedData();
    commitSnapshot(set, snapshot, { view: "dashboard", selectedDeckId: null, activeStudy: null });
  },

  async replaceData(payload) {
    const repository = await getRepository();
    const snapshot = await repository.replaceDataFromImport(payload);
    commitSnapshot(set, snapshot, { view: "dashboard", selectedDeckId: null, activeStudy: null });
  },

  async mergeData(payload) {
    const repository = await getRepository();
    const snapshot = await repository.mergeDataFromImport(dataState(get()), payload);
    commitSnapshot(set, snapshot, { view: "dashboard", selectedDeckId: null, activeStudy: null });
  },

  exportData() {
    return buildExportPayload(dataState(get()));
  },
}));

async function getRepository(): Promise<RecallRepository> {
  repositoryPromise ??= getRecallRepository();
  return repositoryPromise;
}

async function persist(
  set: (partial: Partial<RecallStore>) => void,
  snapshot: RecallStateSnapshot,
  extra: Partial<Pick<RecallStore, "view" | "selectedDeckId" | "activeStudy">> = {},
): Promise<void> {
  const repository = await getRepository();
  await repository.saveSnapshot(snapshot);
  commitSnapshot(set, snapshot, extra);
}

async function persistReview(
  set: (partial: Partial<RecallStore>) => void,
  snapshot: RecallStateSnapshot,
  extra: Partial<Pick<RecallStore, "activeStudy">>,
): Promise<void> {
  const repository = await getRepository();
  await repository.recordReviewSession(snapshot);
  commitSnapshot(set, snapshot, extra);
}

function commitSnapshot(
  set: (partial: Partial<RecallStore>) => void,
  snapshot: RecallStateSnapshot,
  extra: Partial<Pick<RecallStore, "view" | "selectedDeckId" | "activeStudy">> = {},
): void {
  applyTheme(snapshot.settings.theme);
  set({ ...snapshot, ...extra, error: null });
}

function dataState(state: RecallStore): RecallStateSnapshot {
  return {
    decks: state.decks,
    cards: state.cards,
    studySessions: state.studySessions,
    reviews: state.reviews,
    settings: state.settings,
  };
}

function ensureDeckName(name: string, decks: Deck[]): void {
  if (!name) {
    throw new Error("Deck name is required.");
  }

  if (decks.some((deck) => normalizeName(deck.name).toLowerCase() === name.toLowerCase())) {
    throw new Error("Deck name must be unique.");
  }
}

function ensureCardInput(input: CardInput): void {
  if (!input.front.trim()) {
    throw new Error("Front is required.");
  }

  if (!input.back.trim()) {
    throw new Error("Back is required.");
  }
}

function touchDeck(decks: Deck[], deckId: string, updatedAt: string): Deck[] {
  return decks.map((deck) => (deck.id === deckId ? { ...deck, updatedAt } : deck));
}
