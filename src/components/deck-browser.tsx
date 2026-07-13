import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeckCard } from "@/components/deck-card";
import { DeckDialog } from "@/components/deck-dialog";
import { getDueTodayCount, isCardDueToday } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { cardSurface } from "@/lib/surface";
import { useRecallStore } from "@/stores/recall-store";

type DeckFilter = "all" | "due" | "new" | "mastered";
type DeckSort = "name" | "due" | "cards";

export function DeckBrowser(): JSX.Element {
  const { t } = useTranslation();
  const decks = useRecallStore((state) => state.decks);
  const cards = useRecallStore((state) => state.cards);
  const showDeck = useRecallStore((state) => state.showDeck);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DeckFilter>("all");
  const [sortBy, setSortBy] = useState<DeckSort>("name");
  const [showCreateDeck, setShowCreateDeck] = useState(false);

  const deckStats = useMemo(() => {
    return new Map(
      decks.map((deck) => {
        const total = cards.filter((c) => c.deckId === deck.id).length;
        const due = getDueTodayCount(cards.filter((c) => c.deckId === deck.id));
        const mastered = cards.filter((c) => c.deckId === deck.id && c.state === "review" && !isCardDueToday(c)).length;
        return [deck.id, { total, due, mastered }] as const;
      }),
    );
  }, [decks, cards]);

  const filteredDecks = useMemo(() => {
    let result = decks.map((deck) => {
      const stats = deckStats.get(deck.id) ?? { total: 0, due: 0, mastered: 0 };
      return { deck, ...stats };
    });

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.deck.name.toLowerCase().includes(q) ||
          (d.deck.description ?? "").toLowerCase().includes(q),
      );
    }

    // Filter chip
    switch (filter) {
      case "due":
        result = result.filter((d) => d.due > 0);
        break;
      case "new":
        result = result.filter((d) => d.total > 0 && d.mastered === 0);
        break;
      case "mastered":
        result = result.filter((d) => d.total > 0 && d.due === 0 && d.total === d.mastered);
        break;
      // "all" — no filter
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "due":
          return b.due - a.due || a.deck.name.localeCompare(b.deck.name);
        case "cards":
          return b.total - a.total || a.deck.name.localeCompare(b.deck.name);
        default: // name
          return a.deck.name.localeCompare(b.deck.name);
      }
    });

    return result;
  }, [decks, deckStats, search, filter, sortBy]);

  const filters: { key: DeckFilter; label: string }[] = [
    { key: "all", label: t("deckBrowser.filterAll") },
    { key: "due", label: t("deckBrowser.filterDue") },
    { key: "new", label: t("deckBrowser.filterNew") },
    { key: "mastered", label: t("deckBrowser.filterMastered") },
  ];

  const sorts: { key: DeckSort; label: string }[] = [
    { key: "name", label: t("deckBrowser.sortName") },
    { key: "due", label: t("deckBrowser.sortDue") },
    { key: "cards", label: t("deckBrowser.sortCards") },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
            {t("deckBrowser.title")}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t("deckBrowser.count", { count: decks.length })}
          </p>
        </div>
        <Button onClick={() => setShowCreateDeck(true)} className="gap-2 min-h-[44px]">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("deckBrowser.newDeck")}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("deckBrowser.searchPlaceholder")}
          className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
          aria-label={t("deckBrowser.searchPlaceholder")}
        />
      </div>

      {/* Filter chips + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("deckBrowser.filterAria")}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                filter === f.key
                  ? "bg-primary text-on-primary"
                  : "bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container-low",
              )}
              aria-pressed={filter === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex rounded-lg border border-outline-variant p-0.5" role="group" aria-label={t("deckBrowser.sortAria")}>
          {sorts.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                sortBy === s.key
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
              aria-pressed={sortBy === s.key}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Deck grid */}
      {filteredDecks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDecks.map(({ deck }) => (
            <DeckCard key={deck.id} deck={deck} onOpen={() => showDeck(deck.id)} />
          ))}
          {/* Create deck card */}
          <button
            onClick={() => setShowCreateDeck(true)}
            className={cardSurface(
              "group flex min-h-[220px] flex-col items-center justify-center gap-3 border-2 border-dashed border-outline-variant p-6 text-center transition-colors hover:border-primary hover:bg-primary/5",
            )}
            aria-label={t("deckBrowser.newDeck")}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container group-hover:bg-primary-soft transition-colors">
              <Plus className="h-5 w-5 text-outline group-hover:text-primary transition-colors" aria-hidden="true" />
            </div>
            <span className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">
              {t("deckBrowser.newDeck")}
            </span>
          </button>
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <LayoutGrid className="mb-4 h-12 w-12 text-outline-variant" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-on-surface">{t("deckBrowser.emptyTitle")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("deckBrowser.emptyDesc")}</p>
          <Button onClick={() => setShowCreateDeck(true)} className="mt-4 gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("deckBrowser.newDeck")}
          </Button>
        </div>
      )}

      <DeckDialog open={showCreateDeck} onOpenChange={setShowCreateDeck} />
    </div>
  );
}