import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Tag, ChevronRight, ChevronDown, Search, Trash2, Edit3, X, Check, Bookmark, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRecallStore } from "@/stores/recall-store";
import {
  buildTagCounts,
  buildTagTree,
  type TagNode,
  getCardsInTagHierarchy,
  renameTagInCards,
  normalizeTag,
  isValidTag,
} from "@/lib/tags";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { cardSurface, softSurface, typeClass } from "@/lib/surface";
import type { SavedSearch } from "@/stores/slices/saved-search.slice";

function TreeNode({
  node,
  onTagClick,
  onRename,
  onDelete,
  expanded,
  onToggle,
}: {
  node: TagNode;
  onTagClick: (tag: string) => void;
  onRename: (oldTag: string, newTag: string) => void;
  onDelete: (tag: string) => void;
  expanded: Set<string>;
  onToggle: (tag: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.fullPath);
  const isExpanded = expanded.has(node.fullPath);
  const hasChildren = node.children.length > 0;

  function handleSubmitRename(): void {
    const normalized = normalizeTag(editValue);
    if (normalized && normalized !== node.fullPath && isValidTag(normalized)) {
      onRename(node.fullPath, normalized);
    }
    setEditing(false);
  }

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-container-high",
          editing && "ring-1 ring-outline-variant",
        )}
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.fullPath)}
            className="flex h-5 w-5 items-center justify-center rounded text-on-surface-variant hover:text-text-primary transition-colors"
            aria-label={isExpanded ? t("tagManager.collapse") : t("tagManager.expand")}
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Tag icon */}
        <Tag className="h-3.5 w-3.5 shrink-0 text-on-surface-variant" />

        {/* Name */}
        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitRename();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-7 text-xs flex-1"
              autoFocus
            />
            <button
              onClick={handleSubmitRename}
              className="rounded-full p-1 text-review-easy hover:bg-review-easy/10 transition-colors"
              aria-label={t("tagManager.confirmRename")}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high transition-colors"
              aria-label={t("tagManager.cancelRename")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onTagClick(node.fullPath)}
              className="flex-1 text-left text-sm text-text-secondary hover:underline"
            >
              {node.name}
            </button>

            {/* Count — stitch chip pattern */}
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs tabular-nums",
              "bg-surface-container-high text-on-surface-variant",
            )}>
              {node.count}
            </span>

            {/* Actions — stitch icon button pattern */}
            <div className="ml-1 hidden items-center gap-0.5 group-hover:flex">
              <button
                onClick={() => { setEditing(true); setEditValue(node.fullPath); }}
                className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high transition-colors"
                aria-label={t("tagManager.renameTag")}
              >
                <Edit3 className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDelete(node.fullPath)}
                className="rounded-full p-1 text-on-surface-variant hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={t("tagManager.deleteTag")}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.fullPath}
              node={child}
              onTagClick={onTagClick}
              onRename={onRename}
              onDelete={onDelete}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TagManager(): JSX.Element {
  const { t } = useTranslation();
  const cards = useRecallStore((state) => state.cards);
  const updateCard = useRecallStore((state) => state.updateCard);
  const showBrowser = useRecallStore((state) => state.showBrowser);
  const savedSearches = useRecallStore((state) => state.savedSearches);
  const addSavedSearch = useRecallStore((state) => state.addSavedSearch);
  const removeSavedSearch = useRecallStore((state) => state.removeSavedSearch);
  const startCustomStudy = useRecallStore((state) => state.startCustomStudy);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newSearchName, setNewSearchName] = useState("");
  const [newSearchMatchMode, setNewSearchMatchMode] = useState<"all" | "any">("all");

  const tagCounts = useMemo(() => buildTagCounts(cards), [cards]);
  const tagTree = useMemo(() => buildTagTree(tagCounts), [tagCounts]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tagTree;
    const q = search.toLowerCase();
    const allTags = [...tagCounts.keys()].filter((t) => t.toLowerCase().includes(q));
    const filteredCounts = new Map(allTags.map((t) => [t, tagCounts.get(t) ?? 0]));
    return buildTagTree(filteredCounts);
  }, [tagTree, tagCounts, search]);

  function toggle(tag: string): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function handleTagClick(tag: string): void {
    setSelectedTag(tag === selectedTag ? null : tag);
  }

  async function handleRename(oldTag: string, newTag: string): Promise<void> {
    const affectedCards = cards.filter((c) => c.tags.includes(oldTag));
    if (affectedCards.length === 0) {
      toast.info(t("tagManager.noCardsWithTag"));
      return;
    }

    const renamedCards = renameTagInCards(affectedCards, oldTag, newTag);
    let updated = 0;
    const failed: string[] = [];
    for (const card of renamedCards) {
      try {
        await updateCard(card.id, {
          deckId: card.deckId,
          front: card.front,
          back: card.back,
          hint: card.hint,
          source: card.source,
          tags: card.tags,
        });
        updated++;
      } catch {
        failed.push(card.id);
      }
    }
    if (failed.length === 0) {
      toast.success(t("tagManager.renamedTag", { oldTag, newTag, count: updated }));
    } else {
      toast.warning(t("tagManager.renamedTagPartial", { oldTag, newTag, count: updated, total: affectedCards.length, failed: failed.length }));
    }
    setSelectedTag(null);
  }

  async function handleDelete(tag: string): Promise<void> {
    const affectedCards = cards.filter((c) => c.tags.includes(tag));
    if (affectedCards.length === 0) {
      toast.info(t("tagManager.noCardsWithTag"));
      return;
    }

    if (!confirm(t("tagManager.confirmRemoveTag", { tag, count: affectedCards.length }))) return;

    let updated = 0;
    const failed: string[] = [];
    for (const card of affectedCards) {
      try {
        await updateCard(card.id, {
          deckId: card.deckId,
          front: card.front,
          back: card.back,
          hint: card.hint,
          source: card.source,
          tags: card.tags.filter((t) => t !== tag),
        });
        updated++;
      } catch {
        failed.push(card.id);
      }
    }
    if (failed.length === 0) {
      toast.success(t("tagManager.removedTag", { tag, count: updated }));
    } else {
      toast.warning(t("tagManager.removedTagPartial", { tag, count: updated, total: affectedCards.length, failed: failed.length }));
    }
    if (selectedTag === tag) setSelectedTag(null);
  }

  // Expand all top-level by default (only once on mount)
  useEffect(() => {
    if (expanded.size === 0 && tagTree.length > 0) {
      setExpanded(new Set(tagTree.map((n) => n.fullPath)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on initial load
  }, [tagTree]);

  function handleSaveSearch(): void {
    if (!selectedTag || !newSearchName.trim()) {
      toast.error(t("tagManager.enterSearchName"));
      return;
    }
    addSavedSearch(newSearchName.trim(), [selectedTag], newSearchMatchMode);
    toast.success(t("tagManager.savedSearchSaved", { name: newSearchName.trim() }));
    setNewSearchName("");
    setNewSearchMatchMode("all");
    setShowSaveDialog(false);
  }

  function handleStudySavedSearch(search: SavedSearch): void {
    const result = startCustomStudy({
      tags: search.tags,
      matchMode: search.matchMode,
      count: 50,
    });
    if (!result) {
      toast.error(t("tagManager.noCardsMatchSearch"));
    }
  }

  function handleDeleteSavedSearch(search: SavedSearch): void {
    if (!confirm(t("tagManager.confirmDeleteSearch", { name: search.name }))) return;
    removeSavedSearch(search.id);
    toast.success(t("tagManager.searchDeleted", { name: search.name }));
  }

  const selectedCards = selectedTag ? getCardsInTagHierarchy(cards, selectedTag) : [];
  const totalTags = tagCounts.size;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header — stitch pattern */}
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-text-primary">{t("tagManager.title")}</h1>
        <p className={cn(typeClass["body-md"], "text-on-surface-variant")}>
          {t("tagManager.tagStats", { tags: totalTags, cards: cards.length })}
        </p>
        <p className={cn(typeClass.caption, "mt-1 text-on-surface-variant")}>
          {t("tagManager.hierarchyHint")}
        </p>
      </div>

      {/* Search — stitch pattern */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          placeholder={t("tagManager.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Saved Searches — stitch card pattern */}
      {savedSearches.length > 0 && (
        <div className={cardSurface("p-md")}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Bookmark className="h-4 w-4" />
            {t("tagManager.savedSearches")}
          </h2>
          <div className="space-y-2">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className={cn(
                  "group flex items-center justify-between rounded-md border border-outline-variant p-2",
                  "hover:bg-surface-container-low transition-colors",
                )}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-secondary">{search.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {search.tags.map((t) => (
                      <Badge key={t} tone="muted" className="text-[10px]">{t}</Badge>
                    ))}
                    <span className="text-[10px] text-on-surface-variant">
                      {search.matchMode === "all" ? t("tagManager.allTags") : t("tagManager.anyTag")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStudySavedSearch(search)}
                    className="rounded-full p-1.5 text-on-surface-variant hover:bg-review-easy/10 hover:text-review-easy transition-colors"
                    aria-label={t("tagManager.startStudy")}
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSavedSearch(search)}
                    className="rounded-full p-1.5 text-on-surface-variant hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label={t("tagManager.deleteSavedSearch")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Tag tree — stitch card pattern */}
        <div className={cardSurface("p-md")}>
          {filteredTree.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low">
                <Tag className="h-5 w-5 text-on-surface-variant" />
              </div>
              <p className={cn(typeClass["body-md"], "text-on-surface-variant")}>
                {search ? t("tagManager.noMatchingTags") : t("tagManager.noTagsYet")}
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredTree.map((node) => (
                <TreeNode
                  key={node.fullPath}
                  node={node}
                  onTagClick={handleTagClick}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  expanded={expanded}
                  onToggle={toggle}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Selected tag details — stitch card pattern */}
        <div className={cardSurface("p-md")}>
          {selectedTag ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{selectedTag}</h3>
                  <p className={cn(typeClass.caption, "text-on-surface-variant")}>
                    {t("tagManager.cardCount", { count: selectedCards.length })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTag(null)}
                  className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  aria-label={t("tagManager.close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Sample cards — stitch soft surface */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {selectedCards.slice(0, 20).map((card) => (
                  <div key={card.id} className={softSurface("p-2 rounded-md")}>
                    <div className="truncate text-xs text-text-secondary">{card.front}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {card.tags.map((t) => (
                        <Badge key={t} tone="muted" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {selectedCards.length > 20 && (
                  <p className={cn(typeClass.caption, "text-center text-on-surface-variant")}>
                    {t("tagManager.andMore", { count: selectedCards.length - 20 })}
                  </p>
                )}
              </div>

              {/* Actions — stitch border divider */}
              <div className="mt-3 pt-3 border-t border-outline-variant space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    showBrowser();
                  }}
                >
                  {t("tagManager.viewInBrowser")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowSaveDialog(true)}
                >
                  <Bookmark className="mr-1.5 h-3 w-3" />
                  {t("tagManager.saveAsSearch")}
                </Button>
              </div>

              {/* Save Search Dialog — stitch card pattern */}
              {showSaveDialog && (
                <div className={cn(cardSurface("p-md"), "mt-3")}>
                  <div className={cn(typeClass.caption, "mb-2 text-text-secondary")}>
                    {t("tagManager.saveAsSearchLabel", { tag: selectedTag })}
                  </div>
                  <Input
                    placeholder={t("tagManager.searchNamePlaceholder")}
                    value={newSearchName}
                    onChange={(e) => setNewSearchName(e.target.value)}
                    className="mb-2 h-8 text-xs rounded-xl"
                    autoFocus
                  />
                  <div className="mb-2 flex gap-2">
                    <label className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <input
                        type="radio"
                        name="matchMode"
                        value="all"
                        checked={newSearchMatchMode === "all"}
                        onChange={() => setNewSearchMatchMode("all")}
                      />
                      {t("tagManager.allTags")}
                    </label>
                    <label className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <input
                        type="radio"
                        name="matchMode"
                        value="any"
                        checked={newSearchMatchMode === "any"}
                        onChange={() => setNewSearchMatchMode("any")}
                      />
                      {t("tagManager.anyTag")}
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveSearch} className="flex-1">
                      {t("tagManager.save")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowSaveDialog(false);
                        setNewSearchName("");
                      }}
                    >
                      {t("tagManager.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low">
                <Tag className="h-5 w-5 text-on-surface-variant" />
              </div>
              <p className={cn(typeClass["body-md"], "text-on-surface-variant")}>
                {t("tagManager.clickTagToSee")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}