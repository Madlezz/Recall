import { useMemo, useState, useCallback } from "react";
import { useRecallStore } from "@/stores/recall-store";
import type { Card, Deck, CardState } from "@/types";

export type SortField = "front" | "deck" | "state" | "nextReview" | "lapses" | "created";
export type SortDir = "asc" | "desc";

export const STATE_LABELS: Record<CardState, string> = {
  new: "New",
  learning: "Learning",
  review: "Review",
  relearning: "Relearning",
};

export const STATE_COLORS: Record<CardState, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  learning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  review: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  relearning: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

export function useCardBrowser() {
  const cards = useRecallStore((s) => s.cards);
  const decks = useRecallStore((s) => s.decks);
  const deleteCard = useRecallStore((s) => s.deleteCard);
  const moveCard = useRecallStore((s) => s.moveCard);
  const updateCard = useRecallStore((s) => s.updateCard);

  // ── Filters & sort ──
  const [search, setSearch] = useState("");
  const [deckFilter, setDeckFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("nextReview");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ── Selection ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  // ── Bulk tag dialog state ──
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [bulkTagMode, setBulkTagMode] = useState<"add" | "set" | "remove">("add");
  const [showBulkTag, setShowBulkTag] = useState(false);

  const deckMap = useMemo(() => {
    const map = new Map<string, Deck>();
    for (const d of decks) map.set(d.id, d);
    return map;
  }, [decks]);

  const filtered = useMemo(() => {
    let result: Card[] = [...cards];

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (c) =>
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q) ||
          c.hint.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (deckFilter !== "all") {
      result = result.filter((c) => c.deckId === deckFilter);
    }

    if (stateFilter !== "all") {
      result = result.filter((c) => c.state === stateFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "front":
          cmp = a.front.localeCompare(b.front);
          break;
        case "deck": {
          const da = deckMap.get(a.deckId)?.name ?? "";
          const db = deckMap.get(b.deckId)?.name ?? "";
          cmp = da.localeCompare(db);
          break;
        }
        case "state":
          cmp = a.state.localeCompare(b.state);
          break;
        case "nextReview":
          cmp = a.nextReviewDate.localeCompare(b.nextReviewDate);
          break;
        case "lapses":
          cmp = a.lapses - b.lapses;
          break;
        case "created":
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [cards, search, deckFilter, stateFilter, sortField, sortDir, deckMap]);

  const toggleSelect = useCallback(
    (cardId: string, shiftKey: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastClicked) {
          const visible = filtered.map((c) => c.id);
          const start = visible.indexOf(lastClicked);
          const end = visible.indexOf(cardId);
          if (start !== -1 && end !== -1) {
            const [from, to] = start < end ? [start, end] : [end, start];
            for (let i = from; i <= to; i++) next.add(visible[i]);
          }
        } else if (next.has(cardId)) {
          next.delete(cardId);
        } else {
          next.add(cardId);
        }
        return next;
      });
      setLastClicked(cardId);
    },
    [filtered, lastClicked],
  );

  const selectAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)),
    );
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setDeckFilter("all");
    setStateFilter("all");
  }, []);

  return {
    // state
    cards,
    decks,
    deckMap,
    filtered,
    search,
    deckFilter,
    stateFilter,
    sortField,
    sortDir,
    selected,
    bulkTagInput,
    bulkTagMode,
    showBulkTag,
    // actions
    setSearch,
    setDeckFilter,
    setStateFilter,
    setSortField,
    setSortDir,
    toggleSelect,
    selectAll,
    clearSelection,
    handleSort,
    clearFilters,
    setBulkTagInput,
    setBulkTagMode,
    setShowBulkTag,
    // store actions
    deleteCard,
    moveCard,
    updateCard,
  };
}