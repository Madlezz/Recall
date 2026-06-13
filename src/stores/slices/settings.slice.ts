import type { RecallStateSnapshot, Theme } from "@/types";
import { dataState, getRepository } from "../store-helpers";
import { applyTheme } from "@/services/storage";

export interface SettingsSlice {
  setTheme: (theme: Theme) => Promise<void>;
  updateSettings: (partial: Partial<RecallStateSnapshot["settings"]>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const settingsSlice = (
  set: (partial: any) => void,
  get: () => any,
): SettingsSlice => ({
  async setTheme(theme: Theme) {
    const repo = await getRepository();
    const snapshot = await repo.saveTheme(theme, dataState(get()));
    applyTheme(snapshot.settings.theme);
    set({ ...snapshot, error: null });
  },

  async updateSettings(partial: Partial<RecallStateSnapshot["settings"]>) {
    const repo = await getRepository();
    const current = dataState(get()).settings;
    const snapshot = await repo.saveSettings({ ...current, ...partial }, dataState(get()));
    applyTheme(snapshot.settings.theme);
    set({ ...snapshot, error: null });
  },

  async completeOnboarding() {
    const repo = await getRepository();
    const snapshot = await repo.saveSettings(
      { ...dataState(get()).settings, onboardingComplete: true },
      dataState(get()),
    );
    applyTheme(snapshot.settings.theme);
    set({ ...snapshot, view: "dashboard", error: null });
  },
});