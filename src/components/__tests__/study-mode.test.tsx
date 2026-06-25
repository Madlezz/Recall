import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const mockStore: any = {
  activeStudy: null,
  lastSessionSummary: null,
  decks: [{ id: "d1", name: "Test Deck", description: "", color: "zinc", createdAt: "", updatedAt: "", examDeadline: null }],
  cards: [{ id: "c1", deckId: "d1", front: "What is 2+2?", back: "4", hint: "", source: "", tags: [], cardType: "basic", state: "new", lastReviewDate: null, nextReviewDate: new Date().toISOString(), stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, createdAt: "", updatedAt: "" }],
  settings: { ttsEnabled: false, ttsAutoRead: false, ttsSpeed: 1, allowHtml: false, desiredRetention: 0.9, soundVolume: 100, theme: "light", accentColor: "zinc", dyslexiaFont: false, xp: 0, dailyGoal: 20, dailyNewCardLimit: 20, leechThreshold: 5, onboardingComplete: true, seededAt: "", achievements: [], notificationsEnabled: false, backupFolder: null, backupSchedule: "never", lastBackupAt: null, syncFolder: null, syncEnabled: false, fsrsWeights: null },
  revealAnswer: vi.fn(),
  answerCurrentCard: vi.fn(),
  exitStudy: vi.fn(),
  buryCard: vi.fn(),
  snoozeCard: vi.fn(),
  undoLastReview: vi.fn(),
  clearSessionSummary: vi.fn(),
  showDashboard: vi.fn(),
};

vi.mock("@/stores/recall-store", () => ({
  useRecallStore: vi.fn((selector?: (s: any) => any) => selector ? selector(mockStore) : mockStore),
}));

vi.mock("@/components/RichCard", () => ({
  RichCard: ({ content }: any) => React.createElement("div", null, content),
}));
vi.mock("@/components/card-dialog", () => ({
  CardDialog: ({ trigger }: any) => trigger ?? null,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) =>
    React.createElement("button", { onClick, disabled, ...props }, children),
}));
vi.mock("@/components/study-mode/session-summary-modal", () => ({
  SessionSummaryModal: ({ onContinue }: any) =>
    React.createElement("div", null,
      React.createElement("span", null, "Session Summary"),
      React.createElement("button", { onClick: onContinue }, "Continue"),
    ),
}));
vi.mock("@/components/study-mode/study-helpers", () => ({
  AnswerButton: ({ label, keyHint, onClick }: any) =>
    React.createElement("button", { onClick, "data-key": keyHint }, label),
  CompletionStat: ({ label, value }: any) =>
    React.createElement("div", null, `${label}: ${value}`),
}));

vi.mock("@/services/tts", () => ({
  speakText: vi.fn(),
  stopSpeaking: vi.fn(),
  isTTSSupported: () => false,
  setSpeakingCallback: vi.fn(),
}));
vi.mock("@/services/audio", () => ({
  playFlipSound: vi.fn(),
  playCorrectSound: vi.fn(),
  playAgainSound: vi.fn(),
  playHardSound: vi.fn(),
  setMasterVolume: vi.fn(),
  playSessionStartSound: vi.fn(),
}));
vi.mock("@/services/fsrs-engine", () => ({
  previewIntervals: () => ({ again: "1d", hard: "3d", good: "7d", easy: "14d" }),
  applyReview: vi.fn(),
  setCustomWeights: vi.fn(),
}));
const { mockToastInfo } = vi.hoisted(() => ({ mockToastInfo: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: mockToastInfo, error: vi.fn(), success: vi.fn() } }));

import { StudyMode } from "@/components/study-mode";

function makeActiveStudy(overrides: any = {}) {
  return {
    id: "s1", deckId: "d1",
    cardIds: ["c1"], currentIndex: 0,
    revealed: false, startedAt: new Date().toISOString(),
    ratings: { again: 0, hard: 0, good: 0, easy: 0 },
    completed: false, previousCardState: null,
    newCardsCount: 1, sessionXp: 0,
    ...overrides,
  };
}

describe("StudyMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.activeStudy = null;
    mockStore.lastSessionSummary = null;
  });
  afterEach(() => cleanup());

  it("renders 'No active session' when no activeStudy", () => {
    render(React.createElement(StudyMode));
    expect(screen.getByText("No active session")).toBeTruthy();
  });

  it("renders 'Back to dashboard' button when no active study", () => {
    render(React.createElement(StudyMode));
    expect(screen.getByText("Back to dashboard")).toBeTruthy();
  });

  it("renders Session Summary modal when lastSessionSummary exists", () => {
    mockStore.lastSessionSummary = { totalCards: 5, xpEarned: 10 };
    render(React.createElement(StudyMode));
    expect(screen.getByText("Session Summary")).toBeTruthy();
  });

  it("renders 'Session complete' when activeStudy.completed", () => {
    mockStore.activeStudy = makeActiveStudy({
      completed: true,
      ratings: { again: 1, hard: 0, good: 2, easy: 0 },
    });
    render(React.createElement(StudyMode));
    expect(screen.getByText("Session complete")).toBeTruthy();
  });

  it("renders completion stats when session completed", () => {
    mockStore.activeStudy = makeActiveStudy({
      completed: true,
      ratings: { again: 1, hard: 0, good: 2, easy: 0 },
    });
    render(React.createElement(StudyMode));
    expect(screen.getByText("Cards: 3")).toBeTruthy();
    expect(screen.getByText("Again: 1")).toBeTruthy();
    expect(screen.getByText("Good: 2")).toBeTruthy();
  });

  it("renders accuracy when session completed", () => {
    mockStore.activeStudy = makeActiveStudy({
      completed: true,
      ratings: { again: 1, hard: 0, good: 2, easy: 0 },
    });
    render(React.createElement(StudyMode));
    // good+easy=2, total=3, accuracy=67%
    expect(screen.getByText("67%")).toBeTruthy();
  });

  it("renders 'Card not found' when card doesn't exist", () => {
    mockStore.activeStudy = makeActiveStudy({ cardIds: ["nonexistent"] });
    render(React.createElement(StudyMode));
    expect(screen.getByText("Card not found")).toBeTruthy();
  });

  it("renders card front content when studying", () => {
    mockStore.activeStudy = makeActiveStudy();
    render(React.createElement(StudyMode));
    expect(screen.getByText("What is 2+2?")).toBeTruthy();
  });

  it("renders Reveal button when not revealed", () => {
    mockStore.activeStudy = makeActiveStudy({ revealed: false });
    render(React.createElement(StudyMode));
    expect(screen.getByText("Reveal")).toBeTruthy();
  });

  it("renders answer buttons when revealed", () => {
    mockStore.activeStudy = makeActiveStudy({ revealed: true });
    render(React.createElement(StudyMode));
    expect(screen.getByText("Again")).toBeTruthy();
    expect(screen.getByText("Hard")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();
    expect(screen.getByText("Easy")).toBeTruthy();
  });

  it("renders Exit button", () => {
    mockStore.activeStudy = makeActiveStudy();
    render(React.createElement(StudyMode));
    expect(screen.getByText("Exit")).toBeTruthy();
  });

  it("renders Bury and Snooze buttons when not revealed", () => {
    mockStore.activeStudy = makeActiveStudy({ revealed: false });
    render(React.createElement(StudyMode));
    expect(screen.getByText("Bury")).toBeTruthy();
    expect(screen.getByText("Snooze")).toBeTruthy();
  });

  it("renders Undo button when currentIndex > 0 and not revealed", () => {
    mockStore.activeStudy = makeActiveStudy({
      currentIndex: 1, cardIds: ["c1", "c1"], revealed: false,
    });
    render(React.createElement(StudyMode));
    expect(screen.getByText("Undo")).toBeTruthy();
  });

  it("does not render Undo button at first card", () => {
    mockStore.activeStudy = makeActiveStudy({ currentIndex: 0, revealed: false });
    render(React.createElement(StudyMode));
    expect(screen.queryByText("Undo")).toBeNull();
  });

  it("renders Edit button when revealed", () => {
    mockStore.activeStudy = makeActiveStudy({ revealed: true });
    render(React.createElement(StudyMode));
    expect(screen.getByText("Edit")).toBeTruthy();
  });

  it("renders progress indicator (1 / 1)", () => {
    mockStore.activeStudy = makeActiveStudy();
    render(React.createElement(StudyMode));
    expect(screen.getByText("1 / 1")).toBeTruthy();
  });

  it("renders deck name as card label", () => {
    mockStore.activeStudy = makeActiveStudy();
    render(React.createElement(StudyMode));
    expect(screen.getByText("Test Deck")).toBeTruthy();
  });

  it("renders hint when card has hint", () => {
    mockStore.cards[0].hint = "Think addition";
    mockStore.activeStudy = makeActiveStudy();
    render(React.createElement(StudyMode));
    expect(screen.getByText(/Think addition/)).toBeTruthy();
    mockStore.cards[0].hint = "";
  });

  it("calls revealAnswer when Reveal clicked", () => {
    mockStore.activeStudy = makeActiveStudy({ revealed: false });
    render(React.createElement(StudyMode));
    screen.getByText("Reveal").click();
    expect(mockStore.revealAnswer).toHaveBeenCalled();
  });

  it("calls buryCard when Bury clicked", () => {
    mockStore.activeStudy = makeActiveStudy({ revealed: false });
    render(React.createElement(StudyMode));
    screen.getByText("Bury").click();
    expect(mockStore.buryCard).toHaveBeenCalled();
  });

  it("calls exitStudy when Exit clicked", () => {
    mockStore.activeStudy = makeActiveStudy();
    render(React.createElement(StudyMode));
    screen.getByText("Exit").click();
    expect(mockStore.exitStudy).toHaveBeenCalled();
  });

  it("calls answerCurrentCard('good') when Good clicked", () => {
    mockStore.activeStudy = makeActiveStudy({ revealed: true });
    render(React.createElement(StudyMode));
    screen.getByText("Good").click();
    expect(mockStore.answerCurrentCard).toHaveBeenCalledWith("good");
  });

  it("renders exam banner when deck has deadline <= 30 days", () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString();
    mockStore.decks[0].examDeadline = future;
    mockStore.activeStudy = makeActiveStudy();
    render(React.createElement(StudyMode));
    expect(screen.getByText(/Exam in 5 days/)).toBeTruthy();
    mockStore.decks[0].examDeadline = null;
  });

  it("renders 'Exam is today!' when deadline is today", () => {
    const today = new Date().toISOString();
    mockStore.decks[0].examDeadline = today;
    mockStore.activeStudy = makeActiveStudy();
    render(React.createElement(StudyMode));
    expect(screen.getByText(/Exam is today/)).toBeTruthy();
    mockStore.decks[0].examDeadline = null;
  });

  it("renders 'Exam tomorrow' when deadline is 1 day away", () => {
    const tomorrow = new Date(Date.now() + 1 * 86400000).toISOString();
    mockStore.decks[0].examDeadline = tomorrow;
    mockStore.activeStudy = makeActiveStudy();
    render(React.createElement(StudyMode));
    expect(screen.getByText(/Exam tomorrow/)).toBeTruthy();
    mockStore.decks[0].examDeadline = null;
  });

  it("does not render exam banner when deadline > 30 days", () => {
    const far = new Date(Date.now() + 60 * 86400000).toISOString();
    mockStore.decks[0].examDeadline = far;
    mockStore.activeStudy = makeActiveStudy();
    render(React.createElement(StudyMode));
    expect(screen.queryByText(/Exam in/)).toBeNull();
    mockStore.decks[0].examDeadline = null;
  });

  it("renders Return button when session completed", () => {
    mockStore.activeStudy = makeActiveStudy({ completed: true });
    render(React.createElement(StudyMode));
    expect(screen.getByText("Return")).toBeTruthy();
  });

  it("renders 'Press Space to reveal' screen reader text", () => {
    mockStore.activeStudy = makeActiveStudy({ revealed: false });
    render(React.createElement(StudyMode));
    expect(screen.getByText(/Press Space to reveal/)).toBeTruthy();
  });

  it("renders 'Choose your rating' screen reader text when revealed", () => {
    mockStore.activeStudy = makeActiveStudy({ revealed: true });
    render(React.createElement(StudyMode));
    expect(screen.getByText(/Choose your rating/)).toBeTruthy();
  });
});
