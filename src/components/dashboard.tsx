import { useMemo, useState } from "react";
import { ArrowRight, Beaker, Flame, Library, Plus, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { AnkiImportDialog } from "@/components/anki-import-dialog";
import { ReviewInbox } from "@/components/review-inbox";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { DailyGoal } from "@/components/daily-goal";
import { FocusTimer } from "@/components/focus-timer";
import { ReviewCalendar } from "@/components/review-calendar";
import { DeckDialog } from "@/components/deck-dialog";
import { CustomStudyDialog } from "@/components/custom-study-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getDeckColorClass } from "@/lib/deck-colors";
import { getDeckStats, getDeckHealth, getStudyStreak } from "@/lib/stats";
import { getLevel, getLevelTitle, levelProgress } from "@/lib/xp";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import type { Deck } from "@/types";

export function Dashboard(): JSX.Element {
  const decks = useRecallStore((state) => state.decks);
    const cards = useRecallStore((state) => state.cards);
    const showDeck = useRecallStore((state) => state.showDeck);
  const startReview = useRecallStore((state) => state.startReview);
  const [sortBy, setSortBy] = useState<"name" | "due" | "cards">("name");
    const [showCreateDeck, setShowCreateDeck] = useState(false);
    const [showCustomStudy, setShowCustomStudy] = useState(false);

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
          <Button variant="outline" onClick={() => setShowCustomStudy(true)}>
            <Beaker className="h-4 w-4" />
            Custom Study
          </Button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
                    <ReviewInbox />
                    <LevelTile />
                    <StreakWidget />
                  </section>

            <section className="rounded-lg border bg-card p-5">
                          <ActivityHeatmap />
                        </section>

                  {/* Daily Goal */}
                  <section>
                    <DailyGoal />
                  </section>

                  {/* Focus + Calendar */}
                  <section className="grid gap-4 lg:grid-cols-2">
                    <FocusTimer />
                    <ReviewCalendar />
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
                          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/30 px-6 py-16 text-center">
                            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
                              <Library className="h-8 w-8 text-muted-foreground/60" />
                            </div>
                            <h3 className="text-lg font-semibold">Nothing here yet!</h3>
                            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                              Time to learn something cool. Create your first deck and the magic begins. ✨
                            </p>
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                              <Button onClick={() => setShowCreateDeck(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Your First Deck
                              </Button>
                              <Button variant="outline" onClick={() => toast.info("Select a .apkg file to import")}>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Import from Anki
                              </Button>
                            </div>
                          </div>
                ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {sortedDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} onOpen={() => showDeck(deck.id)} />
            ))}
          </div>
        )}
      </section>
                  <DeckDialog open={showCreateDeck} onOpenChange={setShowCreateDeck} />
                  <CustomStudyDialog open={showCustomStudy} onClose={() => setShowCustomStudy(false)} />
                </div>
        );
      }

interface DeckCardProps {
  deck: Deck;
  onOpen: () => void;
}

function DeckCard({ deck, onOpen }: DeckCardProps): JSX.Element {
  const cards = useRecallStore((state) => state.cards);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const leechThreshold = useRecallStore((state) => state.settings.leechThreshold);
  const stats = getDeckStats(deck, cards);
  const progress = stats.total === 0 ? 0 : Math.round((stats.mastered / stats.total) * 100);
  const health = useMemo(() => getDeckHealth(deck.id, cards, reviewLogs, leechThreshold), [deck.id, cards, reviewLogs, leechThreshold]);

  // Exam countdown
  const examDays = useMemo(() => {
    if (!deck.examDeadline) return null;
    const now = new Date();
    const deadline = new Date(deck.examDeadline);
    return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [deck.examDeadline]);

  const healthColor = health.retention >= 85 ? "text-emerald-500" : health.retention >= 70 ? "text-amber-500" : "text-red-500";

  // Last studied date — most recent review for any card in this deck
  const lastStudied = useMemo(() => {
    const deckCardIds = new Set(cards.filter((c) => c.deckId === deck.id).map((c) => c.id));
    const dates = reviewLogs
      .filter((l) => deckCardIds.has(l.cardId))
      .map((l) => new Date(l.reviewDate).getTime());
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates));
  }, [cards, reviewLogs, deck.id]);

  function formatLastStudied(d: Date): string {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }

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
            {examDays !== null ? (
              <span className={cn(
                "ml-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                examDays <= 0 ? "bg-red-500/20 text-red-400" :
                examDays <= 3 ? "bg-amber-500/20 text-amber-400" :
                "bg-blue-500/20 text-blue-400",
              )}>
                📅 {examDays <= 0 ? "Today!" : examDays === 1 ? "Tomorrow" : `${examDays}d`}
              </span>
            ) : null}
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

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <Metric label="Due" value={stats.due} />
        <Metric label="Accuracy" value={`${stats.accuracy}%`} />
        <Metric label="Cards" value={stats.total} />
      </div>

      {/* Health row */}
      <div className="mt-3 flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
        <span className={cn("flex items-center gap-1 font-medium", healthColor)}>
          {health.retention}% retention
        </span>
        {health.leeches > 0 && (
          <span className="flex items-center gap-1 text-amber-500">
            ⚠️ {health.leeches} {health.leeches === 1 ? "leech" : "leeches"}
          </span>
        )}
        {health.overdue > 0 && (
          <span className="flex items-center gap-1 text-red-500">
            {health.overdue} overdue
          </span>
        )}
        {stats.newCards > 0 && (
                  <span className="text-muted-foreground">{stats.newCards} new</span>
                )}
                {lastStudied && (
                  <span className="ml-auto text-muted-foreground">
                    {formatLastStudied(lastStudied)}
                  </span>
                )}
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

function StreakWidget(): JSX.Element {
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const streak = useMemo(() => getStudyStreak(reviewLogs), [reviewLogs]);

  const flameColor = streak >= 30 ? "text-amber-400" : streak >= 7 ? "text-orange-400" : streak >= 3 ? "text-amber-500" : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 text-center">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Streak</div>
      <div className={cn("text-2xl font-bold", flameColor)}>
        <Flame className="inline h-6 w-6 mr-1" />
        {streak}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {streak === 0 ? "Study today!" : streak === 1 ? "1 day" : `${streak} days`}
      </div>
    </div>
  );
}

function LevelTile(): JSX.Element {
  const settings = useRecallStore((state) => state.settings);
  const xp = settings.xp;
  const level = getLevel(xp);
  const title = getLevelTitle(level);
  const progress = levelProgress(xp);

  return (
    <div className="rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 text-center">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Level {level}</div>
      <div className="text-2xl font-bold text-primary">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{xp} XP</div>
      <Progress className="mt-2 h-1.5" value={progress * 100} />
    </div>
  );
}
