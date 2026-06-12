import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Brain, Flame, Layers3, Plus, RotateCw, SortAsc, SortDesc, Zap } from "lucide-react";
import { toast } from "sonner";
import { AnkiImportDialog } from "@/components/anki-import-dialog";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { DeckDialog } from "@/components/deck-dialog";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getDeckColorClass } from "@/lib/deck-colors";
import { getDeckStats, getDueTodayCount, getLearningCount, getNewCount } from "@/lib/stats";
import { getStudyStreak } from "@/lib/streak";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import type { Deck } from "@/types";

export function Dashboard(): JSX.Element {
  const decks = useRecallStore((state) => state.decks);
  const cards = useRecallStore((state) => state.cards);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const showDeck = useRecallStore((state) => state.showDeck);
  const startReview = useRecallStore((state) => state.startReview);
  const [sortBy, setSortBy] = useState<"name" | "due" | "cards">("name");

  function handleStartReview(): void {
    if (!startReview(null)) {
      toast.info("No cards due right now");
    }
  }

  const sortedDecks = useMemo(() => {
    const withStats = decks.map((deck) => {
      const deckCards = cards.filter((c) => c.deckId === deck.id);
      const dueCount = deckCards.filter((c) => c.state === "review" || c.state === "learning" || c.state === "relearning").length;
      return { ...deck, dueCount, totalCards: deckCards.length };
    });

    return withStats.sort((a, b) => {
      if (sortBy === "due") return b.dueCount - a.dueCount;
      if (sortBy === "cards") return b.totalCards - a.totalCards;
      return a.name.localeCompare(b.name);
    });
  }, [decks, cards, sortBy]);

  return (
    <div className="animate-fade-in space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Local-first flashcards</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review what is due, keep decks tidy, and stay focused without accounts or cloud services.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleStartReview}>
            <RotateCw className="h-4 w-4" />
            Start Review
          </Button>
          <DeckDialog
            trigger={
              <Button variant="outline">
                <Plus className="h-4 w-4" />
                New Deck
              </Button>
            }
          />
          <AnkiImportDialog />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
              <StatTile icon={Flame} label="Streak" value={`${getStudyStreak(reviewLogs)} day${getStudyStreak(reviewLogs) === 1 ? '' : 's'}`} />
              <StatTile icon={Zap} label="Due today" value={String(getDueTodayCount(cards))} />
              <StatTile icon={BookOpen} label="New" value={String(getNewCount(cards))} />
              <StatTile icon={Brain} label="Learning" value={String(getLearningCount(cards))} />
            </section>

            <section className="rounded-lg border bg-card p-5">
              <ActivityHeatmap />
            </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Decks</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{decks.length} total</span>
                      <div className="flex rounded-md border border-input overflow-hidden">
                        <button onClick={() => setSortBy("name")} className={cn("px-2 py-1 text-xs font-medium transition-colors", sortBy === "name" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Name</button>
                        <button onClick={() => setSortBy("due")} className={cn("px-2 py-1 text-xs font-medium transition-colors border-l border-input", sortBy === "due" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Due</button>
                        <button onClick={() => setSortBy("cards")} className={cn("px-2 py-1 text-xs font-medium transition-colors border-l border-input", sortBy === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Cards</button>
                      </div>
                    </div>
        </div>

        {decks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <h3 className="font-semibold">No decks yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Create a deck to start collecting cards.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {sortedDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} onOpen={() => showDeck(deck.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface DeckCardProps {
  deck: Deck;
  onOpen: () => void;
}

function DeckCard({ deck, onOpen }: DeckCardProps): JSX.Element {
  const cards = useRecallStore((state) => state.cards);
  const stats = getDeckStats(deck, cards);
  const progress = stats.total === 0 ? 0 : Math.round((stats.mastered / stats.total) * 100);

  return (
    <button
      className="group rounded-lg border bg-card p-5 text-left transition hover:border-primary/50 hover:bg-accent/40"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", getDeckColorClass(deck.color))} />
            <h3 className="truncate font-semibold">{deck.name}</h3>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{deck.description || "No description"}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{stats.mastered}/{stats.total} mastered</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <Metric label="Due" value={stats.due} />
        <Metric label="Accuracy" value={`${stats.accuracy}%`} />
        <Metric label="Cards" value={stats.total} />
      </div>
    </button>
  );
}

interface MetricProps {
  label: string;
  value: string | number;
}

function Metric({ label, value }: MetricProps): JSX.Element {
  return (
    <div className="rounded-md bg-muted/60 p-2">
      <div className="font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
