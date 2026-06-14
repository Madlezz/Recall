import {
  ArrowLeft,
  Beaker,
  BookOpen,
  Brain,
  Calendar,
  CheckSquare,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  PackageOpen,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { BulkAddDialog } from "@/components/bulk-add-dialog";
import { CardDialog } from "@/components/card-dialog";
import { ConfirmAction } from "@/components/confirm-action";
import { CsvImportDialog } from "@/components/csv-import-dialog";
import { CustomStudyDialog } from "@/components/custom-study-dialog";
import { DeckDialog } from "@/components/deck-dialog";
import { MarkdownImportDialog } from "@/components/markdown-import-dialog";
import { RecallImportDialog } from "@/components/recall-import-dialog";
import { StatTile } from "@/components/stat-tile";
import { cn } from "@/lib/utils";
import { getDeckStats } from "@/lib/stats";
import { checkDeckQuality, type CardQualityWarning } from "@/lib/card-quality";
import { useRecallStore } from "@/stores/recall-store";
import {
  exportDeckToJson,
  exportDeckPackage,
  saveRecallPackage,
  downloadFile,
} from "@/services/import-export";
import type { Card } from "@/types";

// ═══════════════════════════════════════════════
// DeckDetail
// ═══════════════════════════════════════════════

export function DeckDetail(): JSX.Element {
  // ── Store selectors ──
  const selectedDeckId = useRecallStore((s) => s.selectedDeckId);
  const deck = useRecallStore((s) => s.decks.find((d) => d.id === selectedDeckId));
  const cards = useRecallStore((s) => s.cards);
  const showDashboard = useRecallStore((s) => s.showDashboard);
  const deleteDeck = useRecallStore((s) => s.deleteDeck);
  const deleteCard = useRecallStore((s) => s.deleteCard);
  const createCard = useRecallStore((s) => s.createCard);
  const startReview = useRecallStore((s) => s.startReview);
  const resetDeckProgress = useRecallStore((s) => s.resetDeckProgress);
  const startMatch = useRecallStore((s) => s.startMatch);
  const setExamDeadline = useRecallStore((s) => s.setExamDeadline);

  // ── Local state ──
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [showCustomStudy, setShowCustomStudy] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showExamPicker, setShowExamPicker] = useState(false);
  const [qualityWarnings, setQualityWarnings] = useState<CardQualityWarning[] | null>(null);

  // ── Derived data ──
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

  const examDays = useMemo(() => {
    if (!deck?.examDeadline) return null;
    const now = new Date();
    const d = new Date(deck.examDeadline);
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [deck?.examDeadline]);

  const [examDateInput, setExamDateInput] = useState(deck?.examDeadline?.split("T")[0] ?? "");

  // ── Deck not found ──
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

  const stats = getDeckStats(deck, cards);
  const progress = stats.total === 0 ? 0 : Math.round((stats.mastered / stats.total) * 100);
  const currentDeckId = deck.id;

  // ── Handlers ──
  async function handleSetExamDeadline(): Promise<void> {
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

  function handleStudyNow(): void {
    if (!startReview(currentDeckId)) {
      toast.info("No cards due in this deck");
    }
  }

  function handleExport(): void {
    const json = exportDeckToJson(deck, deckCards);
    downloadFile(`${deck.name.replace(/\s+/g, "_")}.json`, json);
    toast.success("Deck exported");
  }

  async function handleExportRecall(): Promise<void> {
    try {
      const json = await exportDeckPackage(deck, deckCards);
      const saved = await saveRecallPackage(json, deck.name);
      if (saved) toast.success("Deck exported as .recall package");
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
    for (const id of selectedCardIds) {
      await deleteCard(id);
    }
    setSelectedCardIds(new Set());
    toast.success(`Deleted ${count} card${count > 1 ? "s" : ""}`);
  }

  // ── Render ──
  return (
    <div className="animate-fade-in space-y-7">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={showDashboard}>
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Button>
        <div className="flex flex-wrap gap-2">
          <DeckDialog
            deck={deck}
            trigger={
              <Button variant="outline">
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
            }
          />
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => void handleExportRecall()}>
            <PackageOpen className="h-4 w-4" />
            Export .recall
          </Button>
          <Button
            variant="outline"
            onClick={() => setQualityWarnings(checkDeckQuality(deckCards).warnings)}
          >
            <ShieldCheck className="h-4 w-4" />
            Check Quality
          </Button>
          <Button variant="outline" onClick={() => setShowCustomStudy(true)}>
            <Beaker className="h-4 w-4" />
            Custom Study
          </Button>
          <Button variant="outline" onClick={() => setShowCsvImport(true)}>
            <FileSpreadsheet className="h-4 w-4" />
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
                await resetDeckProgress(deck.id);
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
                await deleteDeck(deck.id);
                toast.success("Deck deleted");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not delete deck");
              }
            }}
          />
        </div>
      </div>

      {/* ── Deck header ── */}
      <section className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-normal">{deck.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {deck.description || "No description"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="lg" onClick={handleStudyNow}>
              <Play className="h-4 w-4" />
              Study Now
            </Button>
            <Button size="lg" variant="outline" onClick={() => startMatch(currentDeckId)}>
              <Brain className="h-4 w-4" />
              Match Game
            </Button>
          </div>
        </div>

        {/* Exam deadline */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setExamDateInput(deck.examDeadline?.split("T")[0] ?? "");
              setShowExamPicker(!showExamPicker);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition",
              examDays !== null
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-dashed text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            <Calendar className="h-4 w-4" />
            {examDays !== null
              ? examDays <= 0
                ? "Exam today!"
                : examDays === 1
                  ? "Exam tomorrow"
                  : `Exam in ${examDays} days`
              : "Set exam date"}
          </button>
          {examDays !== null && examDays <= 3 && (
            <span className="text-xs font-medium text-amber-400">
              ⚡ Cram mode — all new cards unlocked
            </span>
          )}
        </div>

        {showExamPicker && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={examDateInput}
              onChange={(e) => setExamDateInput(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            />
            <Button size="sm" onClick={() => void handleSetExamDeadline()}>
              Save
            </Button>
            {deck.examDeadline && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setExamDateInput("");
                  void handleSetExamDeadline();
                }}
              >
                Remove
              </Button>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="max-w-xl space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {stats.mastered}/{stats.total} mastered
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </section>

      {/* ── Stat tiles ── */}
      <section className="grid gap-3 sm:grid-cols-4">
        <StatTile icon={Play} label="Due" value={String(stats.due)} />
        <StatTile icon={BookOpen} label="New" value={String(stats.newCards)} />
        <StatTile icon={Brain} label="Learning" value={String(stats.learning)} />
        <StatTile icon={RefreshCw} label="Review" value={String(stats.review)} />
      </section>

      {/* ── Quality warnings ── */}
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
          {qualityWarnings.map((warning, i) => (
            <div
              key={i}
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

      {/* ── Cards section ── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Cards</h2>
            <p className="text-sm text-muted-foreground">
              Search, edit, or move cards inside this deck.
            </p>
          </div>
          <div className="flex gap-2">
            <CardDialog
              deckId={deck.id}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Add Card
                </Button>
              }
            />
            <Button variant="outline" onClick={() => setShowBulkAdd(true)}>
              <FileText className="h-4 w-4" />
              Bulk Add
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search cards"
          />
        </div>

        {/* Bulk selection bar */}
        {filteredCards.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              {selectedCardIds.size === filteredCards.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {selectedCardIds.size === filteredCards.length ? "Deselect All" : "Select All"}
            </Button>
            {selectedCardIds.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedCardIds.size} selected
                </span>
                <Button variant="destructive" size="sm" onClick={() => void handleBulkDelete()}>
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </>
            )}
          </div>
        )}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Filter by tag:</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag((current) => (current === tag ? null : tag))}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  selectedTag === tag
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {tag}
                {selectedTag === tag ? <X className="h-3 w-3" /> : null}
              </button>
            ))}
          </div>
        )}

        {/* Card list / empty states */}
        {filteredCards.length === 0 ? (
          deckCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/30 px-6 py-16 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
                <BookOpen className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-semibold">This deck is empty</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Add flashcards to start learning. Use the Add Card button above, or try Markdown and
                LaTeX for rich content.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/30 px-6 py-16 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
                <Search className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-semibold">No matches</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Try a different search term or clear the tag filter.
              </p>
            </div>
          )
        ) : (
          <div className="grid gap-3">
            {filteredCards.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                deckId={deck.id}
                isSelected={selectedCardIds.has(card.id)}
                onToggle={toggleCardSelection}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Dialogs ── */}
      <CustomStudyDialog open={showCustomStudy} onClose={() => setShowCustomStudy(false)} deckId={deck.id} />
      <CsvImportDialog open={showCsvImport} onClose={() => setShowCsvImport(false)} deckId={deck.id} />
      <BulkAddDialog
        open={showBulkAdd}
        onClose={() => setShowBulkAdd(false)}
        deckId={deck.id}
        onImport={async (bulkCards) => {
          const state = useRecallStore.getState();
          const allDecks = state.decks;
          for (const bc of bulkCards) {
            const targetDeckId = bc.nextDeckName
              ? (allDecks.find((d) => d.name.toLowerCase() === bc.nextDeckName?.toLowerCase())?.id ?? deck.id)
              : deck.id;
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

// ═══════════════════════════════════════════════
// CardRow
// ═══════════════════════════════════════════════

interface CardRowProps {
  card: Card;
  deckId: string;
  isSelected: boolean;
  onToggle: (cardId: string) => void;
}

function CardRow({ card, deckId, isSelected, onToggle }: CardRowProps): JSX.Element {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteCard = useRecallStore((s) => s.deleteCard);
  const leechThreshold = useRecallStore((s) => s.settings.leechThreshold);
  const isLeech = card.lapses >= leechThreshold;

  async function handleDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await deleteCard(card.id);
      toast.success("Card deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete card");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-4 transition-colors",
        isSelected && "ring-2 ring-primary/50",
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onToggle(card.id)}
              className="flex h-5 w-5 items-center justify-center rounded border border-input transition-colors hover:bg-muted"
              aria-label={isSelected ? "Deselect card" : "Select card"}
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <Badge
              tone={
                card.state === "review"
                  ? "success"
                  : card.state === "learning" || card.state === "relearning"
                    ? "warning"
                    : "muted"
              }
            >
              {card.state}
            </Badge>
            {isLeech && (
              <Badge
                tone="warning"
                title={`Failed ${card.lapses} times (threshold: ${leechThreshold}). Consider rewriting this card.`}
              >
                ⚠️ Leech
              </Badge>
            )}
            {card.tags.map((tag) => (
              <Badge key={tag} tone="muted">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Card content */}
          <div className="mt-3 prose prose-sm prose-invert max-w-none line-clamp-1">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {card.front}
            </ReactMarkdown>
          </div>
          <div className="mt-1 prose prose-sm prose-invert max-w-none line-clamp-2 text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {card.back}
            </ReactMarkdown>
          </div>
          {card.hint && <p className="mt-2 text-xs text-muted-foreground">Hint: {card.hint}</p>}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-wrap gap-2">
          <CardDialog
            deckId={deckId}
            card={card}
            trigger={<Button variant="outline">Edit</Button>}
          />
          <Button variant="ghost" onClick={() => void handleDelete()} disabled={isDeleting}>
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}
