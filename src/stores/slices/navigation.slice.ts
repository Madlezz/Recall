import type { AppView } from "@/types";

export interface NavigationSlice {
  view: AppView;
  selectedDeckId: string | null;
  showDashboard: () => void;
  showSettings: () => void;
  showDeck: (deckId: string) => void;
  showStats: () => void;
  startMatch: (deckId: string) => void;
}

export const navigationSlice = (
  _set: (partial: any) => void,
  _get: () => any,
): NavigationSlice => ({
  view: "dashboard",
  selectedDeckId: null,

  showDashboard() {
    _set({ view: "dashboard", selectedDeckId: null, activeStudy: null });
  },
  showSettings() {
    _set({ view: "settings", selectedDeckId: null, activeStudy: null });
  },
  showStats() {
    _set({ view: "stats", selectedDeckId: null, activeStudy: null });
  },
  showDeck(deckId: string) {
    _set({ view: "deck", selectedDeckId: deckId, activeStudy: null });
  },
  startMatch(deckId: string) {
    _set({ view: "match", selectedDeckId: deckId, activeStudy: null });
  },
});