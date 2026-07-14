import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Flame, Library, Plus, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { DailyGoal } from "@/components/daily-goal";
import { DeckDialog } from "@/components/deck-dialog";
import { DeckCard } from "@/components/deck-card";
import { RecentActivity } from "@/components/recent-activity";
import { getStudyStreak, getDueTodayCount } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { cardSurface } from "@/lib/surface";
import { useRecallStore } from "@/stores/recall-store";

export function Dashboard(): JSX.Element {
  const { t } = useTranslation();
  const decks = useRecallStore((state) => state.decks);
  const cards = useRecallStore((state) => state.cards);
  const isLoading = useRecallStore((state) => state.isLoading);
  const showDeck = useRecallStore((state) => state.showDeck);
  const showDeckBrowser = useRecallStore((state) => state.showDeckBrowser);
  const startReview = useRecallStore((state) => state.startReview);
  const dueCount = getDueTodayCount(cards);

  const sortedDecks = useMemo(() => {
    const withStats = decks.map((deck) => {
      const deckCards = cards.filter((c) => c.deckId === deck.id);
      const due = deckCards.filter((c) => getDueForCard(c)).length;
      return { ...deck, dueCount: due, totalCards: deckCards.length, deckCards };
    });
    withStats.sort((a, b) => b.dueCount - a.dueCount);
    return withStats;
  }, [decks, cards]);

  const hasAnyContent = decks.length > 0;
  const greeting = useMemo(() => getGreeting(t), [t]);

  const handleStartReview = () => {
    const anyDue = cards.some((c) => isCardDue(c));
    if (!anyDue) {
      toast.info(t("dashboard.noCardsDue"));
      return;
    }
    startReview();
  };

  return (
    <div className="animate-fade-in max-w-[1152px] mx-auto px-gutter-mobile py-6">
      {/* ── Hero ── */}
      <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-text-primary sm:text-[2rem]">
            {greeting}
          </h1>
          <p className="font-body-lg text-body-lg text-text-secondary mt-2">
            {dueCount > 0
              ? t("dashboard.cardsReady", { count: dueCount })
              : t("dashboard.description")}
          </p>
        </div>
        <button
          onClick={handleStartReview}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all min-h-[48px] w-full md:w-auto justify-center"
          aria-label={t("deck.startReview")}
        >
          <RotateCw className="h-5 w-5" aria-hidden="true" />
          {t("dashboard.startReview")}
        </button>
      </section>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-12 gap-5">
        {/* Daily Progress — span 8 */}
        <div className="col-span-12 md:col-span-8">
          <DailyGoal variant="large" />
        </div>

        {/* Streak — span 4 */}
        <StreakWidget />

        {/* Your Decks header */}
        <div className="col-span-12 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-title-lg text-title-lg text-text-primary">
              {t("dashboard.yourDecks")}
            </h2>
            <button
              onClick={showDeckBrowser}
              className="text-primary font-label-lg text-label-lg flex items-center gap-1 hover:underline"
            >
              {t("dashboard.viewAll")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Deck Cards */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={cardSurface("p-5 animate-pulse")}>
                <div className="h-4 w-28 bg-surface-container-high mb-3 rounded" />
                <div className="h-3 w-44 bg-surface-container-high mb-4 rounded" />
                <div className="h-2 bg-surface-container-high rounded" />
              </div>
            ))
          ) : !hasAnyContent ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low">
                <Library className="h-8 w-8 text-on-surface-variant" />
              </div>
              <h3 className="font-headline text-xl font-bold tracking-tight text-on-surface">
                {t("dashboard.emptyTitle")}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">
                {t("dashboard.emptyDescription")}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <DeckDialog
                  trigger={
                    <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all min-h-[48px]">
                      <Plus className="h-4 w-4" />
                      {t("dashboard.createDeck")}
                    </button>
                  }
                />
              </div>
            </div>
          ) : (
            sortedDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} onOpen={() => showDeck(deck.id)} />
            ))
          )}

          {/* Create New Deck — dashed card */}
          {hasAnyContent && !isLoading && (
            <DeckDialog
              trigger={
                <button
                  className={cn(
                    "bg-background border-2 border-dashed border-outline-variant",
                    "p-5 rounded-2xl flex flex-col items-center justify-center text-center",
                    "hover:bg-surface-container-low transition-colors cursor-pointer group",
                    "min-h-[200px]",
                  )}
                  aria-label={t("deck.createNewDeck")}
                >
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center mb-3 text-outline group-hover:text-primary group-hover:border-primary transition-all">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="font-label-lg text-label-lg text-outline group-hover:text-primary transition-colors">
                    {t("deck.createNewDeck")}
                  </p>
                </button>
              }
            />
          )}
        </div>

        {/* Recent Activity */}
        <div className="col-span-12 mt-6">
          <RecentActivity />
        </div>
      </div>
    </div>

  );
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function getDueForCard(c: { state: string }): boolean {
  return c.state === "review" || c.state === "learning" || c.state === "relearning";
}

function isCardDue(c: { state: string }): boolean {
  return getDueForCard(c);
}

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("dashboard.greetingMorning");
  if (hour < 17) return t("dashboard.greetingAfternoon");
  return t("dashboard.greetingEvening");
}

// ═══════════════════════════════════════════════
// StreakWidget
// ═══════════════════════════════════════════════

function StreakWidget(): JSX.Element {
  const { t } = useTranslation();
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const streak = useMemo(() => getStudyStreak(reviewLogs), [reviewLogs]);

  return (
    <div className="col-span-12 md:col-span-4 bg-primary-soft p-6 rounded-2xl border border-primary/10 flex flex-col justify-center items-center text-center">
      <div className="bg-white/40 dark:bg-white/10 p-4 rounded-full mb-4">
        <Flame className="h-9 w-9 text-primary" />
      </div>
      <h3 className="font-headline-mobile text-[1.5rem] font-bold leading-8 tracking-tight text-primary">
        {streak} {streak === 1 ? t("streak.oneDay") : t("streak.days", { count: streak })}
      </h3>
      <p className="font-label-lg text-label-lg text-on-primary-fixed-variant mt-1">
        {t("streak.title")}
      </p>
    </div>
  );
}