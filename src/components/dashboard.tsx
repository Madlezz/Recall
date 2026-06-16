import { useMemo, useState } from "react";
import { ArrowRight, Beaker, FileSpreadsheet, Flame, Library, Plus, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { AnkiImportDialog } from "@/components/anki-import-dialog";
import { ReviewInbox } from "@/components/review-inbox";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { DailyGoal } from "@/components/daily-goal";
import { FocusTimer } from "@/components/focus-timer";
import { ReviewCalendar } from "@/components/review-calendar";
import { DeckDialog } from "@/components/deck-dialog";
import { CustomStudyDialog } from "@/components/custom-study-dialog";
import { CsvImportDialog } from "@/components/csv-import-dialog";
import { MarkdownImportDialog } from "@/components/markdown-import-dialog";
import { RecallImportDialog } from "@/components/recall-import-dialog";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getDeckColorClass } from "@/lib/deck-colors";
import { getDeckStats, getDeckHealth, getStudyStreak, isCardDueToday } from "@/lib/stats";
import { getLevel, getLevelTitle, levelProgress } from "@/lib/xp";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import type { Deck } from "@/types";

export function Dashboard(): JSX.Element {
  const decks = useRecallStore((state) => state.decks);
  const cards = useRecallStore((state) => state.cards);
  const isLoading = useRecallStore((state) => state.isLoading);
  const showDeck = useRecallStore((state) => state.showDeck);
  const startReview = useRecallStore((state) => state.startReview);
  const [sortBy, setSortBy] = useState<"name" | "due" | "cards">("name");
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [showCustomStudy, setShowCustomStudy] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);

  function handleStartReview(): void {
    if (!startReview(null)) {
      toast.info("No cards due right now");
    }
  }

  const sortedDecks = useMemo(() => {
    const withStats = decks.map((deck) => {
      const deckCards = cards.filter((c) => c.deckId === deck.id);
      const dueCount = deckCards.filter((c) => isCardDueToday(c)).length;
      return { ...deck, dueCount, totalCards: deckCards.length };
    });

    return withStats.sort((a, b) => {
      if (sortBy === "due") return b.dueCount - a.dueCount;
      if (sortBy === "cards") return b.totalCards - a.totalCards;
      return a.name.localeCompare(b.name);
    });
  }, [decks, cards, sortBy]);

  const hasAnyContent = decks.length > 0;

  return (
    <div className="animate-fade-in space-y-12">
      {/* ── Hero ── */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Spaced Repetition</p>
          <h1 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Review what's due, keep your decks tidy, and stay focused — no accounts, no cloud, just your data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleStartReview} className="gap-2">
            <RotateCw className="h-4 w-4" />
            Start Review
          </Button>
          <DeckDialog
            trigger={
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                New Deck
              </Button>
            }
          />
          <AnkiImportDialog />
          <Button variant="outline" size="icon" onClick={() => setShowCsvImport(true)} title="CSV Import" aria-label="Import cards from CSV">
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <MarkdownImportDialog />
          <RecallImportDialog />
          <Button variant="outline" size="icon" onClick={() => setShowCustomStudy(true)} title="Custom Study" aria-label="Custom study session">
            <Beaker className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── Review Inbox ── */}
      <ReviewInbox />

      {/* ── Stats row: Level + Streak + Daily Goal ── */}
      <section className="grid gap-4 sm:grid-cols-3">
        <LevelTile />
        <StreakWidget />
        <DailyGoal />
      </section>

      {/* ── Activity heatmap ── */}
      <section>
        <div className="px-1 py-3">
          <ActivityHeatmap />
        </div>
      </section>

      {/* ── Focus + Calendar ── */}
      <section className="grid gap-6 lg:grid-cols-2">
        <FocusTimer />
        <ReviewCalendar />
      </section>

      {/* ── Decks ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-200">Your Decks</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-zinc-400">{decks.length} total</span>
            {/* Segmented sort */}
            <div className="flex rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800">
              {(["name", "due", "cards"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-sm transition-colors",
                    sortBy === s
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                  )}
                >
                  {s === "name" ? "Name" : s === "due" ? "Due" : "Cards"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border border-zinc-200 bg-white p-5 animate-pulse dark:border-zinc-800 dark:bg-zinc-900">
                <div className="h-4 w-28 rounded bg-zinc-100 dark:bg-zinc-800 mb-3" />
                <div className="h-3 w-44 rounded bg-zinc-100 dark:bg-zinc-800 mb-4" />
                <div className="h-2 rounded bg-zinc-100 dark:bg-zinc-800 mb-4" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-10 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-10 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasAnyContent ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
              <Library className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200">Your library is empty</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Create your first deck and start building knowledge that sticks.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={() => setShowCreateDeck(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Deck
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowCsvImport(true)} className="gap-2">
                <ArrowRight className="h-4 w-4" />
                Import Cards
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
      <CsvImportDialog open={showCsvImport} onClose={() => setShowCsvImport(false)} />
    </div>
  );
}

// ═══════════════════════════════════════════════
// DeckCard
// ═══════════════════════════════════════════════

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
  const health = useMemo(
    () => getDeckHealth(deck.id, cards, reviewLogs, leechThreshold),
    [deck.id, cards, reviewLogs, leechThreshold],
  );

  const examDays = useMemo(() => {
    if (!deck.examDeadline) return null;
    const now = new Date();
    const deadline = new Date(deck.examDeadline);
    return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [deck.examDeadline]);

  const lastStudied = useMemo(() => {
    const deckCardIds = new Set(cards.filter((c) => c.deckId === deck.id).map((c) => c.id));
    const dates = reviewLogs.filter((l) => deckCardIds.has(l.cardId)).map((l) => new Date(l.reviewDate).getTime());
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates));
  }, [cards, reviewLogs, deck.id]);

  const retentionColor =
    health.retention >= 85 ? "text-emerald-600" : health.retention >= 70 ? "text-amber-600" : "text-red-600";

  return (
    <button
      onClick={onOpen}
      className="group relative flex flex-col rounded-lg border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      {/* Top row: name + arrow */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", getDeckColorClass(deck.color))} />
            <h3 className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">{deck.name}</h3>
            {examDays !== null && (
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  examDays <= 0
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    : examDays <= 3
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                )}
              >
                📅 {examDays <= 0 ? "Today!" : examDays === 1 ? "Tomorrow" : `${examDays}d`}
              </span>
            )}
          </div>
          <p className="mt-1.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
            {deck.description || "No description"}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
      </div>

      {/* Progress bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {stats.mastered}/{stats.total} mastered
          </span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Metrics */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Due" value={stats.due} accent={stats.due > 0} />
        <MiniStat label="Accuracy" value={`${stats.accuracy}%`} />
        <MiniStat label="Cards" value={stats.total} />
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
        <span className={cn("font-semibold tabular-nums", retentionColor)}>{health.retention}% retention</span>
        {health.leeches > 0 && (
          <span className="tabular-nums text-amber-600 dark:text-amber-400">
            ⚠ {health.leeches} {health.leeches === 1 ? "leech" : "leeches"}
          </span>
        )}
        {health.overdue > 0 && (
          <span className="tabular-nums text-red-600 dark:text-red-400">{health.overdue} overdue</span>
        )}
        {stats.newCards > 0 && <span className="text-zinc-400 tabular-nums">{stats.newCards} new</span>}
        {lastStudied && <span className="ml-auto text-zinc-400">{formatLastStudied(lastStudied)}</span>}
      </div>
    </button>
  );
}

function formatLastStudied(d: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

// ═══════════════════════════════════════════════
// MiniStat (used inside DeckCard)
// ═══════════════════════════════════════════════

function MiniStat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-md px-2.5 py-2 text-center",
        accent ? "bg-zinc-100 dark:bg-zinc-800" : "bg-zinc-50 dark:bg-zinc-800/50",
      )}
    >
      <div className={cn("text-sm font-bold tabular-nums", accent ? "text-zinc-800 dark:text-zinc-200" : "")}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// StreakWidget
// ═══════════════════════════════════════════════

function StreakWidget(): JSX.Element {
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const streak = useMemo(() => getStudyStreak(reviewLogs), [reviewLogs]);

  const flameColor =
    streak >= 30
      ? "text-amber-500"
      : streak >= 7
        ? "text-orange-500"
        : streak >= 3
          ? "text-amber-600"
          : "text-zinc-300 dark:text-zinc-600";

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">Streak</span>
      <div className="mt-2 flex items-baseline gap-1">
        <Flame className={cn("h-5 w-5", flameColor)} />
        <span className={cn("text-3xl font-bold tabular-nums tracking-tight", flameColor)}>{streak}</span>
      </div>
      <span className="mt-1 text-xs text-zinc-400">
        {streak === 0 ? "Study today!" : streak === 1 ? "1 day" : `${streak} days`}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════
// LevelTile
// ═══════════════════════════════════════════════

function LevelTile(): JSX.Element {
  const settings = useRecallStore((state) => state.settings);
  const xp = settings.xp;
  const level = getLevel(xp);
  const title = getLevelTitle(level);
  const progress = levelProgress(xp);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">Level {level}</span>
      <div className="mt-1.5 text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-200">{title}</div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-zinc-700 transition-[width] duration-700 ease-out dark:bg-zinc-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <div className="mt-1.5 text-xs text-zinc-400 tabular-nums">{xp.toLocaleString()} XP</div>
    </div>
  );
}