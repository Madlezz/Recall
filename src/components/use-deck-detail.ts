import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { useRecallStore } from "@/stores/recall-store";
import { getDeckStats } from "@/lib/stats";
import { type CardQualityWarning } from "@/lib/card-quality";
import { exportDeckToJson, downloadFile } from "@/services/import-export";

export function useDeckDetail() {
  const selectedDeckId = useRecallStore((state) => state.selectedDeckId);
  const deck = useRecallStore((state) => state.decks.find((item) => item.id === selectedDeckId));
  const cards = useRecallStore((state) => state.cards);
  const showDashboard = useRecallStore((state) => state.showDashboard);
  const deleteDeck = useRecallStore((state) => state.deleteDeck);
  const deleteCard = useRecallStore((state) => state.deleteCard);
  const startReview = useRecallStore((state) => state.startReview);
  const resetDeckProgress = useRecallStore((state) => state.resetDeckProgress);
  const startMatch = useRecallStore((state) => state.startMatch);
  const setExamDeadline = useRecallStore((state) => state.setExamDeadline);

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [qualityWarnings, setQualityWarnings] = useState<CardQualityWarning[] | null>(null);
  const [showCustomStudy, setShowCustomStudy] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [examDateInput, setExamDateInput] = useState(deck?.examDeadline?.split("T")[0] ?? "");
  const [showExamPicker, setShowExamPicker] = useState(false);

  const deckCards = useMemo(() => cards.filter((c) => c.deckId === selectedDeckId), [cards, selectedDeckId]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    deckCards.forEach((c) => c.tags.forEach((t) => tags.add(t)));
    return [...tags].sort();
  }, [deckCards]);

  const filteredCards = useMemo(() => {
    let result = deckCards;
    if (selectedTag) result = result.filter((c) => c.tags.includes(selectedTag));
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((c) =>
        [c.front, c.back, c.hint, c.tags.join(" ")].join(" ").toLowerCase().includes(query),
      );
    }
    return result;
  }, [deckCards, search, selectedTag]);

  const examDays = useMemo(() => {
    if (!deck?.examDeadline) return null;
    const now = new Date();
    const d = new Date(deck.examDeadline);
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [deck?.examDeadline]);

  const stats = deck ? getDeckStats(deck, cards) : null;
  const progress = stats ? (stats.total === 0 ? 0 : Math.round((stats.mastered / stats.total) * 100)) : 0;

  const toggleCardSelection = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedCardIds((prev) =>
      prev.size === filteredCards.length ? new Set() : new Set(filteredCards.map((c) => c.id)),
    );
  }, [filteredCards]);

  const clearSelection = useCallback(() => setSelectedCardIds(new Set()), []);

  async function handleBulkDelete() {
    if (selectedCardIds.size === 0) return;
    const count = selectedCardIds.size;
    for (const id of selectedCardIds) {
      await deleteCard(id);
    }
    setSelectedCardIds(new Set());
    toast.success(`Deleted ${count} card${count > 1 ? "s" : ""}`);
  }

  async function handleSetExamDeadline() {
    const currentDeckId = deck?.id;
    if (!currentDeckId) return;
    if (!examDateInput) {
      await setExamDeadline(currentDeckId, null);
      toast.success("Exam deadline removed");
      setShowExamPicker(false);
      return;
    }
    const deadline = new Date(examDateInput + "T23:59:59").toISOString();
    await setExamDeadline(currentDeckId, deadline);
    toast.success(`Exam set for ${examDateInput}`);
    setShowExamPicker(false);
  }

  function handleStudyNow() {
    if (!deck || !startReview(deck.id)) {
      toast.info("No cards due in this deck");
    }
  }

  function handleExport() {
    if (!deck) return;
    const json = exportDeckToJson(deck, deckCards);
    downloadFile(`${deck.name.replace(/\s+/g, "_")}.json`, json);
    toast.success("Deck exported");
  }

  return {
    deck,
    deckCards,
    allTags,
    filteredCards,
    stats,
    progress,
    examDays,
    search,
    selectedTag,
    selectedCardIds,
    qualityWarnings,
    showCustomStudy,
    showCsvImport,
    examDateInput,
    showExamPicker,
    showDashboard,
    deleteDeck,
    resetDeckProgress,
    startMatch,
    setSearch,
    setSelectedTag,
    toggleCardSelection,
    toggleSelectAll,
    clearSelection,
    handleBulkDelete,
    handleSetExamDeadline,
    handleStudyNow,
    handleExport,
    setQualityWarnings,
    setShowCustomStudy,
    setShowCsvImport,
    setExamDateInput,
    setShowExamPicker,
  };
}