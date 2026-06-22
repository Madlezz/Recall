import type { AppView } from "@/types";

export interface NavigationSlice {
  view: AppView;
  selectedDeckId: string | null;
  showDashboard: () => void;
  showSettings: () => void;
  showDeck: (deckId: string) => void;
  showStats: () => void;
  showBrowser: () => void;
  showTags: () => void;
  startMatch: (deckId: string) => void;
}

export const navigationSlice = (
  _set: (partial: Record<string, unknown>) => void,
  _get: () => Record<string, unknown>,
): NavigationSlice => ({
  view: "dashboard",
  selectedDeckId: null,

  showDashboard() {
    _set({ view: "dashboard", selectedDeckId: null, error: null });
  },

  showSettings() {
    _set({ view: "settings", error: null });
  },

  showDeck(deckId: string) {
    _set({ view: "deck", selectedDeckId: deckId, error: null });
  },

  showStats() {
    _set({ view: "stats", error: null });
  },

  showBrowser() {
    _set({ view: "browser", error: null });
  },

  showTags() {
    _set({ view: "tags", error: null });
  },

  startMatch(deckId: string) {
    _set({ view: "match", selectedDeckId: deckId });
  },
});