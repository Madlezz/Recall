import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const mockStore: any = {
  selectedDeckId: "d1",
  decks: [{ id: "d1", name: "Japanese", description: "Vocab", color: "zinc", createdAt: "", updatedAt: "", examDeadline: null }],
  cards: [
    { id: "c1", deckId: "d1", front: "Hello", back: "Konnichiwa", hint: "", source: "", tags: ["greeting"], cardType: "basic", state: "new", lastReviewDate: null, nextReviewDate: new Date().toISOString(), stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, createdAt: "", updatedAt: "" },
    { id: "c2", deckId: "d1", front: "Thanks", back: "Arigato", hint: "", source: "", tags: ["greeting"], cardType: "basic", state: "review", lastReviewDate: null, nextReviewDate: new Date().toISOString(), stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 1, lapses: 0, createdAt: "", updatedAt: "" },
  ],
  reviewLogs: [],
  settings: { desiredRetention: 0.9, fsrsWeights: null, ttsEnabled: false, ttsAutoRead: false, ttsSpeed: 1, allowHtml: false, soundVolume: 100, theme: "light", accentColor: "zinc", dyslexiaFont: false, xp: 0, dailyGoal: 20, dailyNewCardLimit: 20, leechThreshold: 5, onboardingComplete: true, seededAt: "", achievements: [], notificationsEnabled: false, backupFolder: null, backupSchedule: "never", lastBackupAt: null, syncFolder: null, syncEnabled: false },
  showDashboard: vi.fn(),
  deleteDeck: vi.fn(),
  deleteCards: vi.fn(),
  createCard: vi.fn(),
  startReview: vi.fn(() => true),
  resetDeckProgress: vi.fn(),
  updateSettings: vi.fn(),
};

vi.mock("@/stores/recall-store", () => ({
  useRecallStore: vi.fn((selector?: (s: any) => any) => selector ? selector(mockStore) : mockStore),
  // For BulkAddDialog's useRecallStore.getState() call
  getState: () => mockStore,
}));

// Stub child components
vi.mock("@/components/deck-detail/deck-header-section", () => ({
  DeckHeaderSection: ({ deck, onStudyNow }: any) =>
    React.createElement("div", null,
      React.createElement("span", null, deck.name),
      React.createElement("button", { onClick: onStudyNow }, "Study Now"),
    ),
}));
vi.mock("@/components/deck-detail/card-list-section", () => ({
  CardListSection: ({ filteredCards, search, setSearch, allTags, onBulkDelete, onBulkAdd }: any) =>
    React.createElement("div", null,
      React.createElement("input", { value: search, onChange: (e: any) => setSearch(e.target.value), placeholder: "Search cards" }),
      React.createElement("span", null, `${filteredCards.length} cards`),
      React.createElement("button", { onClick: onBulkDelete }, "Delete Selected"),
      React.createElement("button", { onClick: onBulkAdd }, "Bulk Add"),
      filteredCards.map((c: any) => React.createElement("div", { key: c.id }, c.front)),
    ),
}));
vi.mock("@/components/stat-tile", () => ({
  StatTile: ({ label, value }: any) =>
    React.createElement("div", null, `${label}: ${value}`),
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) =>
    React.createElement("button", { onClick, disabled, ...props }, children),
}));
vi.mock("@/components/deck-dialog", () => ({
  DeckDialog: ({ trigger }: any) => trigger ?? null,
}));
vi.mock("@/components/bulk-add-dialog", () => ({
  BulkAddDialog: () => null,
}));
vi.mock("@/components/confirm-action", () => ({
  ConfirmAction: ({ triggerLabel, onConfirm }: any) =>
    React.createElement("button", { onClick: onConfirm, "data-label": triggerLabel }, triggerLabel),
}));
vi.mock("@/components/csv-import-dialog", () => ({
  CsvImportDialog: () => null,
}));
vi.mock("@/components/custom-study-dialog", () => ({
  CustomStudyDialog: () => null,
}));
vi.mock("@/components/markdown-import-dialog", () => ({
  MarkdownImportDialog: () => null,
}));
vi.mock("@/components/recall-import-dialog", () => ({
  RecallImportDialog: () => null,
}));

// Mock services
vi.mock("@/services/import-export", () => ({
  exportDeckToJson: vi.fn(() => "{}"),
  exportDeckPackage: vi.fn().mockResolvedValue({ json: "{}", imageReport: { warnings: [] } }),
  saveRecallPackage: vi.fn().mockResolvedValue(true),
  downloadFile: vi.fn().mockResolvedValue(true),
  buildExportPayload: vi.fn(() => ({ decks: [], cards: [], settings: {}, version: "1" })),
}));
vi.mock("@/services/fsrs-optimizer", () => ({
  optimizeFromHistory: vi.fn(() => ({ success: true, suggestedRetention: 0.92, weights: [1, 2, 3] })),
  formatOptimizationResult: vi.fn(() => "retention 92%"),
}));
vi.mock("@/lib/card-quality", () => ({
  checkDeckQuality: vi.fn(() => ({ warnings: [], stats: { total: 2 } })),
}));

// Mock lib
vi.mock("@/lib/stats", () => ({
  getDeckStats: () => ({ total: 2, mastered: 1, due: 1, accuracy: 90, newCards: 1, learning: 0, review: 1 }),
}));
vi.mock("@/lib/utils", () => ({ cn: (...args: any[]) => args.filter(Boolean).join(" ") }));

const { mockToastInfo, mockToastSuccess, mockToastError, mockToastWarning } = vi.hoisted(() => ({
  mockToastInfo: vi.fn(), mockToastSuccess: vi.fn(), mockToastError: vi.fn(), mockToastWarning: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { info: mockToastInfo, error: mockToastError, success: mockToastSuccess, warning: mockToastWarning },
}));

import { DeckDetail } from "@/components/deck-detail";
import { checkDeckQuality } from "@/lib/card-quality";
import { optimizeFromHistory } from "@/services/fsrs-optimizer";

describe("DeckDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.selectedDeckId = "d1";
    mockStore.decks = [{ id: "d1", name: "Japanese", description: "Vocab", color: "zinc", createdAt: "", updatedAt: "", examDeadline: null }];
    mockStore.cards = [
      { id: "c1", deckId: "d1", front: "Hello", back: "Konnichiwa", hint: "", source: "", tags: ["greeting"], cardType: "basic", state: "new", lastReviewDate: null, nextReviewDate: new Date().toISOString(), stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, createdAt: "", updatedAt: "" },
    ];
    mockStore.startReview = vi.fn(() => true);
  });
  afterEach(() => cleanup());

  it("renders 'Deck not found' when deck doesn't exist", () => {
    mockStore.selectedDeckId = "nonexistent";
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Deck not found")).toBeTruthy();
  });

  it("renders 'Back to dashboard' button when deck not found", () => {
    mockStore.selectedDeckId = "nonexistent";
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Back to dashboard")).toBeTruthy();
  });

  it("renders deck name via header section", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Japanese")).toBeTruthy();
  });

  it("renders Dashboard back button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Dashboard")).toBeTruthy();
  });

  it("renders Edit button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Edit")).toBeTruthy();
  });

  it("renders Export JSON button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Export JSON")).toBeTruthy();
  });

  it("renders Export .recall button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Export .recall")).toBeTruthy();
  });

  it("renders Check Quality button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Check Quality")).toBeTruthy();
  });

  it("renders Optimize button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Optimize")).toBeTruthy();
  });

  it("renders Custom Study button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Custom Study")).toBeTruthy();
  });

  it("renders CSV Import button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("CSV Import")).toBeTruthy();
  });

  it("renders Reset button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Reset")).toBeTruthy();
  });

  it("renders Delete button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("renders Study Now button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Study Now")).toBeTruthy();
  });

  it("renders stat tiles (Due, New, Learning, Review)", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Due: 1")).toBeTruthy();
    expect(screen.getByText("New: 1")).toBeTruthy();
    expect(screen.getByText("Learning: 0")).toBeTruthy();
    expect(screen.getByText("Review: 1")).toBeTruthy();
  });

  it("renders card list with cards", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("renders card count", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("1 cards")).toBeTruthy();
  });

  it("renders search input", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByPlaceholderText("Search cards")).toBeTruthy();
  });

  it("renders Bulk Add button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Bulk Add")).toBeTruthy();
  });

  it("renders Delete Selected button", () => {
    render(React.createElement(DeckDetail));
    expect(screen.getByText("Delete Selected")).toBeTruthy();
  });

  it("calls startReview with deckId when Study Now clicked", () => {
    render(React.createElement(DeckDetail));
    screen.getByText("Study Now").click();
    expect(mockStore.startReview).toHaveBeenCalledWith("d1");
  });

  it("shows toast when startReview returns false (no due cards)", () => {
    mockStore.startReview = vi.fn(() => false);
    render(React.createElement(DeckDetail));
    screen.getByText("Study Now").click();
    expect(mockToastInfo).toHaveBeenCalledWith("No cards due in this deck");
  });

  it("calls deleteDeck when Delete clicked", () => {
    render(React.createElement(DeckDetail));
    screen.getByText("Delete").click();
    expect(mockStore.deleteDeck).toHaveBeenCalledWith("d1");
  });

  it("calls resetDeckProgress when Reset clicked", () => {
    render(React.createElement(DeckDetail));
    screen.getByText("Reset").click();
    expect(mockStore.resetDeckProgress).toHaveBeenCalledWith("d1");
  });

  it("calls showDashboard when Dashboard clicked", () => {
    render(React.createElement(DeckDetail));
    screen.getByText("Dashboard").click();
    expect(mockStore.showDashboard).toHaveBeenCalled();
  });

  it("calls optimizeFromHistory when Optimize clicked", () => {
    render(React.createElement(DeckDetail));
    screen.getByText("Optimize").click();
    expect(optimizeFromHistory).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it("calls updateSettings with optimization result", () => {
    render(React.createElement(DeckDetail));
    screen.getByText("Optimize").click();
    expect(mockStore.updateSettings).toHaveBeenCalledWith({
      desiredRetention: 0.92,
      fsrsWeights: [1, 2, 3],
    });
  });
});
