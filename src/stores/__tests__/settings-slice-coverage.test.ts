import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock store-helpers to avoid Tauri/repository calls
vi.mock("@/stores/store-helpers", () => {
  return {
    dataState: (s: Record<string, unknown>) => ({
      decks: s.decks, cards: s.cards, studySessions: s.studySessions,
      reviewLogs: s.reviewLogs, settings: s.settings,
    }),
    getRepository: vi.fn().mockResolvedValue({
      saveSettings: vi.fn((settings: unknown) => ({
        settings, decks: [], cards: [], studySessions: [], reviewLogs: [],
      })),
      saveTheme: vi.fn((_theme: unknown, current: unknown) => ({
        ...(current as Record<string, unknown>),
        settings: { ...(current as any).settings, theme: _theme },
      })),
      saveSnapshot: vi.fn(),
      loadAppData: vi.fn().mockResolvedValue({
        decks: [], cards: [], studySessions: [], reviewLogs: [],
        settings: {
          theme: "light", accentColor: "zinc", dyslexiaFont: false,
          seededAt: "2026-01-01T00:00:00.000Z", dailyNewCardLimit: 20,
          leechThreshold: 5, onboardingComplete: true, xp: 0,
          achievements: [], dailyGoal: 20, notificationsEnabled: false,
          soundVolume: 100, allowHtml: false, desiredRetention: 0.9,
          backupFolder: null, backupSchedule: "never", lastBackupAt: null,
          syncFolder: null, syncEnabled: false, ttsEnabled: false,
          ttsAutoRead: false, ttsSpeed: 1, fsrsWeights: null,
        },
      }),
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

const mockPerformSync = vi.fn();
vi.mock("@/services/sync", () => ({
  performSync: (...args: unknown[]) => mockPerformSync(...args),
}));

import { settingsSlice } from "@/stores/slices/settings.slice";
import { applyTheme, applyAccentColor, applyDyslexiaFont } from "@/services/storage";
import { setMasterVolume } from "@/services/audio";
import { setCustomWeights } from "@/services/fsrs-engine";
import { getRepository } from "@/stores/store-helpers";
import type { RecallStateSnapshot, Deck, Card } from "@/types";

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
    achievements: [],
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
    settings: makeSettings() as any,
    ...overrides,
  };
}

function createSettingsSlice(overrides: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    ...makeSnapshot(),
    ...overrides,
  };
  const set = (partial: Record<string, unknown>) => {
    state = { ...state, ...partial };
  };
  const get = () => state as any;
  const slice = settingsSlice(set as any, get);
  return { slice, getState: () => state as any };
}

describe("settingsSlice coverage tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── setTheme ───────────────────────────────────────────────

  describe("setTheme", () => {
    it("saves theme via repository and applies visual settings", async () => {
      const { slice, getState } = createSettingsSlice();

      await slice.setTheme("dark");

      expect(getState().settings.theme).toBe("dark");
      expect(applyTheme).toHaveBeenCalledWith("dark");
      expect(applyAccentColor).toHaveBeenCalled();
      expect(applyDyslexiaFont).toHaveBeenCalled();
      expect(setMasterVolume).toHaveBeenCalled();
      expect(setCustomWeights).toHaveBeenCalled();
    });

    it("clears error on success", async () => {
      const { slice, getState } = createSettingsSlice({ error: "some error" });

      await slice.setTheme("light");

      expect(getState().error).toBeNull();
    });

    it("calls repo.saveTheme with the theme and current data state", async () => {
      const { slice } = createSettingsSlice();
      const repo = await getRepository();

      await slice.setTheme("dark");

      expect(repo.saveTheme).toHaveBeenCalledWith("dark", expect.objectContaining({
        settings: expect.any(Object),
      }));
    });

    it("applies sound volume as fraction of 100", async () => {
      const { slice } = createSettingsSlice();

      await slice.setTheme("light");

      expect(setMasterVolume).toHaveBeenCalledWith(1); // 100 / 100
    });
  });

  // ─── setAccentColor ─────────────────────────────────────────

  describe("setAccentColor", () => {
    it("saves accent color and applies visual settings", async () => {
      const { slice, getState } = createSettingsSlice();

      await slice.setAccentColor("blue");

      expect(getState().settings.accentColor).toBe("blue");
      expect(applyAccentColor).toHaveBeenCalledWith("blue");
    });

    it("preserves other settings when changing accent color", async () => {
      const { slice, getState } = createSettingsSlice();
      getState().settings.xp = 500;

      await slice.setAccentColor("rose");

      expect(getState().settings.xp).toBe(500);
      expect(getState().settings.accentColor).toBe("rose");
    });

    it("clears error on success", async () => {
      const { slice, getState } = createSettingsSlice({ error: "previous error" });

      await slice.setAccentColor("violet");

      expect(getState().error).toBeNull();
    });

    it("calls repo.saveSettings with merged settings", async () => {
      const { slice } = createSettingsSlice();
      const repo = await getRepository();

      await slice.setAccentColor("green");

      expect(repo.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ accentColor: "green" }),
        expect.any(Object),
      );
    });
  });

  // ─── setDyslexiaFont ────────────────────────────────────────

  describe("setDyslexiaFont", () => {
    it("enables dyslexia font", async () => {
      const { slice, getState } = createSettingsSlice();

      await slice.setDyslexiaFont(true);

      expect(getState().settings.dyslexiaFont).toBe(true);
      expect(applyDyslexiaFont).toHaveBeenCalledWith(true);
    });

    it("disables dyslexia font", async () => {
      const { slice, getState } = createSettingsSlice();
      getState().settings.dyslexiaFont = true;

      await slice.setDyslexiaFont(false);

      expect(getState().settings.dyslexiaFont).toBe(false);
      expect(applyDyslexiaFont).toHaveBeenCalledWith(false);
    });

    it("clears error on success", async () => {
      const { slice, getState } = createSettingsSlice({ error: "old error" });

      await slice.setDyslexiaFont(true);

      expect(getState().error).toBeNull();
    });

    it("applies theme and accent color alongside font", async () => {
      const { slice } = createSettingsSlice();

      await slice.setDyslexiaFont(true);

      expect(applyTheme).toHaveBeenCalled();
      expect(applyAccentColor).toHaveBeenCalled();
      expect(setMasterVolume).toHaveBeenCalled();
      expect(setCustomWeights).toHaveBeenCalled();
    });
  });

  // ─── performSync ────────────────────────────────────────────

  describe("performSync", () => {
    it("throws error when no sync folder is configured", async () => {
      const { slice } = createSettingsSlice();

      await expect(slice.performSync()).rejects.toThrow("No sync folder configured");
    });

    it("calls performSync service with state and sync folder", async () => {
      mockPerformSync.mockResolvedValue({ success: true, exported: true, imported: false });
      const state = makeSnapshot();
      state.settings.syncFolder = "/path/to/sync";
      let currentState: Record<string, unknown> = { ...state };
      const set = (partial: Record<string, unknown>) => {
        currentState = { ...currentState, ...partial };
      };
      const get = () => currentState as any;
      const s = settingsSlice(set as any, get);

      await s.performSync();

      expect(mockPerformSync).toHaveBeenCalledWith(
        expect.objectContaining({ settings: expect.objectContaining({ syncFolder: "/path/to/sync" }) }),
        "/path/to/sync",
      );
    });

    it("throws error when sync fails", async () => {
      mockPerformSync.mockResolvedValue({ success: false, exported: false, imported: false, error: "Network error" });
      const state = makeSnapshot();
      state.settings.syncFolder = "/sync/folder";
      let currentState: Record<string, unknown> = { ...state };
      const set = (partial: Record<string, unknown>) => {
        currentState = { ...currentState, ...partial };
      };
      const get = () => currentState as any;
      const s = settingsSlice(set as any, get);

      await expect(s.performSync()).rejects.toThrow("Network error");
    });

    it("throws generic error when sync fails without message", async () => {
      mockPerformSync.mockResolvedValue({ success: false, exported: false, imported: false });
      const state = makeSnapshot();
      state.settings.syncFolder = "/sync/folder";
      let currentState: Record<string, unknown> = { ...state };
      const set = (partial: Record<string, unknown>) => {
        currentState = { ...currentState, ...partial };
      };
      const get = () => currentState as any;
      const s = settingsSlice(set as any, get);

      await expect(s.performSync()).rejects.toThrow("Sync failed");
    });

    it("reloads state from repository when import happened", async () => {
      mockPerformSync.mockResolvedValue({ success: true, exported: true, imported: true });
      const state = makeSnapshot();
      state.settings.syncFolder = "/sync/folder";
      let currentState: Record<string, unknown> = { ...state };
      const set = (partial: Record<string, unknown>) => {
        currentState = { ...currentState, ...partial };
      };
      const get = () => currentState as any;
      const s = settingsSlice(set as any, get);

      const repo = await getRepository();
      (repo.loadAppData as ReturnType<typeof vi.fn>).mockResolvedValue({
        decks: [{ id: "d1", name: "Imported Deck", color: "blue", cardCount: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
        cards: [],
        studySessions: [],
        reviewLogs: [],
        settings: makeSettings(),
      });

      await s.performSync();

      expect(repo.loadAppData).toHaveBeenCalled();
      expect(currentState.error).toBeNull();
    });

    it("does not reload when imported is false", async () => {
      mockPerformSync.mockResolvedValue({ success: true, exported: true, imported: false });
      const state = makeSnapshot();
      state.settings.syncFolder = "/sync/folder";
      let currentState: Record<string, unknown> = { ...state };
      const set = (partial: Record<string, unknown>) => {
        currentState = { ...currentState, ...partial };
      };
      const get = () => currentState as any;
      const s = settingsSlice(set as any, get);

      const repo = await getRepository();

      await s.performSync();

      expect(repo.loadAppData).not.toHaveBeenCalled();
    });
  });

  // ─── updateSettings (extended) ──────────────────────────────

  describe("updateSettings (extended)", () => {
    it("applies all visual settings after update", async () => {
      const { slice } = createSettingsSlice();

      await slice.updateSettings({ theme: "dark", accentColor: "amber" });

      expect(applyTheme).toHaveBeenCalled();
      expect(applyAccentColor).toHaveBeenCalled();
      expect(applyDyslexiaFont).toHaveBeenCalled();
      expect(setMasterVolume).toHaveBeenCalled();
      expect(setCustomWeights).toHaveBeenCalled();
    });

    it("clears error on success", async () => {
      const { slice, getState } = createSettingsSlice({ error: "some error" });

      await slice.updateSettings({ dailyGoal: 30 });

      expect(getState().error).toBeNull();
    });

    it("updates leech threshold", async () => {
      const { slice, getState } = createSettingsSlice();

      await slice.updateSettings({ leechThreshold: 10 });

      expect(getState().settings.leechThreshold).toBe(10);
    });

    it("updates sound volume", async () => {
      const { slice, getState } = createSettingsSlice();

      await slice.updateSettings({ soundVolume: 50 });

      expect(getState().settings.soundVolume).toBe(50);
    });

    it("can update multiple settings at once", async () => {
      const { slice, getState } = createSettingsSlice();

      await slice.updateSettings({
        theme: "dark",
        dailyGoal: 100,
        soundVolume: 75,
        desiredRetention: 0.95,
        notificationsEnabled: true,
      });

      expect(getState().settings.theme).toBe("dark");
      expect(getState().settings.dailyGoal).toBe(100);
      expect(getState().settings.soundVolume).toBe(75);
      expect(getState().settings.desiredRetention).toBe(0.95);
      expect(getState().settings.notificationsEnabled).toBe(true);
    });
  });

  // ─── addXp (extended) ──────────────────────────────────────

  describe("addXp (extended)", () => {
    it("persists to repository after immediate update", async () => {
      const { slice, getState } = createSettingsSlice();
      getState().settings.xp = 100;
      const repo = await getRepository();

      await slice.addXp(25);

      expect(repo.saveSettings).toHaveBeenCalled();
      expect(applyTheme).toHaveBeenCalled();
      expect(applyAccentColor).toHaveBeenCalled();
      expect(applyDyslexiaFont).toHaveBeenCalled();
      expect(setMasterVolume).toHaveBeenCalled();
      expect(setCustomWeights).toHaveBeenCalled();
    });

    it("clears error after successful xp addition", async () => {
      const { slice, getState } = createSettingsSlice({ error: "old error" });

      await slice.addXp(10);

      expect(getState().error).toBeNull();
    });

    it("handles large XP values", async () => {
      const { slice, getState } = createSettingsSlice();
      getState().settings.xp = 999999;

      await slice.addXp(1);

      expect(getState().settings.xp).toBe(1000000);
    });
  });

  // ─── completeOnboarding ─────────────────────────────────────

  describe("completeOnboarding", () => {
    it("sets onboardingComplete to true", async () => {
      const { slice, getState } = createSettingsSlice();
      getState().settings.onboardingComplete = false;

      await slice.completeOnboarding();

      expect(getState().settings.onboardingComplete).toBe(true);
    });

    it("sets view to dashboard", async () => {
      const { slice, getState } = createSettingsSlice();

      await slice.completeOnboarding();

      expect(getState().view).toBe("dashboard");
    });

    it("clears error on success", async () => {
      const { slice, getState } = createSettingsSlice({ error: "onboarding error" });

      await slice.completeOnboarding();

      expect(getState().error).toBeNull();
    });

    it("applies all visual settings", async () => {
      const { slice } = createSettingsSlice();

      await slice.completeOnboarding();

      expect(applyTheme).toHaveBeenCalled();
      expect(applyAccentColor).toHaveBeenCalled();
      expect(applyDyslexiaFont).toHaveBeenCalled();
      expect(setMasterVolume).toHaveBeenCalled();
      expect(setCustomWeights).toHaveBeenCalled();
    });

    it("calls repo.saveSettings with onboardingComplete: true", async () => {
      const { slice } = createSettingsSlice();
      const repo = await getRepository();

      await slice.completeOnboarding();

      expect(repo.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ onboardingComplete: true }),
        expect.any(Object),
      );
    });
  });

  // ─── startFresh ─────────────────────────────────────────────

  describe("startFresh", () => {
    it("calls saveSnapshot with empty arrays and onboardingComplete true", async () => {
      const { slice } = createSettingsSlice();
      const repo = await getRepository();

      await slice.startFresh();

      expect(repo.saveSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          decks: [],
          cards: [],
          studySessions: [],
          reviewLogs: [],
          settings: expect.objectContaining({ onboardingComplete: true }),
        }),
      );
    });

    it("sets view to dashboard after starting fresh", async () => {
      const { slice, getState } = createSettingsSlice();

      await slice.startFresh();

      expect(getState().view).toBe("dashboard");
    });

    it("clears error on success", async () => {
      const { slice, getState } = createSettingsSlice({ error: "some error" });

      await slice.startFresh();

      expect(getState().error).toBeNull();
    });

    it("applies all visual settings from the fresh snapshot", async () => {
      const { slice } = createSettingsSlice();

      await slice.startFresh();

      expect(applyTheme).toHaveBeenCalled();
      expect(applyAccentColor).toHaveBeenCalled();
      expect(applyDyslexiaFont).toHaveBeenCalled();
      expect(setMasterVolume).toHaveBeenCalled();
      expect(setCustomWeights).toHaveBeenCalled();
    });

    it("resets decks and cards to empty arrays in state", async () => {
      const { slice, getState } = createSettingsSlice();
      getState().decks = [{ id: "1", name: "Old Deck" }];
      getState().cards = [{ id: "c1" }];

      await slice.startFresh();

      expect(getState().decks).toEqual([]);
      expect(getState().cards).toEqual([]);
    });
  });

  // ─── importTemplateDecks ──────────────────────────────────

  describe("importTemplateDecks", () => {
    const templateDecks: Deck[] = [
      { id: "td1", name: "Template Deck", description: "", color: "blue" as any, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ];
    const templateCards: Card[] = [
      { id: "tc1", deckId: "td1", front: "Q1", back: "A1", hint: "", source: "", tags: [], cardType: "basic" as any, state: "new" as any, lastReviewDate: null, nextReviewDate: "2026-01-01", stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" } as Card,
      { id: "tc2", deckId: "td1", front: "Q2", back: "A2", hint: "", source: "", tags: [], cardType: "basic" as any, state: "new" as any, lastReviewDate: null, nextReviewDate: "2026-01-01", stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" } as Card,
    ];

    it("saves settings with onboardingComplete true and template data", async () => {
      const { slice } = createSettingsSlice();
      const repo = await getRepository();

      await slice.importTemplateDecks(templateDecks, templateCards);

      expect(repo.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ onboardingComplete: true }),
        expect.objectContaining({
          decks: templateDecks,
          cards: templateCards,
          studySessions: [],
          reviewLogs: [],
        }),
      );
    });

    it("sets view to dashboard after importing templates", async () => {
      const { slice, getState } = createSettingsSlice();

      await slice.importTemplateDecks(templateDecks, templateCards);

      expect(getState().view).toBe("dashboard");
    });

    it("clears error on success", async () => {
      const { slice, getState } = createSettingsSlice({ error: "import error" });

      await slice.importTemplateDecks(templateDecks, templateCards);

      expect(getState().error).toBeNull();
    });

    it("applies all visual settings after import", async () => {
      const { slice } = createSettingsSlice();

      await slice.importTemplateDecks(templateDecks, templateCards);

      expect(applyTheme).toHaveBeenCalled();
      expect(applyAccentColor).toHaveBeenCalled();
      expect(applyDyslexiaFont).toHaveBeenCalled();
      expect(setMasterVolume).toHaveBeenCalled();
      expect(setCustomWeights).toHaveBeenCalled();
    });

    it("handles empty deck and card arrays", async () => {
      const { slice, getState } = createSettingsSlice();

      await slice.importTemplateDecks([], []);

      expect(getState().view).toBe("dashboard");
      expect(getState().error).toBeNull();
    });
  });
});