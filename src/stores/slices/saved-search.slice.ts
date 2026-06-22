import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedSearch {
  id: string;
  name: string;
  tags: string[];
  matchMode: "all" | "any";
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearchSlice {
  savedSearches: SavedSearch[];
  addSavedSearch: (name: string, tags: string[], matchMode: "all" | "any") => void;
  updateSavedSearch: (id: string, updates: Partial<Pick<SavedSearch, "name" | "tags" | "matchMode">>) => void;
  removeSavedSearch: (id: string) => void;
  getSavedSearchById: (id: string) => SavedSearch | undefined;
}

export const createSavedSearchSlice = (
  _set: (partial: Partial<SavedSearchSlice>) => void,
  _get: () => SavedSearchSlice,
): SavedSearchSlice => ({
  savedSearches: [],

  addSavedSearch(name, tags, matchMode) {
    const now = new Date().toISOString();
    const search: SavedSearch = {
      id: `search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      tags,
      matchMode,
      createdAt: now,
      updatedAt: now,
    };
    _set({ savedSearches: [..._get().savedSearches, search] });
  },

  updateSavedSearch(id, updates) {
    const searches = _get().savedSearches.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    _set({ savedSearches: searches });
  },

  removeSavedSearch(id) {
    _set({ savedSearches: _get().savedSearches.filter((s) => s.id !== id) });
  },

  getSavedSearchById(id) {
    return _get().savedSearches.find((s) => s.id === id);
  },
});
