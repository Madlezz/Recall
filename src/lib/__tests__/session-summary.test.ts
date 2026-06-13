import { describe, it, expect } from "vitest";
import { buildSessionSummary } from "@/lib/session-summary";
import type { ActiveStudySession, RecallSettings, ReviewLog, Deck } from "@/types";
import { ACHIEVEMENT_DEFS } from "@/types";

const defaultSettings: RecallSettings = {
  theme: "light",
  seededAt: "2025-01-01T00:00:00.000Z",
  dailyNewCardLimit: 20,
  leechThreshold: 8,
  onboardingComplete: true,
  xp: 0,
  achievements: [],
  dailyGoal: 50,
  notificationsEnabled: false,
  soundVolume: 80,
};

const defaultDeck: Deck = {
  id: "deck1",
  name: "Test Deck",
  description: "",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  color: "blue",
};

const mockReviewLog: ReviewLog = {
  id: "rl1",
  cardId: "c1",
  rating: "good",
  reviewDate: "2025-05-31T10:00:00.000Z",
  stability: 1,
  difficulty: 0.3,
  elapsedDays: 0,
  scheduledDays: 1,
};

const baseTime = new Date("2025-06-01T10:00:00.000Z");

function makeActive(
  overrides: Partial<ActiveStudySession> = {},
): ActiveStudySession {
  return {
    id: "session1",
    deckId: "deck1",
    cardIds: ["c1", "c2", "c3"],
    currentIndex: 2,
    revealed: false,
    startedAt: new Date(baseTime.getTime() - 5 * 60 * 1000).toISOString(),
    ratings: { again: 0, hard: 1, good: 1, easy: 1 },
    completed: true,
    previousCardState: null,
    newCardsCount: 1,
    sessionXp: 15,
    ...overrides,
  };
}

describe("buildSessionSummary", () => {
  it("computes basic summary fields", () => {
    const active = makeActive();
    const result = buildSessionSummary(active, defaultSettings, [mockReviewLog], [defaultDeck], [], baseTime);

    expect(result.summary.cardsStudied).toBe(3);
    expect(result.summary.newCards).toBe(1);
    expect(result.summary.sessionXp).toBe(15);
    expect(result.summary.againCount).toBe(0);
    expect(result.summary.hardCount).toBe(1);
    expect(result.summary.goodCount).toBe(1);
    expect(result.summary.easyCount).toBe(1);
    expect(result.summary.timeSpentMs).toBe(5 * 60 * 1000);
  });

  it("calculates average rating correctly", () => {
    const active = makeActive();
    const result = buildSessionSummary(active, defaultSettings, [mockReviewLog], [defaultDeck], [], baseTime);
    expect(result.summary.averageRating).toBeCloseTo(3.0, 1);
  });

  it("updates XP in settings", () => {
    const settings = { ...defaultSettings, xp: 100 };
    const active = makeActive({ sessionXp: 15 });
    const result = buildSessionSummary(active, settings, [mockReviewLog], [defaultDeck], [], baseTime);
    expect(result.updatedSettings.xp).toBe(115);
  });

  it("detects level up", () => {
    const settings = { ...defaultSettings, xp: 45 };
    const active = makeActive({ sessionXp: 10 });
    const result = buildSessionSummary(active, settings, [mockReviewLog], [defaultDeck], [], baseTime);
    expect(result.didLevelUp).toBe(true);
  });

  it("does not trigger level up when XP insufficient", () => {
    const settings = { ...defaultSettings, xp: 10 };
    const active = makeActive({ sessionXp: 10 });
    const result = buildSessionSummary(active, settings, [mockReviewLog], [defaultDeck], [], baseTime);
    expect(result.didLevelUp).toBe(false);
  });

  it("unlocks first_steps achievement on first review", () => {
    const active = makeActive();
    const result = buildSessionSummary(active, defaultSettings, [mockReviewLog], [defaultDeck], [], baseTime);
    expect(result.newAchievementIds).toContain("first_steps");
    expect(result.updatedSettings.achievements).toHaveLength(1);
    expect(result.updatedSettings.achievements[0].id).toBe("first_steps");
  });

  it("does not re-unlock already unlocked achievements", () => {
    const unlockedAchievement = {
      id: "first_steps" as const,
      title: ACHIEVEMENT_DEFS.first_steps.title,
      description: ACHIEVEMENT_DEFS.first_steps.description,
      icon: ACHIEVEMENT_DEFS.first_steps.icon,
      unlockedAt: "2025-01-15T00:00:00.000Z",
    };
    const settings = { ...defaultSettings, achievements: [unlockedAchievement] };
    const active = makeActive();
    const result = buildSessionSummary(active, settings, [mockReviewLog], [defaultDeck], [], baseTime);
    expect(result.newAchievementIds).not.toContain("first_steps");
  });

  it("populates summary achievements with title and description", () => {
    const active = makeActive();
    const result = buildSessionSummary(active, defaultSettings, [mockReviewLog], [defaultDeck], [], baseTime);
    expect(result.summary.newAchievements).toHaveLength(1);
    expect(result.summary.newAchievements[0].id).toBe("first_steps");
    expect(result.summary.newAchievements[0].title).toBeTruthy();
    expect(result.summary.newAchievements[0].icon).toBeTruthy();
  });

  it("handles empty session gracefully", () => {
    const active = makeActive({
      cardIds: [],
      ratings: { again: 0, hard: 0, good: 0, easy: 0 },
      sessionXp: 0,
      newCardsCount: 0,
    });
    const result = buildSessionSummary(active, defaultSettings, [mockReviewLog], [defaultDeck], [], baseTime);
    expect(result.summary.cardsStudied).toBe(0);
    expect(result.summary.averageRating).toBe(0);
  });
});