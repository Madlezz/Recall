import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Beaker, FileSpreadsheet, Flame, Library, Plus, RotateCw, Search } from "lucide-react";
import { toast } from "sonner";
import { AnkiImportDialog } from "@/components/anki-import-dialog";
import { ReviewInbox } from "@/components/review-inbox";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { DailyGoal } from "@/components/daily-goal";
import { FocusTimer } from "@/components/focus-timer";
import { ReviewCalendar } from "@/components/review-calendar";
import { DeckDialog } from "@/components/deck-dialog";
import { DeckCard } from "@/components/deck-card";
import { CustomStudyDialog } from "@/components/custom-study-dialog";
import { CsvImportDialog } from "@/components/csv-import-dialog";
import { MarkdownImportDialog } from "@/components/markdown-import-dialog";
import { RecallImportDialog } from "@/components/recall-import-dialog";

import { Button } from "@/components/ui/button";
import { getStudyStreak, isCardDueToday, getDueTodayCount } from "@/lib/stats";
import { getLevel, getLevelTitle, levelProgress } from "@/lib/xp";
import { cn } from "@/lib/utils";
import { cardSurface } from "@/lib/surface";
import { useRecallStore } from "@/stores/recall-store";

export function Dashboard(): JSX.Element {
  const { t } = useTranslation();
  const decks = useRecallStore((state) => state.decks);
  const cards = useRecallStore((state) => state.cards);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const isLoading = useRecallStore((state) => state.isLoading);
  const showDeck = useRecallStore((state) => state.showDeck);
  const startReview = useRecallStore((state) => state.startReview);
  const [sortBy, setSortBy] = useState<"name" | "due" | "cards">("name");
  const [deckSearch, setDeckSearch] = useState("");
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
    }).filter((d) => !deckSearch || d.name.toLowerCase().includes(deckSearch.toLowerCase()));
  }, [decks, cards, sortBy, deckSearch]);

  const hasAnyContent = decks.length > 0;
  const dueCount = getDueTodayCount(cards);
  const greeting = useMemo(() => getGreeting(t), [t]);

  return (
    <div className="animate-fade-in space-y-8 sm:space-y-12">
      {/* ── Hero ── */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">{t("dashboard.subtitle")}</p>
          <h1 className="mt-2 font-display text-[1.75rem] font-bold leading-tight tracking-tight text-on-surface sm:text-[2rem]">
            {greeting}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-on-surface-variant">
            {dueCount > 0
              ? t("dashboard.cardsReady", { count: dueCount })
              : t("dashboard.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleStartReview} className="gap-2 min-h-[44px]" aria-label={t("deck.startReview")}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            {t("dashboard.startReview")}
          </Button>
          <DeckDialog
            trigger={
              <Button variant="outline" className="gap-2 min-h-[44px]" aria-label={t("deck.createNewDeck")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("dashboard.newDeck")}
              </Button>
            }
          />
          <AnkiImportDialog />
          <Button variant="outline" size="icon" onClick={() => setShowCsvImport(true)} title={t("dashboard.csvImport")} aria-label={t("deck.importFromCsv")} className="min-h-[44px] min-w-[44px]">
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <MarkdownImportDialog />
          <RecallImportDialog />
          <Button variant="outline" size="icon" onClick={() => setShowCustomStudy(true)} title={t("dashboard.customStudy")} aria-label={t("deck.customStudySession")} className="min-h-[44px] min-w-[44px]">
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

      {/* ── Bento grid: Level + Streak + Daily Goal ── */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-4">
          <LevelTile />
          <StreakWidget />
        </div>
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
        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
          <input
            type="text"
            value={deckSearch}
            onChange={(e) => setDeckSearch(e.target.value)}
            placeholder={t("dashboard.searchDecks")}
            className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            aria-label={t("dashboard.searchDecks")}
          />
        </div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">{t("dashboard.yourDecks")}</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-on-surface-variant">{t("dashboard.totalDecks", { count: decks.length })}</span>
            {/* Segmented sort */}
            <div className="flex rounded-md bg-surface-container-low p-0.5 dark:bg-surface-container" role="group" aria-label={t("dashboard.sortLabel")}>
              {(["name", "due", "cards"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  aria-pressed={sortBy === s}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-sm transition-colors",
                    sortBy === s
                      ? "bg-surface text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface",
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
              <div key={i} className={cardSurface("p-5 animate-pulse")}>
                <div className="h-4 w-28 rounded bg-surface-container-high dark:bg-surface-container-high mb-3" />
                <div className="h-3 w-44 rounded bg-surface-container-high dark:bg-surface-container-high mb-4" />
                <div className="h-2 rounded bg-surface-container-high dark:bg-surface-container-high mb-4" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 rounded bg-surface-container-high dark:bg-surface-container-high" />
                  <div className="h-10 rounded bg-surface-container-high dark:bg-surface-container-high" />
                  <div className="h-10 rounded bg-surface-container-high dark:bg-surface-container-high" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasAnyContent ? (
          <div className="flex flex-col items-center justify-center py-16 text-center sm:py-24">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-low">
              <Library className="h-8 w-8 text-on-surface-variant" />
            </div>
            <h3 className="font-headline text-xl font-bold tracking-tight text-on-surface">{t("dashboard.emptyTitle")}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">
              {t("dashboard.emptyDescription")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={() => setShowCreateDeck(true)} className="gap-2 min-h-[48px]">
                <Plus className="h-4 w-4" />
                {t("dashboard.createDeck")}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowCsvImport(true)} className="gap-2 min-h-[48px]">
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
// StreakWidget
// ═════════════════════════════════════════════

function StreakWidget(): JSX.Element {
  const { t } = useTranslation();
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const streak = useMemo(() => getStudyStreak(reviewLogs), [reviewLogs]);

  const flameColor =
    streak >= 30
      ? "text-review-hard"
      : streak >= 7
        ? "text-review-hard"
        : streak >= 3
          ? "text-secondary"
          : "text-on-surface-variant";

  return (
    <div className={cardSurface("flex flex-col items-center justify-center px-4 py-5")}>
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">{t("streak.title")}</span>
      <div className="mt-2 flex items-baseline gap-1">
        <Flame className={cn("h-5 w-5", flameColor)} />
        <span className={cn("text-3xl font-bold tabular-nums tracking-tight", flameColor)}>{streak}</span>
      </div>
      <span className="mt-1 text-xs text-on-surface-variant">
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
    <div className={cardSurface("px-4 py-5")}>
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">{t("level.label", { level })}</span>
      <div className="mt-1.5 font-headline text-lg font-bold tracking-tight text-on-surface">{title}</div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <div className="mt-1.5 text-xs text-on-surface-variant tabular-nums">{xp.toLocaleString()} XP</div>
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
    <section className={cardSurface("flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6")}>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex flex-col">
          <span className="text-2xl font-bold tabular-nums text-on-surface sm:text-3xl">
            {dueCount}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{t("todayBand.due")}</span>
        </div>
        <div className="h-10 w-px bg-outline-variant" />
        <div className="flex flex-col">
          <span className="text-2xl font-bold tabular-nums text-on-surface-variant sm:text-3xl">
            {newCount}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{t("todayBand.new")}</span>
        </div>
        <div className="h-10 w-px bg-outline-variant" />
        <div className="flex flex-col">
          <span className="text-2xl font-bold tabular-nums text-on-surface-variant sm:text-3xl">
            {reviewedToday}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{t("todayBand.reviewed")}</span>
        </div>
      </div>
      <Button
        size="lg"
        onClick={onStartReview}
        className="gap-2 min-h-[48px] w-full sm:w-auto"
        disabled={dueCount === 0}
        aria-label={t("deck.startReview")}
      >
        <RotateCw className="h-5 w-5" />
        {dueCount > 0 ? t("dashboard.startReviewCount", { count: dueCount }) : t("dashboard.allCaughtUp")}
      </Button>
    </section>
  );
}

// ═══════════════════════════════════════════════
// getGreeting — time-based greeting
// ═══════════════════════════════════════════════

function getGreeting(t: (key: string, opts?: Record<string, unknown>) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("dashboard.greetingMorning");
  if (hour < 17) return t("dashboard.greetingAfternoon");
  return t("dashboard.greetingEvening");
}