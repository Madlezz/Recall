import { ArrowLeft, Download, Edit3, Play, Plus, Search, Trash2, RotateCcw } from "lucide-react";
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
import { getDeckStats } from "@/lib/stats";
import { useRecallStore } from "@/stores/recall-store";
import type { Card } from "@/types";
import { exportDeckToJson, downloadFile } from "@/services/import-export";

export function DeckDetail(): JSX.Element {
  const [search, setSearch] = useState("");
  const selectedDeckId = useRecallStore((state) => state.selectedDeckId);
  const deck = useRecallStore((state) => state.decks.find((item) => item.id === selectedDeckId));
  const cards = useRecallStore((state) => state.cards);
  const showDashboard = useRecallStore((state) => state.showDashboard);
    const deleteDeck = useRecallStore((state) => state.deleteDeck);
    const startReview = useRecallStore((state) => state.startReview);
    const resetDeckProgress = useRecallStore((state) => state.resetDeckProgress);

  const deckCards = useMemo(() => cards.filter((card) => card.deckId === selectedDeckId), [cards, selectedDeckId]);
  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return deckCards;
    }

    return deckCards.filter((card) =>
      [card.front, card.back, card.hint, card.tags.join(" ")].join(" ").toLowerCase().includes(query),
    );
  }, [deckCards, search]);

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
        <StatTile icon={Search} label="Cards" value={String(stats.total)} />
        <StatTile icon={Play} label="Due" value={String(stats.due)} />
        <StatTile icon={Edit3} label="Mastered" value={String(stats.mastered)} />
        <StatTile icon={Trash2} label="Accuracy" value={`${stats.accuracy}%`} />
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

        {filteredCards.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <h3 className="font-semibold">{deckCards.length === 0 ? "No cards yet" : "No matches"}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {deckCards.length === 0 ? "Add a card to make this deck study-ready." : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredCards.map((card) => (
              <CardRow key={card.id} card={card} deckId={deck.id} />
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
}

function CardRow({ card, deckId }: CardRowProps): JSX.Element {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteCard = useRecallStore((state) => state.deleteCard);

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
    <article className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={card.state === "review" ? "success" : card.state === "learning" || card.state === "relearning" ? "warning" : "muted"}>
              {card.state}
            </Badge>
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
