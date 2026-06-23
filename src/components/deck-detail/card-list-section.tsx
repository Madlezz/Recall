import { Search, Trash2, CheckSquare, Square, X, FileText, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CardDialog } from "@/components/card-dialog";
import { CardRow } from "./card-row";
import { cn } from "@/lib/utils";
import type { Card } from "@/types";

interface CardListSectionProps {
  deckId: string;
  filteredCards: Card[];
  deckCards: Card[];
  search: string;
  setSearch: (value: string) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  allTags: string[];
  selectedCardIds: Set<string>;
  toggleCardSelection: (cardId: string) => void;
  toggleSelectAll: () => void;
  onBulkDelete: () => Promise<void>;
  onBulkAdd: () => void;
}

export function CardListSection({
  deckId,
  filteredCards,
  deckCards,
  search,
  setSearch,
  selectedTag,
  setSelectedTag,
  allTags,
  selectedCardIds,
  toggleCardSelection,
  toggleSelectAll,
  onBulkDelete,
  onBulkAdd,
}: CardListSectionProps): JSX.Element {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cards</h2>
          <p className="text-sm text-muted-foreground">
            Search, edit, or move cards inside this deck.
          </p>
        </div>
        <div className="flex gap-2">
          <CardDialog
            deckId={deckId}
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Add Card
              </Button>
            }
          />
          <Button variant="outline" onClick={onBulkAdd}>
            <FileText className="h-4 w-4" />
            Bulk Add
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search cards"
        />
      </div>

      {/* Bulk selection bar */}
      {filteredCards.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={toggleSelectAll}>
            {selectedCardIds.size === filteredCards.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedCardIds.size === filteredCards.length ? "Deselect All" : "Select All"}
          </Button>
          {selectedCardIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedCardIds.size} selected
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete selected cards?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {selectedCardIds.size} card{selectedCardIds.size > 1 ? "s" : ""}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button variant="destructive" onClick={() => void onBulkDelete()}>
                        Delete
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      )}

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Filter by tag:</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
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
      )}

      {/* Card list / empty states */}
      {filteredCards.length === 0 ? (
        deckCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/30 px-6 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
              <BookOpen className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold">This deck is empty</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Add flashcards to start learning. Use the Add Card button above, or try Markdown and
              LaTeX for rich content.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/30 px-6 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
              <Search className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold">No matches</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Try a different search term or clear the tag filter.
            </p>
          </div>
        )
      ) : (
        <div className="grid gap-3">
          {filteredCards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              deckId={deckId}
              isSelected={selectedCardIds.has(card.id)}
              onToggle={toggleCardSelection}
            />
          ))}
        </div>
      )}
    </section>
  );
}
