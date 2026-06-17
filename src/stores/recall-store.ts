import { create } from "zustand";
import { createSeedSnapshot } from "@/data/seed";
import { getNewCardsReviewedToday, isCardDueToday } from "@/lib/stats";
import { createId } from "@/lib/utils";
import { buildExportPayload } from "@/services/import-export";
import { getRecallRepository } from "@/services/repository";
import { applyTheme } from "@/services/storage";
import { setMasterVolume } from "@/services/audio";
import { applyReview } from "@/services/fsrs-engine";
import { playSessionStartSound } from "@/services/audio";
import {
  REVIEW_XP,
  triggerLevelUpConfetti,
  triggerAchievementConfetti,
} from "@/lib/xp";
import { sendDueReminder } from "@/services/notifications";
import { buildSessionSummary } from "@/lib/session-summary";
import type {
  ActiveStudySession,
  Card,
  Deck,
  RecallExportPayload,
  RecallStateSnapshot,
  ReviewLog,
  ReviewRating,
  SessionSummary,
  } from "@/types";
import { navigationSlice, type NavigationSlice } from "./slices/navigation.slice";
import { deckCardSlice, type DeckCardSlice, type DeckInput, type CardInput } from "./slices/deck-card.slice";
import { settingsSlice, type SettingsSlice } from "./slices/settings.slice";
import { dataState, persistSnapshot, persistReviewSnapshot, persistReviewDelta, getRepository, loadReviewLogs, runBackupIfDue } from "./store-helpers";

export interface CustomStudyConfig {
  deckId?: string | null;
  count?: number;
  tagFilter?: string;
  newOnly?: boolean;
}

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
    startCustomStudy: (config: CustomStudyConfig) => boolean;
    revealAnswer: () => void;
    buryCard: () => void;
    snoozeCard: (minutes: number) => Promise<void>;
    answerCurrentCard: (result: ReviewRating) => Promise<void>;
    undoLastReview: () => Promise<boolean>;
    exitStudy: () => Promise<void>;
    clearSessionSummary: () => void;
        loadAllReviewLogs: () => Promise<void>;
        resetData: () => Promise<void>;
        replaceData: (payload: RecallExportPayload) => Promise<void>;
        mergeData: (payload: RecallExportPayload) => Promise<void>;
        exportData: () => RecallExportPayload;
        startFresh: () => Promise<void>;
      };

export type { DeckInput, CardInput };

function daysUntilExam(deck: Deck | undefined): number | null {
  if (!deck?.examDeadline) return null;
  const now = new Date();
  const deadline = new Date(deck.examDeadline);
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Initial state ──

const initialSnapshot = createSeedSnapshot();
applyTheme(initialSnapshot.settings.theme);

// ── Store ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useRecallStore = create<RecallStore>((set: any, get: any) => ({
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
            setMasterVolume(snapshot.settings.soundVolume / 100);
            const view = snapshot.settings.onboardingComplete ? "dashboard" : "onboarding";
      set({ ...snapshot, view, isLoading: false, isInitialized: true, error: null });

            // Fire-and-forget: auto-backup if schedule says so
                        void runBackupIfDue(snapshot).then((backupAt) => {
                          if (backupAt) {
                            set({ settings: { ...snapshot.settings, lastBackupAt: backupAt } });
                          }
                        });

                  // Compute due count once for tray + notifications
                  const dueCount = snapshot.cards.filter((c: Card) => isCardDueToday(c)).length;

                  // Update tray tooltip with due count (Tauri only)
                  void (async () => {
                    try {
                      const { invoke } = await import("@tauri-apps/api/core");
                      await invoke("update_tray_tooltip", { dueCount });
                    } catch { /* not in Tauri runtime */ }
                  })();

                  // Check for app updates (Tauri only)
                  void (async () => {
                    try {
                      const { check } = await import("@tauri-apps/plugin-updater");
                      const update = await check();
                      if (update?.available) {
                        const { toast } = await import("sonner");
                        toast.info(`Recall ${update.version} is available`, {
                          action: { label: "Update", onClick: () => void update.downloadAndInstall() },
                          duration: 15000,
                        });
                      }
                    } catch { /* not in Tauri runtime */ }
                  })();

                  // Fire-and-forget: send due reminder notification if enabled
                  if (snapshot.settings.notificationsEnabled && dueCount > 0) {
                    void sendDueReminder(dueCount);
                  }
    } catch (error) {
      console.error("Failed to initialize Recall:", error);
      set({
        isLoading: false, isInitialized: true,
        error: error instanceof Error ? error.message : `Failed to load app data: ${String(error)}`,
      });
    }
  },

  // ── Study session ──

  startReview(deckId = null) {
      const state = get();
      const limit = state.settings.dailyNewCardLimit;
      const examDeck = deckId ? state.decks.find((d: Deck) => d.id === deckId) : undefined;
      const examDaysLeft = daysUntilExam(examDeck);
      const isCramMode = examDaysLeft !== null && examDaysLeft <= 3;
      const effectiveLimit = isCramMode ? Number.MAX_SAFE_INTEGER : limit;
      const dueCards = state.cards
        .filter((card: Card) => (deckId ? card.deckId === deckId : true))
        .filter((card: Card) => isCardDueToday(card))
        .sort((a: Card, b: Card) => a.nextReviewDate.localeCompare(b.nextReviewDate));
      if (dueCards.length === 0) return false;

      const newCardsReviewedToday = getNewCardsReviewedToday(state.reviewLogs);
      let newCardsAllowed = Math.max(0, effectiveLimit - newCardsReviewedToday);
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

  startCustomStudy(config: CustomStudyConfig) {
    const state = get();
    let pool = state.cards.filter((card: Card) =>
      config.deckId ? card.deckId === config.deckId : true,
    );

    if (config.tagFilter) {
      const tag = config.tagFilter.toLowerCase();
      pool = pool.filter((c: Card) => c.tags.some((t) => t.toLowerCase() === tag));
    }

    if (config.newOnly) {
      pool = pool.filter((c: Card) => c.state === "new");
    }

    if (pool.length === 0) return false;

    // Shuffle
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = config.count && config.count > 0
      ? shuffled.slice(0, config.count)
      : shuffled;

    const newCardsCount = selected.filter((c: Card) => c.state === "new").length;
    const now = new Date().toISOString();
    set({
      view: "study",
      selectedDeckId: config.deckId ?? null,
      activeStudy: {
        id: createId("session"),
        deckId: config.deckId ?? null,
        cardIds: selected.map((c: Card) => c.id),
        currentIndex: 0,
        revealed: false,
        startedAt: now,
        ratings: { again: 0, hard: 0, good: 0, easy: 0 },
        completed: false,
        previousCardState: null,
        newCardsCount,
        sessionXp: 0,
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
      const snapshot: RecallStateSnapshot = {
        ...dataState(state), cards: state.cards.map((c: Card) => (c.id === card.id ? updatedCard : c)),
      };
      await persistSnapshot(set, snapshot);

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

    const session = isLast
          ? { id: active.id, deckId: active.deckId, startedAt: active.startedAt, endedAt: reviewedAt.toISOString(), cardsStudied: active.cardIds.length }
          : null;

        const snapshot: RecallStateSnapshot = {
          decks: state.decks, cards: state.cards.map((c: Card) => (c.id === cardId ? updatedCard : c)),
          studySessions: isLast ? [...state.studySessions, session!] : state.studySessions,
          reviewLogs: [...state.reviewLogs, reviewLog], settings: state.settings,
        };
        await persistReviewDelta(set, snapshot, updatedCard, reviewLog, session, { activeStudy: nextActiveStudy });
  },

  async undoLastReview() {
      const state = get();
      const active = state.activeStudy;
      if (!active || active.completed || active.currentIndex === 0 || !active.previousCardState) return false;

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
      return true;
    },

  async exitStudy() {
      const state = get();
      const active = state.activeStudy;

      if (active && active.completed) {
        const result = buildSessionSummary(active, state.settings, state.reviewLogs, state.decks, state.cards);

        if (result.didLevelUp) triggerLevelUpConfetti();
        if (result.newAchievementIds.length > 0) triggerAchievementConfetti();

        const snapshot: RecallStateSnapshot = {
          decks: state.decks, cards: state.cards,
          studySessions: state.studySessions, reviewLogs: state.reviewLogs,
          settings: result.updatedSettings,
        };
        await persistSnapshot(set, snapshot, { activeStudy: null, lastSessionSummary: result.summary });
        return;
      }

      const deckId = active?.deckId ?? state.selectedDeckId;
      set({ view: deckId ? "deck" : "dashboard", selectedDeckId: deckId, activeStudy: null, lastSessionSummary: null });
    },

  clearSessionSummary() { set({ lastSessionSummary: null }); },

    async loadAllReviewLogs() {
      const state = get();
      const logs = await loadReviewLogs();
      // Merge: keep existing recent logs, add older ones we don't yet have
      const existingIds = new Set(state.reviewLogs.map((l: ReviewLog) => l.id));
      const newLogs = logs.filter((l) => !existingIds.has(l.id));
      if (newLogs.length > 0) {
        set({ reviewLogs: [...state.reviewLogs, ...newLogs] });
      }
    },

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