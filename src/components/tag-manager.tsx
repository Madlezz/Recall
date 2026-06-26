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
        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          editing ? "ring-1 ring-zinc-300 dark:ring-zinc-700" : ""
        }`}
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.fullPath)}
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label={isExpanded ? t("tagManager.collapse") : t("tagManager.expand")}
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Tag icon */}
        <Tag className="h-3.5 w-3.5 shrink-0 text-zinc-400" />

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
            <button onClick={handleSubmitRename} className="p-1 text-emerald-600 hover:text-emerald-700">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setEditing(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onTagClick(node.fullPath)}
              className="flex-1 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:underline"
            >
              {node.name}
            </button>

            {/* Count */}
            <span className="text-xs tabular-nums text-zinc-400">{node.count}</span>

            {/* Actions */}
            <div className="ml-1 hidden items-center gap-0.5 group-hover:flex">
              <button
                onClick={() => { setEditing(true); setEditValue(node.fullPath); }}
                className="p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 dark:hover:text-zinc-300 dark:hover:bg-zinc-700"
                aria-label={t("tagManager.renameTag")}
              >
                <Edit3 className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDelete(node.fullPath)}
                className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
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
    // Flatten tree and filter, then rebuild
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
        // skip
      }
    }
    toast.success(t("tagManager.renamedTag", { oldTag, newTag, count: updated }));
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
        // skip
      }
    }
    toast.success(t("tagManager.removedTag", { tag, count: updated }));
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">{t("tagManager.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("tagManager.tagStats", { tags: totalTags, cards: cards.length })}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("tagManager.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <Bookmark className="h-4 w-4" />
            {t("tagManager.savedSearches")}
          </h2>
          <div className="space-y-2">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="group flex items-center justify-between rounded-md border border-zinc-100 p-2 dark:border-zinc-800"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{search.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {search.tags.map((t) => (
                      <Badge key={t} tone="muted" className="text-[10px]">{t}</Badge>
                    ))}
                    <span className="text-[10px] text-muted-foreground">
                      {search.matchMode === "all" ? t("tagManager.allTags") : t("tagManager.anyTag")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStudySavedSearch(search)}
                    className="rounded p-1.5 text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950"
                    aria-label={t("tagManager.startStudy")}
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSavedSearch(search)}
                    className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
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
        {/* Tag tree */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {filteredTree.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Tag className="mx-auto h-8 w-8 mb-2 opacity-40" />
              {search ? t("tagManager.noMatchingTags") : t("tagManager.noTagsYet")}
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

        {/* Selected tag details */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {selectedTag ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{selectedTag}</h3>
                  <p className="text-xs text-muted-foreground">{t("tagManager.cardCount", { count: selectedCards.length })}</p>
                </div>
                <button
                  onClick={() => setSelectedTag(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Sample cards */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {selectedCards.slice(0, 20).map((card) => (
                  <div
                    key={card.id}
                    className="rounded-md border border-zinc-100 p-2 text-xs dark:border-zinc-800"
                  >
                    <div className="truncate text-zinc-700 dark:text-zinc-300">{card.front}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {card.tags.map((t) => (
                        <Badge key={t} tone="muted" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {selectedCards.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {t("tagManager.andMore", { count: selectedCards.length - 20 })}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
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

              {/* Save Search Dialog */}
              {showSaveDialog && (
                <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t("tagManager.saveAsSearchLabel", { tag: selectedTag })}
                  </div>
                  <Input
                    placeholder={t("tagManager.searchNamePlaceholder")}
                    value={newSearchName}
                    onChange={(e) => setNewSearchName(e.target.value)}
                    className="mb-2 h-8 text-xs"
                    autoFocus
                  />
                  <div className="mb-2 flex gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="radio"
                        name="matchMode"
                        value="all"
                        checked={newSearchMatchMode === "all"}
                        onChange={() => setNewSearchMatchMode("all")}
                      />
                      {t("tagManager.allTags")}
                    </label>
                    <label className="flex items-center gap-1 text-xs">
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
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("tagManager.clickTagToSee")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
