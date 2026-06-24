import {
  ArrowLeft,
  Beaker,
  BookOpen,
  Brain,
  Download,
  Edit3,
  FileSpreadsheet,
  PackageOpen,
  Play,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/stat-tile";
import { BulkAddDialog } from "@/components/bulk-add-dialog";
import { ConfirmAction } from "@/components/confirm-action";
import { CsvImportDialog } from "@/components/csv-import-dialog";
import { CustomStudyDialog } from "@/components/custom-study-dialog";
import { DeckDialog } from "@/components/deck-dialog";
import { MarkdownImportDialog } from "@/components/markdown-import-dialog";
import { RecallImportDialog } from "@/components/recall-import-dialog";
import { cn } from "@/lib/utils";
import { getDeckStats } from "@/lib/stats";
import { checkDeckQuality, type CardQualityWarning } from "@/lib/card-quality";
import { useRecallStore } from "@/stores/recall-store";
import { optimizeFromHistory, formatOptimizationResult } from "@/services/fsrs-optimizer";
import {
  exportDeckToJson,
  exportDeckPackage,
  saveRecallPackage,
  downloadFile,
} from "@/services/import-export";
import { DeckHeaderSection } from "./deck-detail/deck-header-section";
import { CardListSection } from "./deck-detail/card-list-section";

export function DeckDetail(): JSX.Element {
  const selectedDeckId = useRecallStore((s) => s.selectedDeckId);
  const deck = useRecallStore((s) => s.decks.find((d) => d.id === selectedDeckId));
  const cards = useRecallStore((s) => s.cards);
  const reviewLogs = useRecallStore((s) => s.reviewLogs);
  const settings = useRecallStore((s) => s.settings);
  const updateSettings = useRecallStore((s) => s.updateSettings);
  const showDashboard = useRecallStore((s) => s.showDashboard);
  const deleteDeck = useRecallStore((s) => s.deleteDeck);
  const deleteCards = useRecallStore((s) => s.deleteCards);
  const createCard = useRecallStore((s) => s.createCard);
  const startReview = useRecallStore((s) => s.startReview);
  const resetDeckProgress = useRecallStore((s) => s.resetDeckProgress);

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [showCustomStudy, setShowCustomStudy] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [qualityWarnings, setQualityWarnings] = useState<CardQualityWarning[] | null>(null);

  const deckCards = useMemo(
    () => cards.filter((card) => card.deckId === selectedDeckId),
    [cards, selectedDeckId],
  );

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    deckCards.forEach((card) => card.tags.forEach((tag) => tags.add(tag)));
    return [...tags].sort();
  }, [deckCards]);

  const filteredCards = useMemo(() => {
    let result = deckCards;
    if (selectedTag) {
      result = result.filter((card) => card.tags.includes(selectedTag));
    }
    const query = search.trim().toLowerCase();
    if (!query) return result;
    return result.filter((card) =>
      [card.front, card.back, card.hint, card.tags.join(" ")].join(" ").toLowerCase().includes(query),
    );
  }, [deckCards, search, selectedTag]);

  if (!deck) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <h1 className="font-semibold">Deck not found</h1>
        <Button className="mt-4" onClick={showDashboard}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const d = deck;
  const currentDeckId = deck.id;
  const stats = getDeckStats(deck, cards);

  function handleStudyNow(): void {
    if (!startReview(currentDeckId)) {
      toast.info("No cards due in this deck");
    }
  }

  async function handleExport(): Promise<void> {
    const json = exportDeckToJson(d, deckCards);
    const ok = await downloadFile(`${d.name.replace(/\s+/g, "_")}.json`, json);
    if (ok) toast.success("Deck exported");
  }

  async function handleExportRecall(): Promise<void> {
    try {
      const { json, imageReport } = await exportDeckPackage(d, deckCards);
      const saved = await saveRecallPackage(json, d.name);
      if (saved) {
        if (imageReport.warnings.length > 0) {
          toast.warning(`Deck exported as .recall package (${imageReport.warnings[0]})`);
        } else {
          toast.success("Deck exported as .recall package");
        }
      }
    } catch {
      toast.error("Could not export .recall package");
    }
  }

  function toggleCardSelection(cardId: string): void {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function toggleSelectAll(): void {
    setSelectedCardIds((prev) => {
      if (prev.size === filteredCards.length) return new Set();
      return new Set(filteredCards.map((c) => c.id));
    });
  }

  async function handleBulkDelete(): Promise<void> {
    if (selectedCardIds.size === 0) return;
    const count = selectedCardIds.size;
    await deleteCards(Array.from(selectedCardIds));
    setSelectedCardIds(new Set());
    toast.success(`Deleted ${count} card${count > 1 ? "s" : ""}`);
  }

  function handleOptimizeDeck(): void {
    if (!currentDeckId) return;
    const result = optimizeFromHistory(reviewLogs, cards, settings.desiredRetention, currentDeckId);
    if (result.success) {
      void updateSettings({
        desiredRetention: result.suggestedRetention,
        fsrsWeights: result.weights,
      });
      toast.success(`Optimized for ${d.name}: ${formatOptimizationResult(result)}`);
    } else {
      toast.error(`Optimize ${d.name}: ${formatOptimizationResult(result)}`);
    }
  }

  return (
    <div className="animate-fade-in space-y-7">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={showDashboard} aria-label="Back to dashboard">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Button>
        <div className="flex flex-wrap gap-2">
          <DeckDialog
            deck={deck}
            trigger={
              <Button variant="outline">
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            }
          />
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => void handleExportRecall()}>
            <PackageOpen className="h-4 w-4" aria-hidden="true" />
            Export .recall
          </Button>
          <Button
            variant="outline"
            onClick={() => setQualityWarnings(checkDeckQuality(deckCards).warnings)}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Check Quality
          </Button>
          <Button
            variant="outline"
            onClick={handleOptimizeDeck}
            title="Optimize FSRS spacing for this deck based on review history"
          >
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            Optimize
          </Button>
          <Button variant="outline" onClick={() => setShowCustomStudy(true)}>
            <Beaker className="h-4 w-4" aria-hidden="true" />
            Custom Study
          </Button>
          <Button variant="outline" onClick={() => setShowCsvImport(true)}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            CSV Import
          </Button>
          <MarkdownImportDialog deckId={currentDeckId} />
          <RecallImportDialog deckId={currentDeckId} />
          <ConfirmAction
            title="Reset progress?"
            description="This resets all cards in this deck back to 'new' state. Card content is kept, but all review history and scheduling data is cleared."
            actionLabel="Reset progress"
            triggerLabel="Reset"
            onConfirm={async () => {
              try {
                await resetDeckProgress(currentDeckId);
                toast.success("Deck progress reset");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not reset deck progress");
              }
            }}
          />
          <ConfirmAction
            title="Delete deck?"
            description="This permanently deletes the deck and all cards inside it."
            actionLabel="Delete deck"
            triggerLabel="Delete"
            destructive
            onConfirm={async () => {
              try {
                await deleteDeck(currentDeckId);
                toast.success("Deck deleted");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not delete deck");
              }
            }}
          />
        </div>
      </div>

      {/* Deck header */}
      <DeckHeaderSection deck={deck} deckCards={deckCards} onStudyNow={handleStudyNow} />

      {/* Stat tiles */}
      <section className="grid gap-3 sm:grid-cols-4">
        <StatTile icon={Play} label="Due" value={String(stats.due)} />
        <StatTile icon={BookOpen} label="New" value={String(stats.newCards)} />
        <StatTile icon={Brain} label="Learning" value={String(stats.learning)} />
        <StatTile icon={RefreshCw} label="Review" value={String(stats.review)} />
      </section>

      {/* Quality warnings */}
      {qualityWarnings !== null && (
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {qualityWarnings.length === 0 ? (
                <span className="text-green-400">✅ All {deckCards.length} cards look great!</span>
              ) : (
                <span className="text-amber-400">
                  ⚠️ {qualityWarnings.length} issue{qualityWarnings.length > 1 ? "s" : ""} found
                </span>
              )}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setQualityWarnings(null)}>
              Dismiss
            </Button>
          </div>
          {qualityWarnings.map((warning) => (
            <div
              key={`${warning.cardId}-${warning.severity}`}
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                warning.severity === "high"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : warning.severity === "medium"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20",
              )}
            >
              <span className="font-medium">&quot;{warning.front}&quot;</span> — {warning.message}
            </div>
          ))}
        </section>
      )}

      {/* Card list */}
      <CardListSection
        deckId={currentDeckId}
        filteredCards={filteredCards}
        deckCards={deckCards}
        search={search}
        setSearch={setSearch}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        allTags={allTags}
        selectedCardIds={selectedCardIds}
        toggleCardSelection={toggleCardSelection}
        toggleSelectAll={toggleSelectAll}
        onBulkDelete={handleBulkDelete}
        onBulkAdd={() => setShowBulkAdd(true)}
      />

      {/* Dialogs */}
      <CustomStudyDialog open={showCustomStudy} onClose={() => setShowCustomStudy(false)} deckId={currentDeckId} />
      <CsvImportDialog open={showCsvImport} onClose={() => setShowCsvImport(false)} deckId={currentDeckId} />
      <BulkAddDialog
        open={showBulkAdd}
        onClose={() => setShowBulkAdd(false)}
        deckId={currentDeckId}
        onImport={async (bulkCards) => {
          const state = useRecallStore.getState();
          const allDecks = state.decks;
          for (const bc of bulkCards) {
            const targetDeckId = bc.nextDeckName
              ? (allDecks.find((d) => d.name.toLowerCase() === bc.nextDeckName?.toLowerCase())?.id ?? currentDeckId)
              : currentDeckId;
            await createCard({
              deckId: targetDeckId,
              front: bc.front,
              back: bc.back,
              hint: bc.hint ?? "",
              source: bc.source ?? "",
              tags: bc.tags,
            });
          }
        }}
      />
    </div>
  );
}
