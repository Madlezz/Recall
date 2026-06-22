import type { Card } from "@/types";

/**
 * Parse tag hierarchy (parent::child::grandchild format like Anki).
 * Returns array of path segments.
 */
export function parseTagHierarchy(tag: string): string[] {
  return tag.split("::").map((s) => s.trim()).filter(Boolean);
}

/**
 * Get the display name (last segment) of a hierarchical tag.
 */
export function getTagDisplayName(tag: string): string {
  const parts = parseTagHierarchy(tag);
  return parts[parts.length - 1] ?? tag;
}

/**
 * Get the parent tag, or null if top-level.
 */
export function getParentTag(tag: string): string | null {
  const parts = parseTagHierarchy(tag);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join("::");
}

/**
 * Get the depth level of a tag (0 = top-level).
 */
export function getTagDepth(tag: string): number {
  return parseTagHierarchy(tag).length - 1;
}

/**
 * Build a map of tag -> card count from all cards.
 */
export function buildTagCounts(cards: Card[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    for (const tag of card.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Build a hierarchical tree structure from flat tag list.
 */
export interface TagNode {
  name: string;
  fullPath: string;
  count: number;
  children: TagNode[];
  depth: number;
}

export function buildTagTree(tagCounts: Map<string, number>): TagNode[] {
  const root: TagNode[] = [];
  const nodeMap = new Map<string, TagNode>();

  // Sort tags to ensure parents come before children
  const sortedTags = [...tagCounts.keys()].sort();

  for (const tag of sortedTags) {
    const parts = parseTagHierarchy(tag);
    const count = tagCounts.get(tag) ?? 0;

    let currentPath = "";
    let parentChildren = root;

    for (let i = 0; i < parts.length; i++) {
      currentPath = currentPath ? `${currentPath}::${parts[i]}` : parts[i];
      
      let node = nodeMap.get(currentPath);
      if (!node) {
        node = {
          name: parts[i],
          fullPath: currentPath,
          count: i === parts.length - 1 ? count : 0,
          children: [],
          depth: i,
        };
        nodeMap.set(currentPath, node);
        parentChildren.push(node);
      } else if (i === parts.length - 1) {
        // Update count for leaf node
        node.count = count;
      }

      parentChildren = node.children;
    }
  }

  return root;
}

/**
 * Get all cards with a specific tag (exact match).
 */
export function getCardsWithTag(cards: Card[], tag: string): Card[] {
  return cards.filter((c) => c.tags.includes(tag));
}

/**
 * Get all cards matching any tag in a hierarchy (tag or its children).
 */
export function getCardsInTagHierarchy(cards: Card[], parentTag: string): Card[] {
  return cards.filter((c) =>
    c.tags.some((t) => t === parentTag || t.startsWith(`${parentTag}::`))
  );
}

/**
 * Rename a tag across all cards.
 */
export function renameTagInCards(cards: Card[], oldTag: string, newTag: string): Card[] {
  return cards.map((card) => ({
    ...card,
    tags: card.tags.map((t) => (t === oldTag ? newTag : t)),
  }));
}

/**
 * Validate tag name (no empty, no leading/trailing ::, no consecutive ::).
 */
export function isValidTag(tag: string): boolean {
  if (!tag.trim()) return false;
  if (tag.startsWith("::") || tag.endsWith("::")) return false;
  if (tag.includes("::::")) return false;
  return true;
}

/**
 * Normalize tag (trim, collapse multiple :: to single ::).
 */
export function normalizeTag(tag: string): string {
  return tag
    .trim()
    .replace(/:{3,}/g, "::")
    .split("::")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("::");
}
