import { ArrowUpDown, ChevronLeft, ChevronRight, ExternalLink, Filter, PackageOpen, Search, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/confirm-action";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCardBrowser, type SortField, type SortDir, STATE_LABELS, STATE_COLORS } from "./use-card-browser";
import { useRecallStore } from "@/stores/recall-store";
import { useState, useEffect } from "react";

const PAGE_SIZE = 50;

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `in ${diffDays}d`;
}

interface SortHeaderProps {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onClick: (field: SortField) => void;
}

function SortHeader({ field, label, current, dir, onClick }: SortHeaderProps): JSX.Element {
  const active = current === field;
  return (
    <th
      className={cn(
        "cursor-pointer select-none px-3 py-2 text-left text-xs font-medium transition-colors hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
      onClick={() => onClick(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          <ArrowUpDown className={cn("h-3 w-3", dir === "desc" && "rotate-180")} />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

export function CardBrowser(): JSX.Element {
  const {
    cards,
    decks,
    deckMap,
    filtered,
    search,
    deckFilter,
    stateFilter,
    sortField,
    sortDir,
    selected,
    bulkTagInput,
    bulkTagMode,
    showBulkTag,
    setSearch,
    setDeckFilter,
    setStateFilter,
    toggleSelect,
    selectAll,
    clearSelection,
    handleSort,
    clearFilters,
    setBulkTagInput,
    setBulkTagMode,
    setShowBulkTag,
    deleteCard,
    moveCard,
    updateCard,
  } = useCardBrowser();
  const showDeck = useRecallStore((s) => s.showDeck);
  const [page, setPage] = useState(0);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, deckFilter, stateFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedCards = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  async function bulkDelete() {
    const ids = [...selected];
    for (const id of ids) {
      try {
        await deleteCard(id);
      } catch {
        // continue
      }
    }
    toast.success(`Deleted ${ids.length} card(s)`);
    clearSelection();
  }

  async function bulkMove(deckId: string) {
    const ids = [...selected];
    let moved = 0;
    for (const id of ids) {
      try {
        await moveCard(id, deckId);
        moved++;
      } catch {
        // skip
      }
    }
    if (moved > 0) {
      const name = deckMap.get(deckId)?.name ?? deckId;
      toast.success(`Moved ${moved} card(s) to ${name}`);
    }
    clearSelection();
  }

  async function applyBulkTags() {
    const tags = bulkTagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0 && bulkTagMode !== "remove") return;

    const ids = [...selected];
    let updated = 0;
    for (const id of ids) {
      const card = cards.find((c) => c.id === id);
      if (!card) continue;
      try {
        let newTags: string[];
        if (bulkTagMode === "add") {
          newTags = [...new Set([...card.tags, ...tags])];
        } else if (bulkTagMode === "set") {
          newTags = tags;
        } else {
          const removeSet = new Set(tags);
          newTags = card.tags.filter((t) => !removeSet.has(t));
        }
        await updateCard(id, { deckId: card.deckId, front: card.front, back: card.back, hint: card.hint, source: card.source, tags: newTags });
        updated++;
      } catch {
        // skip
      }
    }
    const verb = bulkTagMode === "remove" ? "Untagged" : "Tagged";
    toast.success(`${verb} ${updated} card(s)`);
    setShowBulkTag(false);
    setBulkTagInput("");
    setBulkTagMode("add");
    clearSelection();
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Card Browser</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {cards.length} cards
            {selected.size > 0 && <> · {selected.size} selected</>}
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search front, back, hint, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={deckFilter} onValueChange={setDeckFilter}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder="All decks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All decks</SelectItem>
            {decks.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="learning">Learning</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="relearning">Relearning</SelectItem>
          </SelectContent>
        </Select>

        {(search || deckFilter !== "all" || stateFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/40 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <ConfirmAction
              title="Delete selected cards?"
              description={`This will permanently delete ${selected.size} card(s) and their review history.`}
              actionLabel="Delete"
              triggerLabel={`Delete (${selected.size})`}
              destructive
              onConfirm={bulkDelete}
            />

            <Select onValueChange={bulkMove}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Move to deck..." />
              </SelectTrigger>
              <SelectContent>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showBulkTag ? (
              <div className="flex items-center gap-1">
                <Select value={bulkTagMode} onValueChange={(v) => setBulkTagMode(v as "add" | "set" | "remove")}>
                  <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="remove">Remove</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder={bulkTagMode === "remove" ? "tag to remove..." : "tag1, tag2..."}
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  className="h-8 w-40 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void applyBulkTags();
                    if (e.key === "Escape") { setShowBulkTag(false); setBulkTagInput(""); }
                  }}
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={() => void applyBulkTags()}>Apply</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowBulkTag(true)}>
                <Tag className="mr-1 h-3.5 w-3.5" /> Tag
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="mr-1 h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={selectAll}
                  className="h-4 w-4 rounded border-muted-foreground/30"
                />
              </th>
              <SortHeader field="front" label="Front" current={sortField} dir={sortDir} onClick={handleSort} />
              <SortHeader field="deck" label="Deck" current={sortField} dir={sortDir} onClick={handleSort} />
              <SortHeader field="state" label="State" current={sortField} dir={sortDir} onClick={handleSort} />
              <SortHeader field="nextReview" label="Next Review" current={sortField} dir={sortDir} onClick={handleSort} />
              <SortHeader field="lapses" label="Lapses" current={sortField} dir={sortDir} onClick={handleSort} />
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Tags</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-16 text-center">
                  <div className="mx-auto max-w-sm space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
                      {cards.length === 0 ? (
                        <PackageOpen className="h-6 w-6 text-muted-foreground/60" />
                      ) : (
                        <Search className="h-6 w-6 text-muted-foreground/60" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {cards.length === 0
                        ? "No cards yet — create a deck and add some cards to get started."
                        : "No cards match your current filters."}
                    </p>
                    {(search || deckFilter !== "all" || stateFilter !== "all") && (
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedCards.map((card) => {
                const deck = deckMap.get(card.deckId);
                const isSelected = selected.has(card.id);
                return (
                  <tr key={card.id} className={cn("border-b transition-colors hover:bg-muted/30", isSelected && "bg-primary/5")}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelect(card.id, e.nativeEvent instanceof MouseEvent && (e.nativeEvent as MouseEvent).shiftKey)}
                        className="h-4 w-4 rounded border-muted-foreground/30"
                      />
                    </td>
                    <td className="max-w-xs px-3 py-2">
                      <div className="truncate font-medium">{card.front || <span className="italic text-muted-foreground">(empty)</span>}</div>
                      <div className="truncate text-xs text-muted-foreground">{card.back || <span className="italic">(empty)</span>}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {deck ? (
                        <button className="text-primary hover:underline text-xs" onClick={() => showDeck(deck.id)}>
                          {deck.name}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap"><Badge tone="warning" className={cn("text-xs", STATE_COLORS[card.state])}>{STATE_LABELS[card.state]}</Badge></td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{formatDate(card.nextReviewDate)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {card.lapses > 0 ? (
                        <span className={card.lapses >= 5 ? "font-semibold text-destructive" : "text-muted-foreground"}>{card.lapses}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {card.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} tone="muted" className="text-xs">{tag}</Badge>
                        ))}
                        {card.tags.length > 3 && <span className="text-xs text-muted-foreground">+{card.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        aria-label={`Open deck for card ${card.id}`}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={() => showDeck?.(card.deckId)}
                        title="Open deck"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {currentPage * PAGE_SIZE + 1} to {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} cards
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="text-sm tabular-nums">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}