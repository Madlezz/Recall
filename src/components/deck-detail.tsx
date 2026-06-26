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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        <h1 className="font-semibold">{t("deckDetail.notFound")}</h1>
        <Button className="mt-4" onClick={showDashboard}>
          {t("deckDetail.backToDashboard")}
        </Button>
      </div>
    );
  }

  const d = deck;
  const currentDeckId = deck.id;
  const stats = getDeckStats(deck, cards);

  function handleStudyNow(): void {
    if (!startReview(currentDeckId)) {
      toast.info(t("deckDetail.noCardsDue"));
    }
  }

  async function handleExport(): Promise<void> {
    const json = exportDeckToJson(d, deckCards);
    const ok = await downloadFile(`${d.name.replace(/\s+/g, "_")}.json`, json);
    if (ok) toast.success(t("deckDetail.deckExported"));
  }

  async function handleExportRecall(): Promise<void> {
    try {
      const { json, imageReport } = await exportDeckPackage(d, deckCards);
      const saved = await saveRecallPackage(json, d.name);
      if (saved) {
        if (imageReport.warnings.length > 0) {
          toast.warning(t("deckDetail.exportedRecallWithWarning", { warning: imageReport.warnings[0] }));
        } else {
          toast.success(t("deckDetail.exportedRecall"));
        }
      }
    } catch {
      toast.error(t("deckDetail.exportRecallFailed"));
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
    toast.success(t("deckDetail.cardsDeleted", { count }));
  }

  function handleOptimizeDeck(): void {
    if (!currentDeckId) return;
    const result = optimizeFromHistory(reviewLogs, cards, settings.desiredRetention, currentDeckId);
    if (result.success) {
      void updateSettings({
        desiredRetention: result.suggestedRetention,
        fsrsWeights: result.weights,
      });
      toast.success(t("deckDetail.optimizedFor", { name: d.name, result: formatOptimizationResult(result) }));
    } else {
      toast.error(t("deckDetail.optimizeFailed", { name: d.name, result: formatOptimizationResult(result) }));
    }
  }

  return (
    <div className="animate-fade-in space-y-7">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={showDashboard} aria-label={t("deckDetail.backToDashboard")}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("dashboard.title")}
        </Button>
        <div className="flex flex-wrap gap-2">
          <DeckDialog
            deck={deck}
            trigger={
              <Button variant="outline">
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                {t("deckDetail.edit")}
              </Button>
            }
          />
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("deckDetail.exportJson")}
          </Button>
          <Button variant="outline" onClick={() => void handleExportRecall()}>
            <PackageOpen className="h-4 w-4" aria-hidden="true" />
            {t("deckDetail.exportRecall")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setQualityWarnings(checkDeckQuality(deckCards).warnings)}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {t("deckDetail.checkQuality")}
          </Button>
          <Button
            variant="outline"
            onClick={handleOptimizeDeck}
            title={t("deckDetail.optimizeTitle")}
          >
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            {t("deckDetail.optimize")}
          </Button>
          <Button variant="outline" onClick={() => setShowCustomStudy(true)}>
            <Beaker className="h-4 w-4" aria-hidden="true" />
            {t("deckDetail.customStudy")}
          </Button>
          <Button variant="outline" onClick={() => setShowCsvImport(true)}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            {t("deckDetail.csvImport")}
          </Button>
          <MarkdownImportDialog deckId={currentDeckId} />
          <RecallImportDialog deckId={currentDeckId} />
          <ConfirmAction
            title={t("deckDetail.resetProgressTitle")}
            description={t("deckDetail.resetProgressDescription")}
            actionLabel={t("deckDetail.resetProgress")}
            triggerLabel={t("deckDetail.reset")}
            onConfirm={async () => {
              try {
                await resetDeckProgress(currentDeckId);
                toast.success(t("deckDetail.progressReset"));
              } catch (error) {
                toast.error(error instanceof Error ? error.message : t("deckDetail.progressResetFailed"));
              }
            }}
          />
          <ConfirmAction
            title={t("deckDetail.deleteDeckTitle")}
            description={t("deckDetail.deleteDeckDescription")}
            actionLabel={t("deckDetail.deleteDeck")}
            triggerLabel={t("deckDetail.delete")}
            destructive
            onConfirm={async () => {
              try {
                await deleteDeck(currentDeckId);
                toast.success(t("deckDetail.deckDeleted"));
              } catch (error) {
                toast.error(error instanceof Error ? error.message : t("deckDetail.deckDeleteFailed"));
              }
            }}
          />
        </div>
      </div>

      {/* Deck header */}
      <DeckHeaderSection deck={deck} deckCards={deckCards} onStudyNow={handleStudyNow} />

      {/* Stat tiles */}
      <section className="grid gap-3 sm:grid-cols-4">
        <StatTile icon={Play} label={t("deckDetail.due")} value={String(stats.due)} />
        <StatTile icon={BookOpen} label={t("deckDetail.new")} value={String(stats.newCards)} />
        <StatTile icon={Brain} label={t("deckDetail.learning")} value={String(stats.learning)} />
        <StatTile icon={RefreshCw} label={t("deckDetail.review")} value={String(stats.review)} />
      </section>

      {/* Quality warnings */}
      {qualityWarnings !== null && (
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {qualityWarnings.length === 0 ? (
                <span className="text-green-400">{t("deckDetail.allCardsGreat", { count: deckCards.length })}</span>
              ) : (
                <span className="text-amber-400">
                  {t("deckDetail.issuesFound", { count: qualityWarnings.length })}
                </span>
              )}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setQualityWarnings(null)}>
              {t("deckDetail.dismiss")}
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
