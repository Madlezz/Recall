import type { RecallStateSnapshot, Theme, Deck, Card, AccentColor } from "@/types";
import { dataState, getRepository, type StoreSet } from "../store-helpers";
import { applyTheme, applyAccentColor, applyDyslexiaFont } from "@/services/storage";
import { setMasterVolume } from "@/services/audio";
import { setCustomWeights } from "@/services/fsrs-engine";
import { performSync } from "@/services/sync";

export interface SettingsSlice {
  setTheme: (theme: Theme) => Promise<void>;
  setAccentColor: (color: AccentColor) => Promise<void>;
  setDyslexiaFont: (enabled: boolean) => Promise<void>;
  performSync: () => Promise<void>;
  updateSettings: (partial: Partial<RecallStateSnapshot["settings"]>) => Promise<void>;
  addXp: (delta: number) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  startFresh: () => Promise<void>;
  importTemplateDecks: (decks: Deck[], cards: Card[]) => Promise<void>;
}

export const settingsSlice = (
  set: StoreSet,
  get: () => RecallStateSnapshot,
): SettingsSlice => ({
  async setTheme(theme: Theme) {
    const repo = await getRepository();
    const snapshot = await repo.saveTheme(theme, dataState(get()));
    applyTheme(snapshot.settings.theme);
    applyAccentColor(snapshot.settings.accentColor);
    applyDyslexiaFont(snapshot.settings.dyslexiaFont);
    setMasterVolume(snapshot.settings.soundVolume / 100);
    setCustomWeights(snapshot.settings.fsrsWeights);
    set({ ...snapshot, error: null });
  },

  async setAccentColor(color: AccentColor) {
    const repo = await getRepository();
    const current = dataState(get()).settings;
    const snapshot = await repo.saveSettings({ ...current, accentColor: color }, dataState(get()));
    applyTheme(snapshot.settings.theme);
    applyAccentColor(snapshot.settings.accentColor);
    applyDyslexiaFont(snapshot.settings.dyslexiaFont);
    setMasterVolume(snapshot.settings.soundVolume / 100);
    setCustomWeights(snapshot.settings.fsrsWeights);
    set({ ...snapshot, error: null });
  },

  async setDyslexiaFont(enabled: boolean) {
    const repo = await getRepository();
    const current = dataState(get()).settings;
    const snapshot = await repo.saveSettings({ ...current, dyslexiaFont: enabled }, dataState(get()));
    applyTheme(snapshot.settings.theme);
    applyAccentColor(snapshot.settings.accentColor);
    applyDyslexiaFont(snapshot.settings.dyslexiaFont);
    setMasterVolume(snapshot.settings.soundVolume / 100);
    setCustomWeights(snapshot.settings.fsrsWeights);
    set({ ...snapshot, error: null });
  },

  async performSync() {
    const { settings } = dataState(get());
    if (!settings.syncFolder) {
      throw new Error("No sync folder configured");
    }
    const result = await performSync(dataState(get()), settings.syncFolder);
    if (!result.success) {
      throw new Error(result.error || "Sync failed");
    }
    if (result.imported) {
      // Reload state from repository since mergeImportPayload returns a new snapshot
      const repo = await getRepository();
      const snapshot = await repo.loadAppData();
      set({ ...snapshot, error: null });
    }
  },

  async updateSettings(partial: Partial<RecallStateSnapshot["settings"]>) {
    const repo = await getRepository();
    const current = dataState(get()).settings;
    const snapshot = await repo.saveSettings({ ...current, ...partial }, dataState(get()));
    applyTheme(snapshot.settings.theme);
    applyAccentColor(snapshot.settings.accentColor);
    applyDyslexiaFont(snapshot.settings.dyslexiaFont);
    setMasterVolume(snapshot.settings.soundVolume / 100);
    setCustomWeights(snapshot.settings.fsrsWeights);
    set({ ...snapshot, error: null });
  },

  async addXp(delta: number) {
    const repo = await getRepository();
    const current = dataState(get()).settings;
    const snapshot = await repo.saveSettings({ ...current, xp: current.xp + delta }, dataState(get()));
    applyTheme(snapshot.settings.theme);
    applyAccentColor(snapshot.settings.accentColor);
    applyDyslexiaFont(snapshot.settings.dyslexiaFont);
    setMasterVolume(snapshot.settings.soundVolume / 100);
    setCustomWeights(snapshot.settings.fsrsWeights);
    set({ ...snapshot, error: null });
  },

  async completeOnboarding() {
    const repo = await getRepository();
    const snapshot = await repo.saveSettings(
      { ...dataState(get()).settings, onboardingComplete: true },
      dataState(get()),
    );
    applyTheme(snapshot.settings.theme);
    applyAccentColor(snapshot.settings.accentColor);
    applyDyslexiaFont(snapshot.settings.dyslexiaFont);
    setMasterVolume(snapshot.settings.soundVolume / 100);
    setCustomWeights(snapshot.settings.fsrsWeights);
    set({ ...snapshot, view: "dashboard", error: null });
  },

  async startFresh() {
    const repo = await getRepository();
    const settings = { ...dataState(get()).settings, onboardingComplete: true };
    const snapshot = await repo.saveSettings(settings, {
      decks: [],
      cards: [],
      studySessions: [],
      reviewLogs: [],
      settings,
    });
    applyTheme(snapshot.settings.theme);
    applyAccentColor(snapshot.settings.accentColor);
    applyDyslexiaFont(snapshot.settings.dyslexiaFont);
    setMasterVolume(snapshot.settings.soundVolume / 100);
    setCustomWeights(snapshot.settings.fsrsWeights);
    set({ ...snapshot, view: "dashboard", error: null });
  },

  async importTemplateDecks(decks: Deck[], cards: Card[]) {
    const repo = await getRepository();
    const settings = { ...dataState(get()).settings, onboardingComplete: true };
    const snapshot = await repo.saveSettings(settings, {
      decks,
      cards,
      studySessions: [],
      reviewLogs: [],
      settings,
    });
    applyTheme(snapshot.settings.theme);
    applyAccentColor(snapshot.settings.accentColor);
    applyDyslexiaFont(snapshot.settings.dyslexiaFont);
    setMasterVolume(snapshot.settings.soundVolume / 100);
    setCustomWeights(snapshot.settings.fsrsWeights);
    set({ ...snapshot, view: "dashboard", error: null });
  },
});