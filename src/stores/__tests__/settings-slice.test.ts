import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock store-helpers to avoid Tauri/repository calls
vi.mock("@/stores/store-helpers", () => {
  return {
    dataState: (s: Record<string, unknown>) => ({
      decks: s.decks, cards: s.cards, studySessions: s.studySessions,
      reviewLogs: s.reviewLogs, settings: s.settings,
    }),
    getRepository: vi.fn().mockResolvedValue({
      saveSettings: vi.fn((settings: unknown) => ({ settings, decks: [], cards: [], studySessions: [], reviewLogs: [] })),
      saveSnapshot: vi.fn(),
    }),
  };
});

// Mock storage services
vi.mock("@/services/storage", () => ({
  applyTheme: vi.fn(),
  applyAccentColor: vi.fn(),
  applyDyslexiaFont: vi.fn(),
}));

vi.mock("@/services/audio", () => ({
  setMasterVolume: vi.fn(),
}));

vi.mock("@/services/fsrs-engine", () => ({
  setCustomWeights: vi.fn(),
}));

vi.mock("@/services/sync", () => ({
  performSync: vi.fn(),
}));

import { settingsSlice } from "@/stores/slices/settings.slice";
import type { RecallStateSnapshot } from "@/types";

function makeSettings(overrides: Record<string, unknown> = {}) {
  return {
    theme: "light" as const,
    accentColor: "zinc" as const,
    dyslexiaFont: false,
    seededAt: "2026-01-01T00:00:00.000Z",
    dailyNewCardLimit: 20,
    leechThreshold: 5,
    onboardingComplete: true,
    xp: 0,
    achievements: [] as string[],
    dailyGoal: 20,
    notificationsEnabled: false,
    soundVolume: 100,
    allowHtml: false,
    desiredRetention: 0.9,
    backupFolder: null,
    backupSchedule: "never" as const,
    lastBackupAt: null,
    syncFolder: null,
    syncEnabled: false,
    ttsEnabled: false,
    ttsAutoRead: false,
    ttsSpeed: 1,
    fsrsWeights: null,
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<RecallStateSnapshot> = {}): RecallStateSnapshot {
  return {
    decks: [],
    cards: [],
    studySessions: [],
    reviewLogs: [],
    settings: makeSettings() as RecallStateSnapshot["settings"],
    ...overrides,
  };
}

function createSettingsSlice() {
  let state: Record<string, unknown> = {
    ...makeSnapshot(),
  };
  const set = (partial: Record<string, unknown>) => {
    state = { ...state, ...partial };
  };
  const get = () => state as any;
  const slice = settingsSlice(set as any, get);
  return { slice, getState: () => state as any };
}

describe("settingsSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addXp", () => {
    it("adds XP to current value", () => {
      const { slice, getState } = createSettingsSlice();
      // Set initial XP
      getState().settings.xp = 100;

      slice.addXp(50);

      expect(getState().settings.xp).toBe(150);
    });

    it("handles multiple concurrent calls without race condition", () => {
      const { slice, getState } = createSettingsSlice();
      getState().settings.xp = 0;

      // Simulate rapid concurrent calls
      slice.addXp(10);
      slice.addXp(10);
      slice.addXp(10);

      // Should be 30, not 10 (which would happen with stale read)
      expect(getState().settings.xp).toBe(30);
    });

    it("handles negative delta", () => {
      const { slice, getState } = createSettingsSlice();
      getState().settings.xp = 100;

      slice.addXp(-20);

      expect(getState().settings.xp).toBe(80);
    });

    it("handles zero delta", () => {
      const { slice, getState } = createSettingsSlice();
      getState().settings.xp = 50;

      slice.addXp(0);

      expect(getState().settings.xp).toBe(50);
    });
  });

  describe("updateSettings", () => {
    it("merges partial settings into current settings", async () => {
      const { slice, getState } = createSettingsSlice();

      await slice.updateSettings({ dailyGoal: 50, soundVolume: 50 });

      expect(getState().settings.dailyGoal).toBe(50);
      expect(getState().settings.soundVolume).toBe(50);
      // Unchanged settings remain
      expect(getState().settings.theme).toBe("light");
    });

    it("preserves existing settings not in update", async () => {
      const { slice, getState } = createSettingsSlice();
      getState().settings.xp = 200;

      await slice.updateSettings({ theme: "dark" });

      expect(getState().settings.theme).toBe("dark");
      expect(getState().settings.xp).toBe(200);
    });
  });
});
