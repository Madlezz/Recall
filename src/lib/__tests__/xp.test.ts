import { describe, expect, test } from "vitest";
import {
  checkAchievements,
  getLevel,
  getLevelTitle,
  levelProgress,
  REVIEW_XP,
  xpToNextLevel,
} from "../xp";

describe("xp", () => {
  describe("REVIEW_XP", () => {
    test("again = 1 XP", () => expect(REVIEW_XP.again).toBe(1));
    test("hard = 2 XP", () => expect(REVIEW_XP.hard).toBe(2));
    test("good = 5 XP", () => expect(REVIEW_XP.good).toBe(5));
    test("easy = 8 XP", () => expect(REVIEW_XP.easy).toBe(8));
  });

  describe("getLevel", () => {
    test("0 XP = level 1", () => expect(getLevel(0)).toBe(1));
    test("49 XP = level 1", () => expect(getLevel(49)).toBe(1));
    test("50 XP = level 2", () => expect(getLevel(50)).toBe(2));
    test("5000 XP = level 10 (max)", () => expect(getLevel(5000)).toBe(10));
    test("10000 XP = level 10 (beyond max)", () => expect(getLevel(10000)).toBe(10));
  });

  describe("getLevelTitle", () => {
    test("level 1 = Curious Mind", () => expect(getLevelTitle(1)).toBe("Curious Mind"));
    test("level 5 = Memory Master", () => expect(getLevelTitle(5)).toBe("Memory Master"));
    test("level 10 = Legend", () => expect(getLevelTitle(10)).toBe("Legend"));
  });

  describe("xpToNextLevel", () => {
    test("0 XP: 50 to next", () => expect(xpToNextLevel(0)).toBe(50));
    test("30 XP: 20 to next", () => expect(xpToNextLevel(30)).toBe(20));
    test("5000 XP: max level", () => expect(xpToNextLevel(5000)).toBe(Infinity));
  });

  describe("levelProgress", () => {
    test("0 XP = 0%", () => expect(levelProgress(0)).toBe(0));
    test("25 XP = 50%", () => expect(levelProgress(25)).toBe(0.5));
    test("50 XP = 0% (new level)", () => expect(levelProgress(50)).toBeCloseTo(0));
  });

  describe("checkAchievements", () => {
    const baseParams = {
      xp: 0, totalReviews: 0, streak: 0,
      cardsInSession: 0, accuracy: 0,
      deckCount: 1, cardCount: 1,
      reviewHour: 12, daysSinceLastReview: 0,
    };

    test("first review unlocks first_steps", () => {
      const ids = checkAchievements({ ...baseParams, totalReviews: 1 }, []);
      expect(ids).toContain("first_steps");
    });

    test("3-day streak unlocks hot_streak", () => {
      const ids = checkAchievements({ ...baseParams, streak: 3 }, []);
      expect(ids).toContain("hot_streak");
    });

    test("7-day streak unlocks on_fire", () => {
      const ids = checkAchievements({ ...baseParams, streak: 7 }, []);
      expect(ids).toContain("on_fire");
    });

    test("100 reviews unlocks century", () => {
      const ids = checkAchievements({ ...baseParams, totalReviews: 100 }, []);
      expect(ids).toContain("century");
    });

    test("perfect session + 10+ cards = perfectionist", () => {
      const ids = checkAchievements(
        { ...baseParams, cardsInSession: 10, accuracy: 100 },
        [],
      );
      expect(ids).toContain("perfectionist");
    });

    test("night review (2 AM) = night_owl", () => {
      const ids = checkAchievements({ ...baseParams, reviewHour: 2 }, []);
      expect(ids).toContain("night_owl");
    });

    test("early morning (6 AM) = early_bird", () => {
      const ids = checkAchievements({ ...baseParams, reviewHour: 6 }, []);
      expect(ids).toContain("early_bird");
    });

    test("5+ decks = deck_collector", () => {
      const ids = checkAchievements({ ...baseParams, deckCount: 5 }, []);
      expect(ids).toContain("deck_collector");
    });

    test("100+ cards = card_hoarder", () => {
      const ids = checkAchievements({ ...baseParams, cardCount: 100 }, []);
      expect(ids).toContain("card_hoarder");
    });

    test("50 cards in session = speed_demon", () => {
      const ids = checkAchievements({ ...baseParams, cardsInSession: 50 }, []);
      expect(ids).toContain("speed_demon");
    });

    test("7+ days gap = comeback_kid", () => {
      const ids = checkAchievements({ ...baseParams, daysSinceLastReview: 7 }, []);
      expect(ids).toContain("comeback_kid");
    });

    test("already earned achievement is not returned again", () => {
      const existing = [
        { id: "first_steps", title: "", description: "", icon: "", unlockedAt: "2024-01-01" },
      ];
      const ids = checkAchievements({ ...baseParams, totalReviews: 1 }, existing);
      expect(ids).not.toContain("first_steps");
    });

    test("multiple achievements at once", () => {
      const ids = checkAchievements(
        { ...baseParams, totalReviews: 100, streak: 3, deckCount: 5 },
        [],
      );
      expect(ids).toContain("first_steps");
      expect(ids).toContain("century");
      expect(ids).toContain("hot_streak");
      expect(ids).toContain("deck_collector");
    });
  });
});