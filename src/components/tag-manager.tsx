import { useState, useMemo } from "react";
import { Tag, ChevronRight, ChevronDown, Search, Trash2, Edit3, X, Check } from "lucide-react";
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
            aria-label={isExpanded ? "Collapse" : "Expand"}
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
                aria-label="Rename tag"
              >
                <Edit3 className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDelete(node.fullPath)}
                className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                aria-label="Delete tag"
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
  const cards = useRecallStore((state) => state.cards);
  const updateCard = useRecallStore((state) => state.updateCard);
  const showBrowser = useRecallStore((state) => state.showBrowser);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
      toast.info("No cards with this tag");
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
    toast.success(`Renamed "${oldTag}" → "${newTag}" (${updated} cards)`);
    setSelectedTag(null);
  }

  async function handleDelete(tag: string): Promise<void> {
    const affectedCards = cards.filter((c) => c.tags.includes(tag));
    if (affectedCards.length === 0) {
      toast.info("No cards with this tag");
      return;
    }

    if (!confirm(`Remove tag "${tag}" from ${affectedCards.length} card(s)?`)) return;

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
    toast.success(`Removed "${tag}" from ${updated} card(s)`);
    if (selectedTag === tag) setSelectedTag(null);
  }

  // Expand all top-level by default
  useMemo(() => {
    if (expanded.size === 0) {
      setExpanded(new Set(tagTree.map((n) => n.fullPath)));
    }
  }, [tagTree, expanded.size]);

  const selectedCards = selectedTag ? getCardsInTagHierarchy(cards, selectedTag) : [];
  const totalTags = tagCounts.size;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Tags</h1>
        <p className="text-sm text-muted-foreground">
          {totalTags} tags · {cards.length} cards
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Tag tree */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {filteredTree.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Tag className="mx-auto h-8 w-8 mb-2 opacity-40" />
              {search ? "No matching tags" : "No tags yet — add tags to your cards!"}
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
                  <p className="text-xs text-muted-foreground">{selectedCards.length} cards</p>
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
                    +{selectedCards.length - 20} more
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    // Navigate to browser with tag filter
                    showBrowser();
                  }}
                >
                  View in Browser
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Click a tag to see its cards
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
