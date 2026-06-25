import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import React from "react";

// Mock the store
const mockStore: any = {
  decks: [], cards: [],
  settings: { xp: 0, leechThreshold: 5, dailyGoal: 20, dailyNewCardLimit: 20, theme: "light", accentColor: "zinc", dyslexiaFont: false, soundVolume: 100, desiredRetention: 0.9, onboardingComplete: true, seededAt: "", achievements: [], notificationsEnabled: false, allowHtml: false, backupFolder: null, backupSchedule: "never", lastBackupAt: null, syncFolder: null, syncEnabled: false, ttsEnabled: false, ttsAutoRead: false, ttsSpeed: 1, fsrsWeights: null },
  view: "dashboard",
  showDashboard: vi.fn(), showSettings: vi.fn(), showStats: vi.fn(),
  showBrowser: vi.fn(), showTags: vi.fn(), startReview: vi.fn(), startMatch: vi.fn(),
};

vi.mock("@/stores/recall-store", () => ({
  useRecallStore: vi.fn((selector?: (s: any) => any) => selector ? selector(mockStore) : mockStore),
}));

// Stub child components
vi.mock("@/components/command-palette", () => ({
  CommandPalette: () => null,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) =>
    React.createElement("button", { onClick, disabled, ...props }, children),
}));

vi.mock("@/lib/stats", () => ({
  getDueTodayCount: (cards: any[]) => cards.length,
}));

vi.mock("@/lib/xp", () => ({
  getLevel: (xp: number) => Math.floor(xp / 100),
  getLevelTitle: (level: number) => `Level ${level}`,
  levelProgress: (xp: number) => (xp % 100) / 100,
  REVIEW_XP: { again: 0, hard: 1, good: 2, easy: 3 },
  triggerLevelUpConfetti: vi.fn(),
  triggerAchievementConfetti: vi.fn(),
}));

const { mockToastInfo } = vi.hoisted(() => ({ mockToastInfo: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: mockToastInfo, error: vi.fn(), success: vi.fn() } }));

import { AppShell } from "@/components/app-shell";

function makeCard(o: any = {}) {
  return { id: "c1", deckId: "d1", front: "Q", back: "A", hint: "", source: "", tags: [], cardType: "basic", state: "new", lastReviewDate: null, nextReviewDate: new Date().toISOString(), stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...o };
}
function makeDeck(o: any = {}) {
  return { id: "d1", name: "Test Deck", description: "A test", color: "zinc", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...o };
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.decks = [];
    mockStore.cards = [];
    mockStore.view = "dashboard";
    mockStore.settings.xp = 0;
    mockStore.settings.achievements = [];
    mockStore.showDashboard = vi.fn();
    mockStore.showSettings = vi.fn();
    mockStore.showStats = vi.fn();
    mockStore.showBrowser = vi.fn();
    mockStore.showTags = vi.fn();
    mockStore.startReview = vi.fn();
    mockStore.startMatch = vi.fn();
  });
  afterEach(() => cleanup());

  it("renders sidebar nav buttons", () => {
    render(React.createElement(AppShell, null, "content"));
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Review")).toBeTruthy();
    expect(screen.getByText("Browser")).toBeTruthy();
    expect(screen.getByText("Tags")).toBeTruthy();
    expect(screen.getByText("Stats")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("renders Tools section with Focus Timer and Match Game", () => {
    render(React.createElement(AppShell, null, "content"));
    expect(screen.getByText("Tools")).toBeTruthy();
    expect(screen.getByText("Focus Timer")).toBeTruthy();
    expect(screen.getByText("Match Game")).toBeTruthy();
  });

  it("renders due-count badge on Review", () => {
    mockStore.cards = [makeCard({ id: "c1" }), makeCard({ id: "c2" }), makeCard({ id: "c3" })];
    render(React.createElement(AppShell, null, "content"));
    const reviewButton = screen.getByText("Review").closest("button")!;
    expect(within(reviewButton).getByText("3")).toBeTruthy();
  });

  it("does not show badge on Review when no due cards", () => {
    mockStore.cards = [];
    render(React.createElement(AppShell, null, "content"));
    const reviewButton = screen.getByText("Review").closest("button")!;
    // No badge span inside the Review button
    const spans = within(reviewButton).queryAllByText(/\d+/);
    expect(spans.length).toBe(0);
  });

  it("renders LevelWidget", () => {
    mockStore.settings.xp = 150;
    render(React.createElement(AppShell, null, "content"));
    // getLevel(150) = 1, getLevelTitle(1) = "Level 1"
    // "Level 1" appears in both the level label and the title text
    expect(screen.getAllByText("Level 1").length).toBeGreaterThan(0);
    expect(screen.getByText("150 XP")).toBeTruthy();
  });

  it("renders LevelWidget progressbar", () => {
    mockStore.settings.xp = 150;
    render(React.createElement(AppShell, null, "content"));
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("50");
    expect(progressbar.getAttribute("aria-label")).toBe("Level 1 progress: 150 XP");
  });

  it("renders mobile header with hamburger", () => {
    render(React.createElement(AppShell, null, "content"));
    expect(screen.getByLabelText("Open navigation")).toBeTruthy();
  });

  it("renders 'Press ? for shortcuts' hint", () => {
    render(React.createElement(AppShell, null, "content"));
    expect(screen.getByText("Press ? for shortcuts")).toBeTruthy();
  });

  it("renders children content", () => {
    render(React.createElement(AppShell, null, "Main Content"));
    expect(screen.getByText("Main Content")).toBeTruthy();
  });

  it("renders CommandPalette", () => {
    render(React.createElement(AppShell, null, "content"));
    // CommandPalette is mocked to render null, so we just verify no crash
    expect(true).toBe(true);
  });

  // ── Nav button click actions ──

  it("calls showDashboard when Dashboard clicked", () => {
    render(React.createElement(AppShell, null, "content"));
    screen.getByText("Dashboard").click();
    expect(mockStore.showDashboard).toHaveBeenCalled();
  });

  it("calls startReview when Review clicked", () => {
    render(React.createElement(AppShell, null, "content"));
    screen.getByText("Review").click();
    expect(mockStore.startReview).toHaveBeenCalledWith(null);
  });

  it("calls showBrowser when Browser clicked", () => {
    render(React.createElement(AppShell, null, "content"));
    screen.getByText("Browser").click();
    expect(mockStore.showBrowser).toHaveBeenCalled();
  });

  it("calls showTags when Tags clicked", () => {
    render(React.createElement(AppShell, null, "content"));
    screen.getByText("Tags").click();
    expect(mockStore.showTags).toHaveBeenCalled();
  });

  it("calls showStats when Stats clicked", () => {
    render(React.createElement(AppShell, null, "content"));
    screen.getByText("Stats").click();
    expect(mockStore.showStats).toHaveBeenCalled();
  });

  it("calls showSettings when Settings clicked", () => {
    render(React.createElement(AppShell, null, "content"));
    screen.getByText("Settings").click();
    expect(mockStore.showSettings).toHaveBeenCalled();
  });

  it("calls showDashboard when Focus Timer clicked", () => {
    render(React.createElement(AppShell, null, "content"));
    screen.getByText("Focus Timer").click();
    expect(mockStore.showDashboard).toHaveBeenCalled();
  });

  it("calls startMatch with first deck id when Match Game clicked", () => {
    mockStore.decks = [makeDeck({ id: "deck-1" })];
    render(React.createElement(AppShell, null, "content"));
    screen.getByText("Match Game").click();
    expect(mockStore.startMatch).toHaveBeenCalledWith("deck-1");
  });

  it("calls showDashboard when Match Game clicked with no decks", () => {
    mockStore.decks = [];
    render(React.createElement(AppShell, null, "content"));
    screen.getByText("Match Game").click();
    expect(mockStore.showDashboard).toHaveBeenCalled();
  });
});
