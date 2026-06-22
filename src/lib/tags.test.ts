import { describe, it, expect } from "vitest";
import {
  parseTagHierarchy,
  getTagDisplayName,
  getParentTag,
  getTagDepth,
  buildTagCounts,
  buildTagTree,
  getCardsWithTag,
  getCardsInTagHierarchy,
  renameTagInCards,
  isValidTag,
  normalizeTag,
} from "./tags";
import type { Card } from "@/types";

function makeCard(overrides: Partial<Card> = {}): Card {
  const now = new Date().toISOString();
  return {
    id: "card-1",
    deckId: "deck-1",
    front: "Q",
    back: "A",
    hint: "",
    source: "",
    tags: [],
    cardType: "basic",
    state: "new",
    lastReviewDate: null,
    nextReviewDate: now,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("tags", () => {
  describe("parseTagHierarchy", () => {
    it("parses simple tag", () => {
      expect(parseTagHierarchy("spanish")).toEqual(["spanish"]);
    });

    it("parses hierarchical tag", () => {
      expect(parseTagHierarchy("language::spanish::verbs")).toEqual([
        "language",
        "spanish",
        "verbs",
      ]);
    });

    it("handles whitespace", () => {
      expect(parseTagHierarchy("a :: b :: c")).toEqual(["a", "b", "c"]);
    });
  });

  describe("getTagDisplayName", () => {
    it("returns simple tag as-is", () => {
      expect(getTagDisplayName("spanish")).toBe("spanish");
    });

    it("returns last segment of hierarchy", () => {
      expect(getTagDisplayName("language::spanish::verbs")).toBe("verbs");
    });
  });

  describe("getParentTag", () => {
    it("returns null for top-level tag", () => {
      expect(getParentTag("spanish")).toBeNull();
    });

    it("returns parent for nested tag", () => {
      expect(getParentTag("language::spanish::verbs")).toBe("language::spanish");
    });
  });

  describe("getTagDepth", () => {
    it("returns 0 for top-level", () => {
      expect(getTagDepth("spanish")).toBe(0);
    });

    it("returns correct depth", () => {
      expect(getTagDepth("language::spanish::verbs")).toBe(2);
    });
  });

  describe("buildTagCounts", () => {
    it("counts tags across cards", () => {
      const cards = [
        makeCard({ id: "1", tags: ["spanish", "verbs"] }),
        makeCard({ id: "2", tags: ["spanish"] }),
        makeCard({ id: "3", tags: ["german"] }),
      ];
      const counts = buildTagCounts(cards);
      expect(counts.get("spanish")).toBe(2);
      expect(counts.get("verbs")).toBe(1);
      expect(counts.get("german")).toBe(1);
    });

    it("handles empty cards", () => {
      expect(buildTagCounts([]).size).toBe(0);
    });
  });

  describe("buildTagTree", () => {
    it("builds hierarchical tree", () => {
      const counts = new Map([
        ["language::spanish", 5],
        ["language::spanish::verbs", 3],
        ["language::german", 2],
      ]);
      const tree = buildTagTree(counts);
      expect(tree).toHaveLength(1); // One root: "language"
      expect(tree[0].name).toBe("language");
      expect(tree[0].children).toHaveLength(2); // spanish, german
    });
  });

  describe("getCardsWithTag", () => {
    it("filters cards by exact tag", () => {
      const cards = [
        makeCard({ id: "1", tags: ["spanish"] }),
        makeCard({ id: "2", tags: ["german"] }),
        makeCard({ id: "3", tags: ["spanish", "verbs"] }),
      ];
      const result = getCardsWithTag(cards, "spanish");
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(["1", "3"]);
    });
  });

  describe("getCardsInTagHierarchy", () => {
    it("includes tag and all children", () => {
      const cards = [
        makeCard({ id: "1", tags: ["language::spanish"] }),
        makeCard({ id: "2", tags: ["language::spanish::verbs"] }),
        makeCard({ id: "3", tags: ["language::german"] }),
      ];
      const result = getCardsInTagHierarchy(cards, "language::spanish");
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(["1", "2"]);
    });
  });

  describe("renameTagInCards", () => {
    it("renames tag across all cards", () => {
      const cards = [
        makeCard({ id: "1", tags: ["old"] }),
        makeCard({ id: "2", tags: ["old", "other"] }),
        makeCard({ id: "3", tags: ["other"] }),
      ];
      const result = renameTagInCards(cards, "old", "new");
      expect(result[0].tags).toEqual(["new"]);
      expect(result[1].tags).toEqual(["new", "other"]);
      expect(result[2].tags).toEqual(["other"]);
    });
  });

  describe("isValidTag", () => {
    it("accepts valid tags", () => {
      expect(isValidTag("spanish")).toBe(true);
      expect(isValidTag("language::spanish")).toBe(true);
    });

    it("rejects invalid tags", () => {
      expect(isValidTag("")).toBe(false);
      expect(isValidTag("   ")).toBe(false);
      expect(isValidTag("::spanish")).toBe(false);
      expect(isValidTag("spanish::")).toBe(false);
      expect(isValidTag("a::::b")).toBe(false);
    });
  });

  describe("normalizeTag", () => {
    it("normalizes whitespace and multiple separators", () => {
      expect(normalizeTag("  a :: b :: c  ")).toBe("a::b::c");
      expect(normalizeTag("a:::::b")).toBe("a::b");
    });
  });
});
