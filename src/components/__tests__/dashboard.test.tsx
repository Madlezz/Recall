import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// Mock the store
const mockStore: any = {
  decks: [], cards: [], reviewLogs: [], studySessions: [],
  settings: { xp: 0, leechThreshold: 5, dailyGoal: 20, dailyNewCardLimit: 20, theme: "light", accentColor: "zinc", dyslexiaFont: false, soundVolume: 100, desiredRetention: 0.9, onboardingComplete: true, seededAt: "", achievements: [], notificationsEnabled: false, allowHtml: false, backupFolder: null, backupSchedule: "never", lastBackupAt: null, syncFolder: null, syncEnabled: false, syncCode: null, syncRelayUrl: null, syncLastAt: null, syncAutoInterval: 0, ttsEnabled: false, ttsAutoRead: false, ttsSpeed: 1, fsrsWeights: null, voiceInputEnabled: true },
  isLoading: false, isInitialized: true, activeStudy: null, lastSessionSummary: null,
  error: null, view: "dashboard", selectedDeckId: null, savedSearches: [],
  showDashboard: vi.fn(), showSettings: vi.fn(), showDeck: vi.fn(), showStats: vi.fn(),
  showBrowser: vi.fn(), showTags: vi.fn(), startMatch: vi.fn(), startReview: vi.fn(() => true),
  showDeckBrowser: vi.fn(),
  createDeck: vi.fn(), updateDeck: vi.fn(), deleteDeck: vi.fn(), setExamDeadline: vi.fn(),
  createCard: vi.fn(), updateCard: vi.fn(), deleteCard: vi.fn(), deleteCards: vi.fn(),
  moveCard: vi.fn(), resetDeckProgress: vi.fn(), revealAnswer: vi.fn(), buryCard: vi.fn(),
  snoozeCard: vi.fn(), answerCurrentCard: vi.fn(), undoLastReview: vi.fn(), exitStudy: vi.fn(),
  clearSessionSummary: vi.fn(), loadAllReviewLogs: vi.fn(), resetData: vi.fn(),
  replaceData: vi.fn(), mergeData: vi.fn(), exportData: vi.fn(() => ({ decks: [], cards: [], settings: {}, version: "1" })),
  startFresh: vi.fn(), startCustomStudy: vi.fn(), updateSettings: vi.fn(), addXp: vi.fn(),
  syncNow: vi.fn(), startOnboarding: vi.fn(), completeOnboarding: vi.fn(),
  addSavedSearch: vi.fn(), updateSavedSearch: vi.fn(), removeSavedSearch: vi.fn(),
  getSavedSearchById: vi.fn(), initialize: vi.fn(),
};

vi.mock("@/stores/recall-store", () => ({
  useRecallStore: vi.fn((selector?: (s: any) => any) => selector ? selector(mockStore) : mockStore),
}));

// Stub child components
vi.mock("@/components/daily-goal", () => ({ DailyGoal: () => null }));
vi.mock("@/components/deck-dialog", () => ({
  DeckDialog: ({ trigger }: any) => trigger ?? null,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) =>
    React.createElement("button", { onClick, disabled, ...props }, children),
}));
vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: { value: number }) =>
    React.createElement("div", { "data-value": value }),
}));

vi.mock("@/lib/stats", () => ({
  getDeckStats: () => ({ total: 10, mastered: 5, due: 3, accuracy: 85, newCards: 2, learning: 1, review: 3 }),
  getDeckHealth: () => ({ retention: 80, leeches: 0, overdue: 0 }),
  getStudyStreak: () => 3,
  isCardDueToday: () => true,
  getDueTodayCount: (cards: any[]) => cards.length,
  forecastDueByDay: () => [],
  getNewCardsReviewedToday: () => 0,
}));
vi.mock("@/lib/xp", () => ({
  getLevel: (xp: number) => Math.floor(xp / 100),
  getLevelTitle: (level: number) => `Level ${level}`,
  levelProgress: (xp: number) => (xp % 100) / 100,
  REVIEW_XP: { again: 0, hard: 1, good: 2, easy: 3 },
  triggerLevelUpConfetti: vi.fn(),
  triggerAchievementConfetti: vi.fn(),
}));
vi.mock("@/lib/deck-colors", () => ({ getDeckColorClass: () => "bg-zinc-400" }));
const { mockToastInfo } = vi.hoisted(() => ({ mockToastInfo: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: mockToastInfo, error: vi.fn(), success: vi.fn() } }));

import { Dashboard } from "@/components/dashboard";

function makeDeck(o: any = {}) {
  return { id: "d1", name: "Test Deck", description: "A test", color: "zinc", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...o };
}
function makeCard(o: any = {}) {
  return { id: "c1", deckId: "d1", front: "Q", back: "A", hint: "", source: "", tags: [], cardType: "basic", state: "new", lastReviewDate: null, nextReviewDate: new Date().toISOString(), stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, learningSteps: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...o };
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.decks = [makeDeck()];
    mockStore.cards = [makeCard()];
    mockStore.reviewLogs = [];
    mockStore.isLoading = false;
    mockStore.startReview = vi.fn(() => true);
  });
  afterEach(() => cleanup());

  it("renders greeting", () => {
    render(React.createElement(Dashboard));
    expect(screen.getByText(/Good/)).toBeTruthy();
  });

  it("renders empty state when no decks", () => {
    mockStore.decks = [];
    mockStore.cards = [];
    render(React.createElement(Dashboard));
    expect(screen.getByText("Your library is empty")).toBeTruthy();
  });

  it("renders loading skeletons when isLoading", () => {
    mockStore.isLoading = true;
    render(React.createElement(Dashboard));
    expect(screen.getAllByText("Your Decks").length).toBeGreaterThan(0);
  });

  it("renders deck names when decks exist", () => {
    mockStore.decks = [makeDeck({ id: "d1", name: "Japanese" }), makeDeck({ id: "d2", name: "Math" })];
    mockStore.cards = [makeCard({ deckId: "d1" }), makeCard({ deckId: "d2" })];
    render(React.createElement(Dashboard));
    expect(screen.getByText("Japanese")).toBeTruthy();
    expect(screen.getByText("Math")).toBeTruthy();
  });

  it("renders Start Review button", () => {
    render(React.createElement(Dashboard));
    const btns = screen.getAllByText("Start Review");
    expect(btns.length).toBeGreaterThan(0);
  });

  it("renders View All decks link", () => {
    render(React.createElement(Dashboard));
    expect(screen.getByText("View All")).toBeTruthy();
  });

  it("renders Create New Deck button", () => {
    render(React.createElement(Dashboard));
    expect(screen.getByText("Create a new deck")).toBeTruthy();
  });

  it("shows toast when startReview returns false", () => {
    mockToastInfo.mockClear();
    mockStore.startReview = vi.fn(() => false);
    render(React.createElement(Dashboard));
    screen.getAllByText("Start Review")[0].click();
    expect(mockToastInfo).toHaveBeenCalledWith("No cards due right now");
  });

  it("renders strek widget", () => {
    render(React.createElement(Dashboard));
    expect(screen.getByText("Streak")).toBeTruthy();
  });

  it("renders Recent Activity section when review logs exist", () => {
    mockStore.reviewLogs = [{ id: "r1", cardId: "c1", rating: "good", reviewDate: "2026-07-12", stability: 1, difficulty: 0.5, elapsedDays: 0, scheduledDays: 1 }];
    render(React.createElement(Dashboard));
    expect(screen.getByText("Recent Activity")).toBeTruthy();
  });

  it("shows create deck prompt when decks exist", () => {
    mockStore.decks = [makeDeck(), makeDeck()];
    mockStore.cards = [makeCard(), makeCard()];
    render(React.createElement(Dashboard));
    expect(screen.getByText("Create a new deck")).toBeTruthy();
  });
});