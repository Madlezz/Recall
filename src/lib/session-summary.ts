import { getLevel, checkAchievements, applyNewAchievements } from "@/lib/xp";
import { getStudyStreak } from "@/lib/streak";
import { ACHIEVEMENT_DEFS } from "@/types";
import type {
  ActiveStudySession,
  SessionSummary,
  RecallSettings,
  ReviewLog,
  Deck,
  Card,
  Achievement,
} from "@/types";

export interface SessionSummaryResult {
  summary: SessionSummary;
  newAchievementIds: string[];
  didLevelUp: boolean;
  updatedSettings: RecallSettings;
}

/**
 * Pure function — computes session summary, XP, level-up, and achievements.
 * Does NOT trigger confetti or persist to DB (those are caller's responsibility).
 */
export function buildSessionSummary(
  active: ActiveStudySession,
  settings: RecallSettings,
  reviewLogs: ReviewLog[],
  decks: Deck[],
  cards: Card[],
  completedAt: Date = new Date(),
): SessionSummaryResult {
  const timeSpentMs = completedAt.getTime() - new Date(active.startedAt).getTime();
  const totalRatings =
    active.ratings.again + active.ratings.hard + active.ratings.good + active.ratings.easy;
  const averageRating =
    totalRatings > 0
      ? (active.ratings.again * 1 +
          active.ratings.hard * 2 +
          active.ratings.good * 3 +
          active.ratings.easy * 4) /
        totalRatings
      : 0;

  const goodAndEasy = active.ratings.good + active.ratings.easy;
  const accuracy = totalRatings > 0 ? Math.round((goodAndEasy / totalRatings) * 100) : 0;
  const newXp = settings.xp + active.sessionXp;
  const totalReviews = reviewLogs.length;
  const streak = getStudyStreak(reviewLogs);
  const nowIso = completedAt.toISOString();
  const reviewHour = completedAt.getHours();

  const sortedLogs = [...reviewLogs].sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));
  const lastLogDate = sortedLogs.length > 0 ? new Date(sortedLogs[0].reviewDate) : null;
  const daysSinceLastReview = lastLogDate
    ? Math.floor((completedAt.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const oldLevel = getLevel(settings.xp);
  const newLevel = getLevel(newXp);

  const newAchievementIds = checkAchievements(
    {
      xp: newXp,
      totalReviews,
      streak,
      cardsInSession: active.cardIds.length,
      accuracy,
      deckCount: decks.length,
      cardCount: cards.length,
      reviewHour,
      daysSinceLastReview,
    },
    settings.achievements,
  );

  const updatedAchievements = applyNewAchievements(
    newAchievementIds,
    settings.achievements,
    nowIso,
  );

  const summary: SessionSummary = {
    cardsStudied: active.cardIds.length,
    timeSpentMs,
    averageRating,
    newCards: active.newCardsCount,
    againCount: active.ratings.again,
    hardCount: active.ratings.hard,
    goodCount: active.ratings.good,
    easyCount: active.ratings.easy,
    sessionXp: active.sessionXp,
    newAchievements: newAchievementIds.map((id) => {
      const def = ACHIEVEMENT_DEFS[id as keyof typeof ACHIEVEMENT_DEFS];
      return {
        id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        unlockedAt: nowIso,
      } satisfies Achievement;
    }),
  };

  return {
    summary,
    newAchievementIds,
    didLevelUp: newLevel > oldLevel,
    updatedSettings: {
      ...settings,
      xp: newXp,
      achievements: updatedAchievements,
    },
  };
}