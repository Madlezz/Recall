import type { RecallStateSnapshot, Theme, Deck, Card } from "@/types";
import { dataState, getRepository, type StoreSet } from "../store-helpers";
import { applyTheme } from "@/services/storage";
import { setMasterVolume } from "@/services/audio";
import { setCustomWeights } from "@/services/fsrs-engine";

export interface SettingsSlice {
  setTheme: (theme: Theme) => Promise<void>;
  updateSettings: (partial: Partial<RecallStateSnapshot["settings"]>) => Promise<void>;
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
    setMasterVolume(snapshot.settings.soundVolume / 100);
    setCustomWeights(snapshot.settings.fsrsWeights);
    set({ ...snapshot, error: null });
  },

  async updateSettings(partial: Partial<RecallStateSnapshot["settings"]>) {
    const repo = await getRepository();
    const current = dataState(get()).settings;
    const snapshot = await repo.saveSettings({ ...current, ...partial }, dataState(get()));
    applyTheme(snapshot.settings.theme);
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
    setMasterVolume(snapshot.settings.soundVolume / 100);
    setCustomWeights(snapshot.settings.fsrsWeights);
    set({ ...snapshot, view: "dashboard", error: null });
  },
});