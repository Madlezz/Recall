import { Beaker, Hash, Library, Play, Tag, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecallStore } from "@/stores/recall-store";

interface CustomStudyDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pre-select a deck (e.g., when opened from a deck detail page) */
  deckId?: string | null;
}

export function CustomStudyDialog({ open, onClose, deckId }: CustomStudyDialogProps): JSX.Element {
  const { t } = useTranslation();
  const decks = useRecallStore((s) => s.decks);
  const cards = useRecallStore((s) => s.cards);
  const startCustomStudy = useRecallStore((s) => s.startCustomStudy);

  const [selectedDeck, setSelectedDeck] = useState<string>(deckId ?? "all");
  const [cardCount, setCardCount] = useState<string>("20");
  const [tagFilter, setTagFilter] = useState("");
  const [newOnly, setNewOnly] = useState(false);

  // Available tags in the selected deck
  const availableTags = useMemo(() => {
    const pool = selectedDeck === "all"
      ? cards
      : cards.filter((c) => c.deckId === selectedDeck);
    const tagSet = new Set<string>();
    for (const c of pool) {
      for (const t of c.tags) tagSet.add(t);
    }
    return [...tagSet].sort();
  }, [cards, selectedDeck]);

  // Eligible card count preview
  const eligibleCount = useMemo(() => {
    let pool = selectedDeck === "all"
      ? cards
      : cards.filter((c) => c.deckId === selectedDeck);
    if (tagFilter) {
      const tag = tagFilter.toLowerCase();
      pool = pool.filter((c) => c.tags.some((t) => t.toLowerCase() === tag));
    }
    if (newOnly) {
      pool = pool.filter((c) => c.state === "new");
    }
    return pool.length;
  }, [cards, selectedDeck, tagFilter, newOnly]);

  const count = parseInt(cardCount, 10);
  const clamped = Number.isFinite(count) && count > 0
    ? Math.min(count, eligibleCount)
    : eligibleCount;

  function handleStart(): void {
    const started = startCustomStudy({
      deckId: selectedDeck === "all" ? null : selectedDeck,
      count: clamped > 0 ? clamped : undefined,
      tagFilter: tagFilter || undefined,
      newOnly,
    });
    if (!started) {
      const reason = eligibleCount === 0
        ? t("customStudy.noCardsMatchFilters")
        : newOnly && eligibleCount === 0
          ? t("customStudy.noNewCards")
          : t("customStudy.couldNotStart");
      toast.info(reason);
      return;
    }
    onClose();
  }

  // Reset when opened with a specific deck
  function handleOpenChange(isOpen: boolean): void {
    if (isOpen && deckId) {
      setSelectedDeck(deckId);
    }
    if (!isOpen) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            {t("customStudy.title")}
          </DialogTitle>
          <DialogDescription>
            {t("customStudy.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Deck */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Library className="h-3.5 w-3.5" />
              {t("customStudy.deckLabel")}
            </Label>
            <Select value={selectedDeck} onValueChange={setSelectedDeck}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("customStudy.allDecks")}</SelectItem>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Card count */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Hash className="h-3.5 w-3.5" />
              {t("customStudy.cardCountLabel")}
            </Label>
            <Input
              type="number"
              min={1}
              max={eligibleCount || 999}
              value={cardCount}
              onChange={(e) => setCardCount(e.target.value)}
              placeholder={t("customStudy.allPlaceholder")}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("customStudy.allCardsHint")}
              {eligibleCount > 0 && (
                <span className="ml-1 text-zinc-900 dark:text-zinc-100">{t("customStudy.available", { count: eligibleCount })}</span>
              )}
            </p>
          </div>

          {/* Tag filter */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Tag className="h-3.5 w-3.5" />
              {t("customStudy.filterByTag")} <span className="text-zinc-500 dark:text-zinc-400">{t("customStudy.optional")}</span>
            </Label>
            {availableTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTagFilter(tag === tagFilter ? "" : tag)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                      tagFilter === tag
                        ? "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                    }`}
                  >
                    {tag}
                    {tagFilter === tag && <X className="ml-1 inline h-3 w-3" />}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("customStudy.noTags")}</p>
            )}
          </div>

          {/* New only */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newOnly}
              onChange={(e) => setNewOnly(e.target.checked)}
              className="h-4 w-4 rounded border-muted-foreground/30"
            />
            <span className="text-sm">{t("customStudy.newCardsOnly")}</span>
          </label>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {eligibleCount > 0
              ? t("customStudy.cardsWillBePicked", { count: Math.min(clamped, eligibleCount) })
              : t("customStudy.noCardsMatch")}
          </p>
          <Button onClick={handleStart} disabled={eligibleCount === 0}>
            <Play className="mr-1.5 h-4 w-4" />
            {t("customStudy.start")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
