import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  applyNewAchievements,
  checkAchievements,
  CONFETTI_COLORS,
  getLevel,
  getLevelTitle,
  levelProgress,
  prefersReducedMotion,
  triggerAchievementConfetti,
  triggerLevelUpConfetti,
  xpToNextLevel,
} from "../xp";
import type { Achievement } from "@/types";

// Mock canvas-confetti
vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

import confetti from "canvas-confetti";

const mockedConfetti = vi.mocked(confetti);

describe("xp coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Line 18: getLevel with negative XP (loop completes without returning) ──
  describe("getLevel edge cases", () => {
    test("negative XP returns level 1 (fallback)", () => {
      expect(getLevel(-1)).toBe(1);
    });

    test("very negative XP returns level 1 (fallback)", () => {
      expect(getLevel(-1000)).toBe(1);
    });

    test("XP exactly at each threshold boundary", () => {
      expect(getLevel(120)).toBe(3);
      expect(getLevel(250)).toBe(4);
      expect(getLevel(500)).toBe(5);
      expect(getLevel(900)).toBe(6);
      expect(getLevel(1500)).toBe(7);
      expect(getLevel(2300)).toBe(8);
      expect(getLevel(3500)).toBe(9);
    });
  });

  // ── getLevelTitle clamping for level beyond array ──
  describe("getLevelTitle edge cases", () => {
    test("level 100 clamps to last title", () => {
      expect(getLevelTitle(100)).toBe("Legend");
    });

    test("level 0 returns undefined (out-of-bounds index)", () => {
      // level 0 → Math.min(-1, 9) = -1 → LEVEL_TITLES[-1] is undefined
      const result = getLevelTitle(0);
      expect(result).toBeUndefined();
    });
  });

  // ── levelProgress at max level ──
  describe("levelProgress edge cases", () => {
    test("max level (5000 XP) returns 1", () => {
      expect(levelProgress(5000)).toBe(1);
    });

    test("beyond max level returns 1", () => {
      expect(levelProgress(10000)).toBe(1);
    });

    test("mid-level progress", () => {
      // Level 2: threshold 50, next 120, range = 70
      // 85 XP → (85 - 50) / (120 - 50) = 35/70 = 0.5
      expect(levelProgress(85)).toBe(0.5);
    });
  });

  // ── xpToNextLevel edge cases ──
  describe("xpToNextLevel edge cases", () => {
    test("XP just below a threshold", () => {
      // 49 XP → level 1, next threshold is 50, so 1 to go
      expect(xpToNextLevel(49)).toBe(1);
    });

    test("XP at exact threshold gives next gap", () => {
      // 50 XP → level 2, next threshold is 120, so 70 to go
      expect(xpToNextLevel(50)).toBe(70);
    });
  });

  // ── checkAchievements: uncovered achievements ──
  describe("checkAchievements - uncovered achievements", () => {
    const baseParams = {
      xp: 0,
      totalReviews: 0,
      streak: 0,
      cardsInSession: 0,
      accuracy: 0,
      deckCount: 1,
      cardCount: 1,
      reviewHour: 12,
      daysSinceLastReview: 0,
    };

    test("30-day streak unlocks unstoppable", () => {
      const ids = checkAchievements({ ...baseParams, streak: 30 }, []);
      expect(ids).toContain("unstoppable");
    });

    test("500 reviews unlocks half_marathon", () => {
      const ids = checkAchievements({ ...baseParams, totalReviews: 500 }, []);
      expect(ids).toContain("half_marathon");
    });

    test("1000 reviews unlocks marathon", () => {
      const ids = checkAchievements({ ...baseParams, totalReviews: 1000 }, []);
      expect(ids).toContain("marathon");
    });

    test("no achievements with zero values", () => {
      const ids = checkAchievements(baseParams, []);
      expect(ids).toEqual([]);
    });

    test("reviewHour exactly at 5 unlocks early_bird not night_owl", () => {
      const ids = checkAchievements({ ...baseParams, reviewHour: 5 }, []);
      expect(ids).toContain("early_bird");
      expect(ids).not.toContain("night_owl");
    });

    test("reviewHour exactly at 8 does not unlock early_bird", () => {
      const ids = checkAchievements({ ...baseParams, reviewHour: 8 }, []);
      expect(ids).not.toContain("early_bird");
    });

    test("reviewHour at 4 is night_owl", () => {
      const ids = checkAchievements({ ...baseParams, reviewHour: 4 }, []);
      expect(ids).toContain("night_owl");
    });

    test("reviewHour at 0 is night_owl", () => {
      const ids = checkAchievements({ ...baseParams, reviewHour: 0 }, []);
      expect(ids).toContain("night_owl");
    });

    test("reviewHour at 7 is early_bird", () => {
      const ids = checkAchievements({ ...baseParams, reviewHour: 7 }, []);
      expect(ids).toContain("early_bird");
    });

    test("existing achievements without unlockedAt are not excluded", () => {
      // An achievement with unlockedAt: null should still be considered locked
      const existing: Achievement[] = [
        {
          id: "first_steps",
          title: "First Steps",
          description: "",
          icon: "",
          unlockedAt: null,
        },
      ];
      const ids = checkAchievements({ ...baseParams, totalReviews: 1 }, existing);
      // first_steps has unlockedAt: null, so it's NOT in unlockedIds → can be unlocked
      expect(ids).toContain("first_steps");
    });

    test("perfectionist requires BOTH 10+ cards AND 100% accuracy", () => {
      // 10 cards but 99% accuracy → no perfectionist
      const ids = checkAchievements(
        { ...baseParams, cardsInSession: 10, accuracy: 99 },
        [],
      );
      expect(ids).not.toContain("perfectionist");
    });

    test("perfectionist not unlocked with fewer than 10 cards even at 100%", () => {
      const ids = checkAchievements(
        { ...baseParams, cardsInSession: 9, accuracy: 100 },
        [],
      );
      expect(ids).not.toContain("perfectionist");
    });

    test("streak below threshold does not unlock", () => {
      const ids = checkAchievements({ ...baseParams, streak: 2 }, []);
      expect(ids).not.toContain("hot_streak");
    });

    test("streak 6 does not unlock on_fire", () => {
      const ids = checkAchievements({ ...baseParams, streak: 6 }, []);
      expect(ids).not.toContain("on_fire");
    });

    test("streak 29 does not unlock unstoppable", () => {
      const ids = checkAchievements({ ...baseParams, streak: 29 }, []);
      expect(ids).not.toContain("unstoppable");
    });

    test("daysSinceLastReview 6 does not unlock comeback_kid", () => {
      const ids = checkAchievements(
        { ...baseParams, daysSinceLastReview: 6 },
        [],
      );
      expect(ids).not.toContain("comeback_kid");
    });
  });

  // ── applyNewAchievements ──
  describe("applyNewAchievements", () => {
    test("adds new achievements to existing list", () => {
      const existing: Achievement[] = [];
      const result = applyNewAchievements(["first_steps"], existing, "2024-01-01T00:00:00Z");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("first_steps");
      expect(result[0].title).toBe("First Steps");
      expect(result[0].description).toBe("Complete your first review session");
      expect(result[0].icon).toBe("👶");
      expect(result[0].unlockedAt).toBe("2024-01-01T00:00:00Z");
    });

    test("preserves existing achievements", () => {
      const existing: Achievement[] = [
        {
          id: "hot_streak",
          title: "Hot Streak",
          description: "3-day study streak",
          icon: "🔥",
          unlockedAt: "2024-01-01",
        },
      ];
      const result = applyNewAchievements(["first_steps"], existing, "2024-02-01");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("hot_streak");
      expect(result[1].id).toBe("first_steps");
    });

    test("adds multiple new achievements", () => {
      const result = applyNewAchievements(
        ["first_steps", "hot_streak", "century"],
        [],
        "2024-03-01",
      );
      expect(result).toHaveLength(3);
      expect(result.map((a) => a.id)).toEqual(["first_steps", "hot_streak", "century"]);
    });

    test("empty unlocked IDs returns existing unchanged", () => {
      const existing: Achievement[] = [
        {
          id: "first_steps",
          title: "First Steps",
          description: "",
          icon: "",
          unlockedAt: "2024-01-01",
        },
      ];
      const result = applyNewAchievements([], existing, "2024-02-01");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("first_steps");
    });

    test("all achievement IDs produce valid definitions", () => {
      const allIds = [
        "first_steps",
        "hot_streak",
        "on_fire",
        "unstoppable",
        "century",
        "half_marathon",
        "marathon",
        "perfectionist",
        "night_owl",
        "early_bird",
        "deck_collector",
        "card_hoarder",
        "speed_demon",
        "comeback_kid",
      ] as const;
      const result = applyNewAchievements([...allIds], [], "2024-01-01");
      expect(result).toHaveLength(14);
      for (const a of result) {
        expect(a.title).toBeTruthy();
        expect(a.description).toBeTruthy();
        expect(a.icon).toBeTruthy();
        expect(a.unlockedAt).toBe("2024-01-01");
      }
    });
  });

  // ── CONFETTI_COLORS ──
  describe("CONFETTI_COLORS", () => {
    test("celebration palette has 6 colors", () => {
      expect(CONFETTI_COLORS.celebration).toHaveLength(6);
    });

    test("achievement palette has 4 colors", () => {
      expect(CONFETTI_COLORS.achievement).toHaveLength(4);
    });

    test("daily palette has 4 colors", () => {
      expect(CONFETTI_COLORS.daily).toHaveLength(4);
    });
  });

  // ── prefersReducedMotion (line 107) ──
  describe("prefersReducedMotion", () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    test("returns true when reduced motion is preferred", () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as any;
      expect(prefersReducedMotion()).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    });

    test("returns false when reduced motion is not preferred", () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as any;
      expect(prefersReducedMotion()).toBe(false);
    });

    test("returns falsy (undefined) when matchMedia is undefined", () => {
      // @ts-expect-error testing matchMedia undefined
      window.matchMedia = undefined;
      expect(prefersReducedMotion()).toBeUndefined();
    });
  });

  // ── triggerLevelUpConfetti (lines 120-128) ──
  describe("triggerLevelUpConfetti", () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    test("fires confetti when reduced motion is NOT preferred", () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as any;
      triggerLevelUpConfetti();
      expect(mockedConfetti).toHaveBeenCalledTimes(1);
      expect(mockedConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.3 },
          ticks: 200,
        }),
      );
      // Verify colors are from celebration palette
      const call = mockedConfetti.mock.calls[0][0] as any;
      expect(call.colors).toEqual([...CONFETTI_COLORS.celebration]);
    });

    test("does NOT fire confetti when reduced motion is preferred", () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as any;
      triggerLevelUpConfetti();
      expect(mockedConfetti).not.toHaveBeenCalled();
    });
  });

  // ── triggerAchievementConfetti (lines 131-138) ──
  describe("triggerAchievementConfetti", () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    test("fires confetti when reduced motion is NOT preferred", () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as any;
      triggerAchievementConfetti();
      expect(mockedConfetti).toHaveBeenCalledTimes(1);
      expect(mockedConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.5 },
        }),
      );
      // Verify colors are from achievement palette
      const call = mockedConfetti.mock.calls[0][0] as any;
      expect(call.colors).toEqual([...CONFETTI_COLORS.achievement]);
    });

    test("does NOT fire confetti when reduced motion is preferred", () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as any;
      triggerAchievementConfetti();
      expect(mockedConfetti).not.toHaveBeenCalled();
    });
  });
});
