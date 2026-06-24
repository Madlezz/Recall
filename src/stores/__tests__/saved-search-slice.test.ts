import { describe, it, expect, vi } from "vitest";
import { createSavedSearchSlice, type SavedSearchSlice } from "@/stores/slices/saved-search.slice";

describe("savedSearchSlice", () => {
  function createSlice() {
    let state: SavedSearchSlice = {
      savedSearches: [],
      addSavedSearch: () => {},
      updateSavedSearch: () => {},
      removeSavedSearch: () => {},
      getSavedSearchById: () => undefined,
    };
    const set = (partial: Partial<SavedSearchSlice>) => { state = { ...state, ...partial }; };
    const get = () => state;
    const slice = createSavedSearchSlice(set, get);
    state = { ...state, ...slice };
    return { slice: state, getState: () => state };
  }

  it("starts with empty savedSearches", () => {
    const { getState } = createSlice();
    expect(getState().savedSearches).toEqual([]);
  });

  it("addSavedSearch creates a search with id, name, tags, matchMode", () => {
    const { getState } = createSlice();
    getState().addSavedSearch("My Search", ["tag1", "tag2"], "all");
    const searches = getState().savedSearches;
    expect(searches).toHaveLength(1);
    expect(searches[0].name).toBe("My Search");
    expect(searches[0].tags).toEqual(["tag1", "tag2"]);
    expect(searches[0].matchMode).toBe("all");
    expect(searches[0].id).toBeTruthy();
    expect(searches[0].createdAt).toBeTruthy();
    expect(searches[0].updatedAt).toBeTruthy();
  });

  it("addSavedSearch trims name", () => {
    const { getState } = createSlice();
    getState().addSavedSearch("  spaced  ", [], "any");
    expect(getState().savedSearches[0].name).toBe("spaced");
  });

  it("updateSavedSearch updates fields and updatedAt", () => {
    const { getState } = createSlice();
    getState().addSavedSearch("Original", ["tag1"], "all");
    const id = getState().savedSearches[0].id;
    const origUpdatedAt = getState().savedSearches[0].updatedAt;

    // Force a different timestamp
    vi.setSystemTime(new Date(Date.now() + 1000));
    getState().updateSavedSearch(id, { name: "Updated", tags: ["new"] });
    vi.useRealTimers();

    const search = getState().savedSearches[0];
    expect(search.name).toBe("Updated");
    expect(search.tags).toEqual(["new"]);
    expect(search.updatedAt).not.toBe(origUpdatedAt);
  });

  it("removeSavedSearch removes by id", () => {
    const { getState } = createSlice();
    getState().addSavedSearch("A", [], "all");
    getState().addSavedSearch("B", [], "any");
    const idA = getState().savedSearches[0].id;
    getState().removeSavedSearch(idA);
    expect(getState().savedSearches).toHaveLength(1);
    expect(getState().savedSearches[0].name).toBe("B");
  });

  it("getSavedSearchById returns matching search", () => {
    const { getState } = createSlice();
    getState().addSavedSearch("Find Me", ["x"], "all");
    const id = getState().savedSearches[0].id;
    const found = getState().getSavedSearchById(id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Find Me");
  });

  it("getSavedSearchById returns undefined for missing id", () => {
    const { getState } = createSlice();
    expect(getState().getSavedSearchById("nonexistent")).toBeUndefined();
  });
});
