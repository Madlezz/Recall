import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { getDeckStats, getDeckHealth, getStudyStreak, isCardDueToday, getDueTodayCount } from "@/lib/stats";
import { getLevel, getLevelTitle, levelProgress } from "@/lib/xp";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import type { Deck } from "@/types";

export function Dashboard(): JSX.Element {
  const { t } = useTranslation();
  const decks = useRecallStore((state) => state.decks);
  const cards = useRecallStore((state) => state.cards);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const isLoading = useRecallStore((state) => state.isLoading);
  const showDeck = useRecallStore((state) => state.showDeck);
  const startReview = useRecallStore((state) => state.startReview);
  const [sortBy, setSortBy] = useState<"name" | "due" | "cards">("name");
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [showCustomStudy, setShowCustomStudy] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);

  function handleStartReview(): void {
    if (!startReview(null)) {
      toast.info(t("dashboard.noCardsDue"));
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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">{t("dashboard.subtitle")}</p>
          <h1 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">
            {t("dashboard.title")}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("dashboard.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleStartReview} className="gap-2" aria-label={t("deck.startReview")}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            {t("dashboard.startReview")}
          </Button>
          <DeckDialog
            trigger={
              <Button variant="outline" className="gap-2" aria-label={t("deck.createNewDeck")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("dashboard.newDeck")}
              </Button>
            }
          />
          <AnkiImportDialog />
          <Button variant="outline" size="icon" onClick={() => setShowCsvImport(true)} title={t("dashboard.csvImport")} aria-label={t("deck.importFromCsv")}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <MarkdownImportDialog />
          <RecallImportDialog />
          <Button variant="outline" size="icon" onClick={() => setShowCustomStudy(true)} title={t("dashboard.customStudy")} aria-label={t("deck.customStudySession")}>
            <Beaker className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── Today band: due/new/reviewed + primary CTA ── */}
      <TodayBand
        dueCount={getDueTodayCount(cards)}
        newCount={cards.filter((c) => c.state === "new").length}
        reviewedToday={reviewLogs.filter((l) => {
          const d = new Date(l.reviewDate);
          const now = new Date();
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length}
        onStartReview={handleStartReview}
      />

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
          <h2 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-200">{t("dashboard.yourDecks")}</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-zinc-400">{t("dashboard.totalDecks", { count: decks.length })}</span>
            {/* Segmented sort */}
                        <div className="flex rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800" role="group" aria-label={t("dashboard.sortLabel")}>
                          {(["name", "due", "cards"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => setSortBy(s)}
                              aria-pressed={sortBy === s}
                              className={cn(
                    "px-3 py-1 text-xs font-medium rounded-sm transition-colors",
                    sortBy === s
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                  )}
                >
                  {s === "name" ? t("dashboard.sortName") : s === "due" ? t("dashboard.sortDue") : t("dashboard.sortCards")}
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
            <h3 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200">{t("dashboard.emptyTitle")}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t("dashboard.emptyDescription")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={() => setShowCreateDeck(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("dashboard.createDeck")}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowCsvImport(true)} className="gap-2">
                <ArrowRight className="h-4 w-4" />
                {t("dashboard.importCards")}
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
  const { t } = useTranslation();
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
      aria-label={t("deck.openDeck", { name: deck.name, due: stats.due, total: stats.total, progress })}
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
                📅 {examDays <= 0 ? t("deck.examToday") : examDays === 1 ? t("deck.examTomorrow") : t("deck.examDays", { count: examDays })}
              </span>
            )}
          </div>
          <p className="mt-1.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
            {deck.description || t("deck.noDescription")}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
      </div>

      {/* Progress bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {t("deck.mastered", { mastered: stats.mastered, total: stats.total })}
          </span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Metrics */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label={t("deck.due")} value={stats.due} accent={stats.due > 0} />
        <MiniStat label={t("deck.accuracy")} value={`${stats.accuracy}%`} />
        <MiniStat label={t("deck.cards")} value={stats.total} />
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
        <span className={cn("font-semibold tabular-nums", retentionColor)}>{t("deck.retention", { percent: health.retention })}</span>
        {health.leeches > 0 && (
          <span className="tabular-nums text-amber-600 dark:text-amber-400">
            ⚠ {t("deck.leech", { count: health.leeches })}
          </span>
        )}
        {health.overdue > 0 && (
          <span className="tabular-nums text-red-600 dark:text-red-400">{t("deck.overdue", { count: health.overdue })}</span>
        )}
        {stats.newCards > 0 && <span className="text-zinc-400 tabular-nums">{t("deck.newCards", { count: stats.newCards })}</span>}
        {lastStudied && <span className="ml-auto text-zinc-400">{formatLastStudied(lastStudied, t)}</span>}
      </div>
    </button>
  );
}

function formatLastStudied(d: Date, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t("deck.today");
  if (diffDays === 1) return t("deck.yesterday");
  if (diffDays < 7) return t("deck.daysAgo", { count: diffDays });
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
  const { t } = useTranslation();
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
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">{t("streak.title")}</span>
      <div className="mt-2 flex items-baseline gap-1">
        <Flame className={cn("h-5 w-5", flameColor)} />
        <span className={cn("text-3xl font-bold tabular-nums tracking-tight", flameColor)}>{streak}</span>
      </div>
      <span className="mt-1 text-xs text-zinc-400">
        {streak === 0 ? t("streak.studyToday") : streak === 1 ? t("streak.oneDay") : t("streak.days", { count: streak })}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════
// LevelTile
// ═══════════════════════════════════════════════

function LevelTile(): JSX.Element {
  const { t } = useTranslation();
  const settings = useRecallStore((state) => state.settings);
  const xp = settings.xp;
  const level = getLevel(xp);
  const title = getLevelTitle(level);
  const progress = levelProgress(xp);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">{t("level.label", { level })}</span>
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

// ═══════════════════════════════════════════════
// TodayBand - hero band with due/new/reviewed + CTA
// ═══════════════════════════════════════════════

interface TodayBandProps {
  dueCount: number;
  newCount: number;
  reviewedToday: number;
  onStartReview: () => void;
}

function TodayBand({ dueCount, newCount, reviewedToday, onStartReview }: TodayBandProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-3xl font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
            {dueCount}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{t("todayBand.due")}</span>
        </div>
        <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex flex-col">
          <span className="text-3xl font-bold tabular-nums text-zinc-400 dark:text-zinc-500">
            {newCount}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{t("todayBand.new")}</span>
        </div>
        <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex flex-col">
          <span className="text-3xl font-bold tabular-nums text-zinc-400 dark:text-zinc-500">
            {reviewedToday}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{t("todayBand.reviewed")}</span>
        </div>
      </div>
      <Button
        size="lg"
        onClick={onStartReview}
        className="gap-2"
        disabled={dueCount === 0}
        aria-label={t("deck.startReview")}
      >
        <RotateCw className="h-5 w-5" />
        {dueCount > 0 ? t("dashboard.startReviewCount", { count: dueCount }) : t("dashboard.allCaughtUp")}
      </Button>
    </section>
  );
}