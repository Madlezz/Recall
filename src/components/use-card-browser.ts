import { useMemo, useState, useCallback, useEffect } from "react";
import { useRecallStore } from "@/stores/recall-store";
import type { Card, Deck, CardState } from "@/types";
import { isTauriRuntime } from "@/db/client";
import { getRecallRepository } from "@/services/repository";

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

const PAGE_SIZE = 50;

// Map UI sort fields to DB column names
const SORT_FIELD_MAP: Record<SortField, string> = {
  front: "front",
  deck: "deck_id",
  state: "state",
  nextReview: "next_review_date",
  lapses: "lapses",
  created: "created_at",
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
  const [page, setPage] = useState(0);

  // ── DB-side query state (Tauri mode) ──
  const [dbCards, setDbCards] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

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

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, deckFilter, stateFilter, sortField, sortDir]);

  // DB-side query (Tauri mode)
  useEffect(() => {
    if (!isTauriRuntime()) return;

    let cancelled = false;
    setLoading(true);

    const fetchCards = async () => {
      try {
        const repo = await getRecallRepository();
        const result = await repo.queryCards({
          deckId: deckFilter !== "all" ? deckFilter : undefined,
          state: stateFilter !== "all" ? stateFilter : undefined,
          search: search.trim() || undefined,
          sortField: SORT_FIELD_MAP[sortField],
          sortDir,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });

        if (!cancelled) {
          setDbCards(result.cards);
          setTotalCount(result.total);
        }
      } catch (error) {
        console.error("Failed to query cards:", error);
        if (!cancelled) {
          setDbCards([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCards();
    return () => { cancelled = true; };
  }, [search, deckFilter, stateFilter, sortField, sortDir, page]);

  // JS-side filtering (LocalStorage fallback)
  const filtered = useMemo(() => {
    if (isTauriRuntime()) return dbCards;

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
  }, [cards, dbCards, search, deckFilter, stateFilter, sortField, sortDir, deckMap]);

  const total = isTauriRuntime() ? totalCount : filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);

  // For Tauri mode, cards are already paginated from DB
  // For LocalStorage mode, paginate in JS
  const paginatedCards = isTauriRuntime() ? filtered : filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const toggleSelect = useCallback(
    (cardId: string, shiftKey: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastClicked) {
          const visible = paginatedCards.map((c) => c.id);
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
    [paginatedCards, lastClicked],
  );

  const selectAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === paginatedCards.length ? new Set() : new Set(paginatedCards.map((c) => c.id)),
    );
  }, [paginatedCards]);

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
    filtered: paginatedCards,
    totalCount: total,
    totalPages,
    currentPage,
    loading,
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
    setPage,
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
