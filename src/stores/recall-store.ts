import { create } from "zustand";
import { createSeedSnapshot } from "@/data/seed";
import { getNewCardsReviewedToday, isCardDueToday } from "@/lib/stats";
import { createId } from "@/lib/utils";
import { buildExportPayload } from "@/services/import-export";
import { getRecallRepository, type RecallRepository } from "@/services/repository";
import { applyTheme } from "@/services/storage";
import { applyReview } from "@/services/fsrs-engine";
import { playSessionStartSound } from "@/services/audio";
import {
  REVIEW_XP,
  getLevel,
  checkAchievements,
  applyNewAchievements,
  triggerLevelUpConfetti,
  triggerAchievementConfetti,
} from "@/lib/xp";
import { ACHIEVEMENT_DEFS } from "@/types";
import { getStudyStreak } from "@/lib/streak";
import type {
  ActiveStudySession,
  AppView,
  Card,
  Deck,
  DeckColor,
  RecallExportPayload,
  RecallStateSnapshot,
  ReviewLog,
  ReviewRating,
  SessionSummary,
  StudySession,
} from "@/types";
import { navigationSlice, type NavigationSlice } from "./slices/navigation.slice";
import { deckCardSlice, type DeckCardSlice, type DeckInput, type CardInput } from "./slices/deck-card.slice";
import { settingsSlice, type SettingsSlice } from "./slices/settings.slice";
import { dataState, persistSnapshot, persistReviewSnapshot, getRepository } from "./store-helpers";

// ── Store type ──

type RecallStore = RecallStateSnapshot &
  NavigationSlice &
  DeckCardSlice &
  SettingsSlice & {
    activeStudy: ActiveStudySession | null;
    lastSessionSummary: SessionSummary | null;
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
    initialize: () => Promise<void>;
    startReview: (deckId?: string | null) => boolean;
    revealAnswer: () => void;
    buryCard: () => void;
    snoozeCard: (minutes: number) => Promise<void>;
    answerCurrentCard: (result: ReviewRating) => Promise<void>;
    undoLastReview: () => Promise<void>;
    exitStudy: () => void;
    clearSessionSummary: () => void;
    resetData: () => Promise<void>;
    replaceData: (payload: RecallExportPayload) => Promise<void>;
    mergeData: (payload: RecallExportPayload) => Promise<void>;
    exportData: () => RecallExportPayload;
  };

export type { DeckInput, CardInput };

// ── Initial state ──

const initialSnapshot = createSeedSnapshot();
applyTheme(initialSnapshot.settings.theme);

// ── Store ──

export const useRecallStore = create<RecallStore>((set, get) => ({
  ...initialSnapshot,
  ...navigationSlice(set, get),
  ...deckCardSlice(set, get),
  ...settingsSlice(set, get),

  activeStudy: null,
  lastSessionSummary: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  async initialize() {
    if (get().isInitialized) return;
    set({ isLoading: true, error: null });
    try {
      const repository = await getRecallRepository();
      const snapshot = await repository.loadAppData();
      applyTheme(snapshot.settings.theme);
      const view = snapshot.settings.onboardingComplete ? "dashboard" : "onboarding";
      set({ ...snapshot, view, isLoading: false, isInitialized: true, error: null });
    } catch (error) {
      set({
        isLoading: false, isInitialized: true,
        error: error instanceof Error ? error.message : "Failed to load app data",
      });
    }
  },

  // ── Study session ──

  startReview(deckId = null) {
    const state = get();
    const limit = state.settings.dailyNewCardLimit;
    const dueCards = state.cards
      .filter((card: Card) => (deckId ? card.deckId === deckId : true))
      .filter((card: Card) => isCardDueToday(card))
      .sort((a: Card, b: Card) => a.nextReviewDate.localeCompare(b.nextReviewDate));
    if (dueCards.length === 0) return false;

    const newCardsReviewedToday = getNewCardsReviewedToday(state.reviewLogs);
    let newCardsAllowed = Math.max(0, limit - newCardsReviewedToday);
    const filteredDueCards = dueCards.filter((card: Card) => {
      if (card.state === "new") {
        if (newCardsAllowed > 0) { newCardsAllowed--; return true; }
        return false;
      }
      return true;
    });
    if (filteredDueCards.length === 0) return false;

    const newCardsCount = filteredDueCards.filter((c: Card) => c.state === "new").length;
    const now = new Date().toISOString();
    set({
      view: "study", selectedDeckId: deckId,
      activeStudy: {
        id: createId("session"), deckId,
        cardIds: filteredDueCards.map((c: Card) => c.id),
        currentIndex: 0, revealed: false, startedAt: now,
        ratings: { again: 0, hard: 0, good: 0, easy: 0 },
        completed: false, previousCardState: null,
        newCardsCount, sessionXp: 0,
      },
    });
    playSessionStartSound();
    return true;
  },

  revealAnswer() {
    const active = get().activeStudy;
    if (!active || active.completed) return;
    set({ activeStudy: { ...active, revealed: true } });
  },

  buryCard() {
    const state = get();
    const active = state.activeStudy;
    if (!active || active.completed) return;
    const cardId = active.cardIds[active.currentIndex];
    const remaining = active.cardIds.filter((id: string) => id !== cardId);
    if (remaining.length === 0) {
      set({ activeStudy: { ...active, cardIds: [], completed: true, previousCardState: null } });
      return;
    }
    set({
      activeStudy: {
        ...active, cardIds: remaining,
        currentIndex: Math.min(active.currentIndex, remaining.length - 1),
        revealed: false,
      },
    });
  },

  async snoozeCard(minutes: number) {
    const state = get();
    const active = state.activeStudy;
    if (!active || active.completed) return;
    const cardId = active.cardIds[active.currentIndex];
    const card = state.cards.find((c: Card) => c.id === cardId);
    if (!card) return;

    const newNextReview = new Date(Date.now() + minutes * 60 * 1000);
    const updatedCard: Card = { ...card, nextReviewDate: newNextReview.toISOString(), state: card.state === "new" ? "learning" : card.state };
    const repo = await getRepository();
    const snapshot = await repo.saveSnapshot({
      ...dataState(state), cards: state.cards.map((c: Card) => (c.id === card.id ? updatedCard : c)),
    });
    applyTheme(snapshot.settings.theme);
    set({ ...snapshot, error: null });

    const remaining = active.cardIds.filter((id: string) => id !== cardId);
    if (remaining.length === 0) {
      set({ activeStudy: { ...active, cardIds: [], completed: true, previousCardState: null } });
      return;
    }
    set({ activeStudy: { ...active, cardIds: remaining, currentIndex: Math.min(active.currentIndex, remaining.length - 1), revealed: false } });
  },

  async answerCurrentCard(result: ReviewRating) {
    const state = get();
    const active = state.activeStudy;
    if (!active || active.completed || !active.revealed) return;

    const cardId = active.cardIds[active.currentIndex];
    const card = state.cards.find((c: Card) => c.id === cardId);
    if (!card) return;

    const reviewedAt = new Date();
    const updatedCard = applyReview(card, result, reviewedAt);
    const reviewLog: ReviewLog = {
      id: createId("review"), cardId,
      rating: result, reviewDate: reviewedAt.toISOString(),
      stability: updatedCard.stability, difficulty: updatedCard.difficulty,
      elapsedDays: updatedCard.elapsedDays, scheduledDays: updatedCard.scheduledDays,
    };
    const nextRatings = { ...active.ratings, [result]: active.ratings[result] + 1 };
    const xpGained = REVIEW_XP[result] ?? 0;
    const isLast = active.currentIndex >= active.cardIds.length - 1;

    const nextActiveStudy: ActiveStudySession = isLast
      ? { ...active, ratings: nextRatings, completed: true, previousCardState: card, sessionXp: active.sessionXp + xpGained }
      : { ...active, currentIndex: active.currentIndex + 1, revealed: false, ratings: nextRatings, previousCardState: card, sessionXp: active.sessionXp + xpGained };

    const nextStudySessions: StudySession[] = isLast
      ? [...state.studySessions, { id: active.id, deckId: active.deckId, startedAt: active.startedAt, endedAt: reviewedAt.toISOString(), cardsStudied: active.cardIds.length }]
      : state.studySessions;

    const snapshot: RecallStateSnapshot = {
      decks: state.decks, cards: state.cards.map((c: Card) => (c.id === cardId ? updatedCard : c)),
      studySessions: nextStudySessions, reviewLogs: [...state.reviewLogs, reviewLog], settings: state.settings,
    };
    await persistReviewSnapshot(set, snapshot, { activeStudy: nextActiveStudy });
  },

  async undoLastReview() {
    const state = get();
    const active = state.activeStudy;
    if (!active || active.completed || active.currentIndex === 0 || !active.previousCardState) return;

    const previousCard = active.previousCardState;
    const cardId = previousCard.id;
    const previousIndex = active.currentIndex - 1;
    const previousCardId = active.cardIds[previousIndex];
    const previousReviewLog = state.reviewLogs.find((l: ReviewLog) => l.cardId === previousCardId);
    const ratingToDecrement = previousReviewLog?.rating ?? "good";
    const xpToDeduct = REVIEW_XP[ratingToDecrement] ?? 0;

    const nextRatings = { ...active.ratings, [ratingToDecrement]: Math.max(0, active.ratings[ratingToDecrement] - 1) };
    const nextActiveStudy: ActiveStudySession = {
      ...active, currentIndex: previousIndex, revealed: false, ratings: nextRatings, previousCardState: null,
      sessionXp: Math.max(0, active.sessionXp - xpToDeduct),
      newCardsCount: previousCard.state === "new" ? Math.max(0, active.newCardsCount - 1) : active.newCardsCount,
    };

    const snapshot: RecallStateSnapshot = {
      decks: state.decks, cards: state.cards.map((c: Card) => (c.id === cardId ? previousCard : c)),
      studySessions: state.studySessions, reviewLogs: state.reviewLogs.filter((l: ReviewLog) => l.cardId !== previousCardId),
      settings: state.settings,
    };
    await persistReviewSnapshot(set, snapshot, { activeStudy: nextActiveStudy });
  },

  exitStudy() {
    const state = get();
    const active = state.activeStudy;
    let summary: SessionSummary | null = null;

    if (active && active.completed) {
      const timeSpentMs = Date.now() - new Date(active.startedAt).getTime();
      const totalRatings = active.ratings.again + active.ratings.hard + active.ratings.good + active.ratings.easy;
      const averageRating = totalRatings > 0
        ? (active.ratings.again * 1 + active.ratings.hard * 2 + active.ratings.good * 3 + active.ratings.easy * 4) / totalRatings : 0;

      const goodAndEasy = active.ratings.good + active.ratings.easy;
      const accuracy = totalRatings > 0 ? Math.round((goodAndEasy / totalRatings) * 100) : 0;
      const newXp = state.settings.xp + active.sessionXp;
      const totalReviews = state.reviewLogs.length;
      const streak = getStudyStreak(state.reviewLogs);
      const now = new Date();
      const nowIso = now.toISOString();
      const reviewHour = now.getHours();

      const sortedLogs = [...state.reviewLogs].sort((a: ReviewLog, b: ReviewLog) => b.reviewDate.localeCompare(a.reviewDate));
      const lastLogDate = sortedLogs.length > 0 ? new Date(sortedLogs[0].reviewDate) : null;
      const daysSinceLastReview = lastLogDate
        ? Math.floor((now.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;

      const oldLevel = getLevel(state.settings.xp);
      const newLevel = getLevel(newXp);

      const newAchievementIds = checkAchievements(
        { xp: newXp, totalReviews, streak, cardsInSession: active.cardIds.length, accuracy, deckCount: state.decks.length, cardCount: state.cards.length, reviewHour, daysSinceLastReview },
        state.settings.achievements,
      );
      const updatedAchievements = applyNewAchievements(newAchievementIds, state.settings.achievements, nowIso);

      summary = {
        cardsStudied: active.cardIds.length, timeSpentMs, averageRating, newCards: active.newCardsCount,
        againCount: active.ratings.again, hardCount: active.ratings.hard, goodCount: active.ratings.good, easyCount: active.ratings.easy,
        sessionXp: active.sessionXp,
        newAchievements: newAchievementIds.map((id: string) => {
          const def = ACHIEVEMENT_DEFS[id as keyof typeof ACHIEVEMENT_DEFS];
          return { id, title: def.title, description: def.description, icon: def.icon, unlockedAt: nowIso };
        }),
      };

      if (newLevel > oldLevel) triggerLevelUpConfetti();
      if (newAchievementIds.length > 0) triggerAchievementConfetti();

      const updatedSettings = { ...state.settings, xp: newXp, achievements: updatedAchievements };
      const snapshot: RecallStateSnapshot = { decks: state.decks, cards: state.cards, studySessions: state.studySessions, reviewLogs: state.reviewLogs, settings: updatedSettings };
      void persistSnapshot(set, snapshot, { activeStudy: null, lastSessionSummary: summary });
      return;
    }

    const deckId = active?.deckId ?? state.selectedDeckId;
    set({ view: deckId ? "deck" : "dashboard", selectedDeckId: deckId, activeStudy: null, lastSessionSummary: null });
  },

  clearSessionSummary() { set({ lastSessionSummary: null }); },

  async resetData() {
    const repo = await getRepository();
    const snapshot = await repo.resetToSeedData();
    applyTheme(snapshot.settings.theme);
    set({ ...snapshot, view: "dashboard", selectedDeckId: null, activeStudy: null, error: null });
  },

  async replaceData(payload: RecallExportPayload) {
    const repo = await getRepository();
    const snapshot = await repo.replaceDataFromImport(payload);
    applyTheme(snapshot.settings.theme);
    set({ ...snapshot, view: "dashboard", selectedDeckId: null, activeStudy: null, error: null });
  },

  async mergeData(payload: RecallExportPayload) {
    const repo = await getRepository();
    const snapshot = await repo.mergeDataFromImport(dataState(get()), payload);
    applyTheme(snapshot.settings.theme);
    set({ ...snapshot, view: "dashboard", selectedDeckId: null, activeStudy: null, error: null });
  },

  exportData() { return buildExportPayload(dataState(get())); },
}));