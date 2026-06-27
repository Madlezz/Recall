import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Card, Deck, RecallStateSnapshot, ReviewLog, StudySession } from "@/types";

// --- Mocks ---
const mockRepo = {
  loadAppData: vi.fn(),
  saveSnapshot: vi.fn().mockResolvedValue(undefined),
  recordReview: vi.fn().mockResolvedValue(undefined),
  resetToSeedData: vi.fn(),
  replaceDataFromImport: vi.fn(),
  mergeDataFromImport: vi.fn(),
  saveTheme: vi.fn(),
  saveSettings: vi.fn(),
  loadReviewLogs: vi.fn().mockResolvedValue([]),
  countReviewLogs: vi.fn(),
  upsertDeck: vi.fn().mockResolvedValue(undefined),
  upsertCard: vi.fn().mockResolvedValue(undefined),
  deleteDeck: vi.fn().mockResolvedValue(undefined),
  deleteCard: vi.fn().mockResolvedValue(undefined),
  deleteCards: vi.fn().mockResolvedValue(undefined),
  queryCards: vi.fn(),
};

vi.mock("@/services/repository", () => ({
  getRecallRepository: vi.fn().mockResolvedValue(mockRepo),
}));

vi.mock("@/services/storage", () => ({
  applyTheme: vi.fn(),
}));

vi.mock("@/services/import-export", () => ({
  buildExportPayload: vi.fn().mockReturnValue({ version: 1, decks: [], cards: [] }),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn().mockResolvedValue("/backup/recall-backup-2026-06-27.json"),
}));

// --- Helpers ---
function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: "deck-1",
    name: "Test Deck",
    description: "A test deck",
    color: "slate",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    deckId: "deck-1",
    front: "What is 1+1?",
    back: "2",
    hint: "",
    source: "",
    tags: [],
    cardType: "basic",
    state: "new",
    lastReviewDate: null,
    nextReviewDate: "2026-01-02T00:00:00.000Z",
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<RecallStateSnapshot> = {}): RecallStateSnapshot {
  return {
    decks: [],
    cards: [],
    studySessions: [],
    reviewLogs: [],
    settings: {
      theme: "light",
      accentColor: "zinc",
      dyslexiaFont: false,
      seededAt: "2026-01-01T00:00:00.000Z",
      dailyNewCardLimit: 20,
      leechThreshold: 5,
      onboardingComplete: true,
      xp: 0,
      achievements: [],
      dailyGoal: 20,
      notificationsEnabled: false,
      soundVolume: 100,
      allowHtml: false,
      desiredRetention: 0.9,
      backupFolder: null,
      backupSchedule: "never",
      lastBackupAt: null,
      syncFolder: null,
      syncEnabled: false,
      ttsEnabled: false,
      ttsAutoRead: false,
      ttsSpeed: 1,
      fsrsWeights: null,
    },
    ...overrides,
  };
}

const mockSet = vi.fn();

// Dynamic import to get fresh module with mocks applied
let storeHelpers: typeof import("@/stores/store-helpers");

beforeEach(async () => {
  vi.resetModules();
  // Re-mock after reset
  vi.doMock("@/services/repository", () => ({
    getRecallRepository: vi.fn().mockResolvedValue(mockRepo),
  }));
  vi.doMock("@/services/storage", () => ({
    applyTheme: vi.fn(),
  }));
  vi.doMock("@/services/import-export", () => ({
    buildExportPayload: vi.fn().mockReturnValue({ version: 1, decks: [], cards: [] }),
  }));
  vi.doMock("@tauri-apps/plugin-fs", () => ({
    writeTextFile: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock("@tauri-apps/api/path", () => ({
    join: vi.fn().mockResolvedValue("/backup/recall-backup-2026-06-27.json"),
  }));

  storeHelpers = await import("@/stores/store-helpers");
  mockSet.mockClear();
  vi.clearAllMocks();
  // Re-set default mock implementations after clearAllMocks
  mockRepo.saveSnapshot.mockResolvedValue(undefined);
  mockRepo.recordReview.mockResolvedValue(undefined);
  mockRepo.loadReviewLogs.mockResolvedValue([]);
  mockRepo.upsertDeck.mockResolvedValue(undefined);
  mockRepo.upsertCard.mockResolvedValue(undefined);
  mockRepo.deleteDeck.mockResolvedValue(undefined);
  mockRepo.deleteCard.mockResolvedValue(undefined);
  mockRepo.deleteCards.mockResolvedValue(undefined);
});

// --- Tests ---

describe("getRepository", () => {
  it("returns the repository", async () => {
    const repo = await storeHelpers.getRepository();
    expect(repo).toBe(mockRepo);
  });

  it("caches the repository on subsequent calls", async () => {
    const { getRecallRepository } = await import("@/services/repository");
    const repo1 = await storeHelpers.getRepository();
    const repo2 = await storeHelpers.getRepository();
    expect(repo1).toBe(repo2);
    expect(getRecallRepository).toHaveBeenCalledTimes(1);
  });
});

describe("loadReviewLogs", () => {
  it("calls repo.loadReviewLogs without date filter", async () => {
    const logs: ReviewLog[] = [
      { id: "log-1", cardId: "card-1", rating: "good", reviewDate: "2026-06-01", stability: 1, difficulty: 5, elapsedDays: 0, scheduledDays: 1 },
    ];
    mockRepo.loadReviewLogs.mockResolvedValue(logs);
    const result = await storeHelpers.loadReviewLogs();
    expect(mockRepo.loadReviewLogs).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(logs);
  });

  it("passes since date filter to repo", async () => {
    await storeHelpers.loadReviewLogs("2026-06-01");
    expect(mockRepo.loadReviewLogs).toHaveBeenCalledWith("2026-06-01");
  });
});

describe("persistSnapshot", () => {
  it("saves snapshot, applies theme, and calls set", async () => {
    const snapshot = makeSnapshot();
    await storeHelpers.persistSnapshot(mockSet, snapshot);

    expect(mockRepo.saveSnapshot).toHaveBeenCalledWith(snapshot);
    const { applyTheme } = await import("@/services/storage");
    expect(applyTheme).toHaveBeenCalledWith("light");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ ...snapshot, error: null }),
    );
  });

  it("merges extra fields into set call", async () => {
    const snapshot = makeSnapshot();
    await storeHelpers.persistSnapshot(mockSet, snapshot, { loading: false });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ loading: false, error: null }),
    );
  });
});

describe("persistReviewDelta", () => {
  it("records review delta via targeted repo call", async () => {
    const snapshot = makeSnapshot();
    const card = makeCard();
    const reviewLog: ReviewLog = {
      id: "log-1", cardId: "card-1", rating: "good",
      reviewDate: "2026-06-27", stability: 1, difficulty: 5,
      elapsedDays: 0, scheduledDays: 1,
    };
    const session: StudySession = {
      id: "sess-1", deckId: "deck-1", startedAt: "2026-06-27T10:00:00Z",
      endedAt: "2026-06-27T10:30:00Z", cardsStudied: 5,
    };

    await storeHelpers.persistReviewDelta(mockSet, snapshot, card, reviewLog, session);

    expect(mockRepo.recordReview).toHaveBeenCalledWith(card, reviewLog, session);
    const { applyTheme } = await import("@/services/storage");
    expect(applyTheme).toHaveBeenCalledWith("light");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ ...snapshot, error: null }),
    );
  });

  it("handles null session", async () => {
    const snapshot = makeSnapshot();
    const card = makeCard();
    const reviewLog: ReviewLog = {
      id: "log-1", cardId: "card-1", rating: "good",
      reviewDate: "2026-06-27", stability: 1, difficulty: 5,
      elapsedDays: 0, scheduledDays: 1,
    };

    await storeHelpers.persistReviewDelta(mockSet, snapshot, card, reviewLog, null);
    expect(mockRepo.recordReview).toHaveBeenCalledWith(card, reviewLog, null);
  });

  it("passes extra fields", async () => {
    const snapshot = makeSnapshot();
    const card = makeCard();
    const reviewLog: ReviewLog = {
      id: "log-1", cardId: "card-1", rating: "good",
      reviewDate: "2026-06-27", stability: 1, difficulty: 5,
      elapsedDays: 0, scheduledDays: 1,
    };

    await storeHelpers.persistReviewDelta(mockSet, snapshot, card, reviewLog, null, { reviewing: false });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ reviewing: false, error: null }),
    );
  });
});

describe("persistDeckDelta", () => {
  it("upserts deck and updates state", async () => {
    const snapshot = makeSnapshot();
    const deck = makeDeck();

    await storeHelpers.persistDeckDelta(mockSet, snapshot, deck);

    expect(mockRepo.upsertDeck).toHaveBeenCalledWith(deck);
    const { applyTheme } = await import("@/services/storage");
    expect(applyTheme).toHaveBeenCalledWith("light");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ ...snapshot, error: null }),
    );
  });

  it("passes extra fields", async () => {
    const snapshot = makeSnapshot();
    const deck = makeDeck();
    await storeHelpers.persistDeckDelta(mockSet, snapshot, deck, { editingDeck: null });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ editingDeck: null, error: null }),
    );
  });
});

describe("persistCardDelta", () => {
  it("upserts card and updates state", async () => {
    const snapshot = makeSnapshot();
    const card = makeCard();

    await storeHelpers.persistCardDelta(mockSet, snapshot, card);

    expect(mockRepo.upsertCard).toHaveBeenCalledWith(card);
    const { applyTheme } = await import("@/services/storage");
    expect(applyTheme).toHaveBeenCalledWith("light");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ ...snapshot, error: null }),
    );
  });

  it("passes extra fields", async () => {
    const snapshot = makeSnapshot();
    const card = makeCard();
    await storeHelpers.persistCardDelta(mockSet, snapshot, card, { editingCard: null });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ editingCard: null, error: null }),
    );
  });
});

describe("persistDeckDelete", () => {
  it("deletes deck and updates state", async () => {
    const snapshot = makeSnapshot();

    await storeHelpers.persistDeckDelete(mockSet, snapshot, "deck-1");

    expect(mockRepo.deleteDeck).toHaveBeenCalledWith("deck-1");
    const { applyTheme } = await import("@/services/storage");
    expect(applyTheme).toHaveBeenCalledWith("light");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ ...snapshot, error: null }),
    );
  });

  it("passes extra fields", async () => {
    const snapshot = makeSnapshot();
    await storeHelpers.persistDeckDelete(mockSet, snapshot, "deck-1", { deletingDeck: false });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ deletingDeck: false, error: null }),
    );
  });
});

describe("persistCardDelete", () => {
  it("deletes card and updates state", async () => {
    const snapshot = makeSnapshot();

    await storeHelpers.persistCardDelete(mockSet, snapshot, "card-1");

    expect(mockRepo.deleteCard).toHaveBeenCalledWith("card-1");
    const { applyTheme } = await import("@/services/storage");
    expect(applyTheme).toHaveBeenCalledWith("light");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ ...snapshot, error: null }),
    );
  });

  it("passes extra fields", async () => {
    const snapshot = makeSnapshot();
    await storeHelpers.persistCardDelete(mockSet, snapshot, "card-1", { deletingCard: false });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ deletingCard: false, error: null }),
    );
  });
});

describe("persistCardsBatchDelete", () => {
  it("deletes multiple cards and updates state", async () => {
    const snapshot = makeSnapshot();
    const cardIds = ["card-1", "card-2", "card-3"];

    await storeHelpers.persistCardsBatchDelete(mockSet, snapshot, cardIds);

    expect(mockRepo.deleteCards).toHaveBeenCalledWith(cardIds);
    const { applyTheme } = await import("@/services/storage");
    expect(applyTheme).toHaveBeenCalledWith("light");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ ...snapshot, error: null }),
    );
  });

  it("handles empty array of card IDs", async () => {
    const snapshot = makeSnapshot();
    await storeHelpers.persistCardsBatchDelete(mockSet, snapshot, []);
    expect(mockRepo.deleteCards).toHaveBeenCalledWith([]);
  });

  it("passes extra fields", async () => {
    const snapshot = makeSnapshot();
    await storeHelpers.persistCardsBatchDelete(mockSet, snapshot, ["card-1"], { batchDeleting: false });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ batchDeleting: false, error: null }),
    );
  });
});

describe("persistReviewSnapshot", () => {
  it("saves full snapshot and updates state", async () => {
    const snapshot = makeSnapshot();

    await storeHelpers.persistReviewSnapshot(mockSet, snapshot);

    expect(mockRepo.saveSnapshot).toHaveBeenCalledWith(snapshot);
    const { applyTheme } = await import("@/services/storage");
    expect(applyTheme).toHaveBeenCalledWith("light");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ ...snapshot, error: null }),
    );
  });

  it("passes extra fields", async () => {
    const snapshot = makeSnapshot();
    await storeHelpers.persistReviewSnapshot(mockSet, snapshot, { reviewing: false });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ reviewing: false, error: null }),
    );
  });
});

describe("ensureCardInput - image-occlusion", () => {
  it("allows empty back for image-occlusion cards", () => {
    // image-occlusion stores data in front as JSON, back is empty
    expect(() =>
      storeHelpers.ensureCardInput({
        front: '{"imageUrl":"test.png","occlusions":[]}',
        back: "",
        cardType: "image-occlusion",
      }),
    ).not.toThrow();
  });

  it("allows empty back for image-occlusion even with whitespace back", () => {
    expect(() =>
      storeHelpers.ensureCardInput({
        front: "some data",
        back: "  ",
        cardType: "image-occlusion",
      }),
    ).not.toThrow();
  });
});

describe("runBackupIfDue", () => {
  it("returns null when backupFolder is null", async () => {
    const state = makeSnapshot({
      settings: {
        ...makeSnapshot().settings,
        backupFolder: null,
        backupSchedule: "daily",
      },
    });
    const result = await storeHelpers.runBackupIfDue(state);
    expect(result).toBeNull();
  });

  it('returns null when backupSchedule is "never"', async () => {
    const state = makeSnapshot({
      settings: {
        ...makeSnapshot().settings,
        backupFolder: "/backups",
        backupSchedule: "never",
      },
    });
    const result = await storeHelpers.runBackupIfDue(state);
    expect(result).toBeNull();
  });

  it("returns null when daily backup is not due (last backup was today)", async () => {
    const now = new Date();
    const state = makeSnapshot({
      settings: {
        ...makeSnapshot().settings,
        backupFolder: "/backups",
        backupSchedule: "daily",
        lastBackupAt: now.toISOString(), // just backed up
      },
    });
    const result = await storeHelpers.runBackupIfDue(state);
    expect(result).toBeNull();
  });

  it("returns null when weekly backup is not due (last backup was 3 days ago)", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const state = makeSnapshot({
      settings: {
        ...makeSnapshot().settings,
        backupFolder: "/backups",
        backupSchedule: "weekly",
        lastBackupAt: threeDaysAgo.toISOString(),
      },
    });
    const result = await storeHelpers.runBackupIfDue(state);
    expect(result).toBeNull();
  });

  it("executes backup when daily schedule is due (last backup 2 days ago)", async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const state = makeSnapshot({
      settings: {
        ...makeSnapshot().settings,
        backupFolder: "/backups",
        backupSchedule: "daily",
        lastBackupAt: twoDaysAgo.toISOString(),
      },
    });

    const result = await storeHelpers.runBackupIfDue(state);

    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    expect(writeTextFile).toHaveBeenCalled();
    const { buildExportPayload } = await import("@/services/import-export");
    expect(buildExportPayload).toHaveBeenCalledWith(state);
  });

  it("executes backup when weekly schedule is due (last backup 8 days ago)", async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const state = makeSnapshot({
      settings: {
        ...makeSnapshot().settings,
        backupFolder: "/backups",
        backupSchedule: "weekly",
        lastBackupAt: eightDaysAgo.toISOString(),
      },
    });

    const result = await storeHelpers.runBackupIfDue(state);

    expect(result).not.toBeNull();
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    expect(writeTextFile).toHaveBeenCalled();
  });

  it("executes backup when lastBackupAt is null (never backed up)", async () => {
    const state = makeSnapshot({
      settings: {
        ...makeSnapshot().settings,
        backupFolder: "/backups",
        backupSchedule: "daily",
        lastBackupAt: null,
      },
    });

    const result = await storeHelpers.runBackupIfDue(state);

    expect(result).not.toBeNull();
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    expect(writeTextFile).toHaveBeenCalled();
  });

  it("returns null and silently fails when writeTextFile throws", async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const state = makeSnapshot({
      settings: {
        ...makeSnapshot().settings,
        backupFolder: "/backups",
        backupSchedule: "daily",
        lastBackupAt: twoDaysAgo.toISOString(),
      },
    });

    // Make writeTextFile throw to trigger the catch block
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    (writeTextFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Tauri not available"));

    const result = await storeHelpers.runBackupIfDue(state);

    expect(result).toBeNull();
  });

  it("writes file to joined path with correct filename pattern", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const state = makeSnapshot({
      settings: {
        ...makeSnapshot().settings,
        backupFolder: "/my/backups",
        backupSchedule: "weekly",
        lastBackupAt: tenDaysAgo.toISOString(),
      },
    });

    await storeHelpers.runBackupIfDue(state);

    const { join } = await import("@tauri-apps/api/path");
    expect(join).toHaveBeenCalledWith("/my/backups", expect.stringMatching(/^recall-backup-\d{4}-\d{2}-\d{2}\.json$/));
  });
});
