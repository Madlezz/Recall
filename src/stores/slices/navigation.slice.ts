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
): NavigationSlice => {
  // Auto-call exitStudy when navigating away from a completed study session
  // to prevent XP/achievement loss (exitStudy awards XP only if called)
  function autoExitStudy(): void {
    const state = _get() as { view?: string; activeStudy?: { completed?: boolean } | null; exitStudy?: () => Promise<void> };
    if (state.view === "study" && state.activeStudy?.completed && state.exitStudy) {
      void state.exitStudy();
    }
  }

  return {
  view: "dashboard",
  selectedDeckId: null,

  showDashboard() {
    autoExitStudy();
    _set({ view: "dashboard", selectedDeckId: null, error: null });
  },

  showSettings() {
    autoExitStudy();
    _set({ view: "settings", error: null });
  },

  showDeck(deckId: string) {
    autoExitStudy();
    _set({ view: "deck", selectedDeckId: deckId, error: null });
  },

  showStats() {
    autoExitStudy();
    _set({ view: "stats", error: null });
  },

  showBrowser() {
    autoExitStudy();
    _set({ view: "browser", error: null });
  },

  showTags() {
    autoExitStudy();
    _set({ view: "tags", error: null });
  },

  startMatch(deckId: string) {
    autoExitStudy();
    _set({ view: "match", selectedDeckId: deckId });
  },
  };
};