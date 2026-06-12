import { ArrowLeft, BookOpen, Brain, CheckSquare, Download, Edit3, Play, Plus, RefreshCw, Search, Square, Trash2, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { toast } from "sonner";
import { CardDialog } from "@/components/card-dialog";
import { ConfirmAction } from "@/components/confirm-action";
import { DeckDialog } from "@/components/deck-dialog";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getDeckStats } from "@/lib/stats";
import { useRecallStore } from "@/stores/recall-store";
import type { Card, RecallSettings } from "@/types";
import { exportDeckToJson, downloadFile } from "@/services/import-export";

export function DeckDetail(): JSX.Element {
  const [search, setSearch] = useState("");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
    const selectedDeckId = useRecallStore((state) => state.selectedDeckId);
  const deck = useRecallStore((state) => state.decks.find((item) => item.id === selectedDeckId));
  const cards = useRecallStore((state) => state.cards);
  const showDashboard = useRecallStore((state) => state.showDashboard);
    const deleteDeck = useRecallStore((state) => state.deleteDeck);
    const deleteCard = useRecallStore((state) => state.deleteCard);
    const startReview = useRecallStore((state) => state.startReview);
        const resetDeckProgress = useRecallStore((state) => state.resetDeckProgress);
        const startMatch = useRecallStore((state) => state.startMatch);

  const deckCards = useMemo(() => cards.filter((card) => card.deckId === selectedDeckId), [cards, selectedDeckId]);

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
    if (!query) {
      return result;
    }

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

  const stats = getDeckStats(deck, cards);
  const progress = stats.total === 0 ? 0 : Math.round((stats.mastered / stats.total) * 100);
  const currentDeckId = deck.id;

  function handleStudyNow(): void {
    if (!startReview(currentDeckId)) {
      toast.info("No cards due in this deck");
    }
  }

  function handleExport(): void {
    const json = exportDeckToJson(deck, deckCards);
    downloadFile(`${deck.name.replace(/\s+/g, '_')}.json`, json);
    toast.success("Deck exported");
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
    toast.success(`Deleted ${count} card${count > 1 ? 's' : ''}`);
  }

  return (
    <div className="animate-fade-in space-y-7">
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

      <section className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-normal">{deck.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{deck.description || "No description"}</p>
          </div>
          <Button size="lg" onClick={handleStudyNow}>
                      <Play className="h-4 w-4" />
                      Study Now
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => startMatch(currentDeckId)}>
                      <Brain className="h-4 w-4" />
                      Match Game
                    </Button>
        </div>

        <div className="max-w-xl space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats.mastered}/{stats.total} mastered</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <StatTile icon={Play} label="Due" value={String(stats.due)} />
        <StatTile icon={BookOpen} label="New" value={String(stats.newCards)} />
        <StatTile icon={Brain} label="Learning" value={String(stats.learning)} />
        <StatTile icon={RefreshCw} label="Review" value={String(stats.review)} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Cards</h2>
            <p className="text-sm text-muted-foreground">Search, edit, or move cards inside this deck.</p>
          </div>
          <CardDialog
            deckId={deck.id}
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Add Card
              </Button>
            }
          />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cards" />
        </div>

        {filteredCards.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              {selectedCardIds.size === filteredCards.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {selectedCardIds.size === filteredCards.length ? "Deselect All" : "Select All"}
            </Button>
            {selectedCardIds.size > 0 ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedCardIds.size} selected
                </span>
                <Button variant="destructive" size="sm" onClick={() => void handleBulkDelete()}>
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        {allTags.length > 0 ? (
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
        ) : null}

        {filteredCards.length === 0 ? (
                  deckCards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/30 px-6 py-16 text-center">
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
                        <BookOpen className="h-8 w-8 text-muted-foreground/60" />
                      </div>
                      <h3 className="text-lg font-semibold">This deck is empty</h3>
                                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                                      Add flashcards to start learning. Use the Add Card button above, or try Markdown and LaTeX for rich content.
                                    </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-10 text-center">
                      <h3 className="font-semibold">No matches</h3>
                      <p className="mt-2 text-sm text-muted-foreground">Try a different search term.</p>
                    </div>
                  )
                ) : (
          <div className="grid gap-3">
            {filteredCards.map((card) => (
                          <CardRow key={card.id} card={card} deckId={deck.id} isSelected={selectedCardIds.has(card.id)} onToggle={toggleCardSelection} />
                        ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface CardRowProps {
  card: Card;
  deckId: string;
  isSelected: boolean;
  onToggle: (cardId: string) => void;
}

function CardRow({ card, deckId, isSelected, onToggle }: CardRowProps): JSX.Element {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteCard = useRecallStore((state) => state.deleteCard);
  const leechThreshold = useRecallStore((state) => state.settings.leechThreshold);
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
    <article className={cn("rounded-lg border bg-card p-4 transition-colors", isSelected && "ring-2 ring-primary/50")}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onToggle(card.id)}
              className="flex h-5 w-5 items-center justify-center rounded border border-input transition-colors hover:bg-muted"
              aria-label={isSelected ? "Deselect card" : "Select card"}
            >
              {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
            </button>
            <Badge tone={card.state === "review" ? "success" : card.state === "learning" || card.state === "relearning" ? "warning" : "muted"}>
              {card.state}
            </Badge>
            {isLeech ? (
              <Badge tone="warning" title={`Failed ${card.lapses} times (threshold: ${leechThreshold}). Consider rewriting this card.`}>
                ⚠️ Leech
              </Badge>
            ) : null}
            {card.tags.map((tag) => (
              <Badge key={tag} tone="muted">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="mt-3 prose prose-sm prose-invert max-w-none line-clamp-1">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{card.front}</ReactMarkdown>
          </div>
          <div className="mt-1 prose prose-sm prose-invert max-w-none line-clamp-2 text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{card.back}</ReactMarkdown>
          </div>
          {card.hint ? <p className="mt-2 text-xs text-muted-foreground">Hint: {card.hint}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <CardDialog deckId={deckId} card={card} trigger={<Button variant="outline">Edit</Button>} />
          <Button
            variant="ghost"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
          >
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}
