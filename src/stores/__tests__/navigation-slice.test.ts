import { describe, it, expect } from "vitest";
import { navigationSlice } from "@/stores/slices/navigation.slice";

describe("navigationSlice", () => {
  function createNav() {
    let state: Record<string, unknown> = {};
    const set = (partial: Record<string, unknown>) => { state = { ...state, ...partial }; };
    const get = () => state;
    const nav = navigationSlice(set, get);
    return { nav, getState: () => state };
  }

  it("starts on dashboard with no selected deck", () => {
    const { nav } = createNav();
    expect(nav.view).toBe("dashboard");
    expect(nav.selectedDeckId).toBeNull();
  });

  it("showDashboard resets view and selectedDeckId", () => {
    const { nav, getState } = createNav();
    nav.showDeck("deck-1");
    nav.showDashboard();
    expect(getState().view).toBe("dashboard");
    expect(getState().selectedDeckId).toBeNull();
    expect(getState().error).toBeNull();
  });

  it("showSettings sets view to settings", () => {
    const { nav, getState } = createNav();
    nav.showSettings();
    expect(getState().view).toBe("settings");
    expect(getState().error).toBeNull();
  });

  it("showDeck sets view to deck with selectedDeckId", () => {
    const { nav, getState } = createNav();
    nav.showDeck("deck-42");
    expect(getState().view).toBe("deck");
    expect(getState().selectedDeckId).toBe("deck-42");
    expect(getState().error).toBeNull();
  });

  it("showStats sets view to stats", () => {
    const { nav, getState } = createNav();
    nav.showStats();
    expect(getState().view).toBe("stats");
  });

  it("showBrowser sets view to browser", () => {
    const { nav, getState } = createNav();
    nav.showBrowser();
    expect(getState().view).toBe("browser");
  });

  it("showTags sets view to tags", () => {
    const { nav, getState } = createNav();
    nav.showTags();
    expect(getState().view).toBe("tags");
  });

  it("startMatch sets view to match with deckId", () => {
    const { nav, getState } = createNav();
    nav.startMatch("deck-match");
    expect(getState().view).toBe("match");
    expect(getState().selectedDeckId).toBe("deck-match");
  });
});
