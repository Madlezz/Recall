import confetti from "canvas-confetti";
import { LEVEL_THRESHOLDS, LEVEL_TITLES, ACHIEVEMENT_DEFS } from "@/types";
import type { Achievement, AchievementId } from "@/types";

/** XP earned per review rating */
export const REVIEW_XP: Record<string, number> = {
  again: 1,
  hard: 2,
  good: 5,
  easy: 8,
};

/** Compute level from total XP */
export function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

/** Get level title */
export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

/** XP needed for next level, Infinity if at max */
export function xpToNextLevel(xp: number): number {
  const lvl = getLevel(xp);
  if (lvl >= LEVEL_THRESHOLDS.length) return Infinity;
  return LEVEL_THRESHOLDS[lvl] - xp;
}

/** XP progress within current level (0-1) */
export function levelProgress(xp: number): number {
  const lvl = getLevel(xp);
  if (lvl >= LEVEL_THRESHOLDS.length) return 1;
  const currentThreshold = LEVEL_THRESHOLDS[lvl - 1];
  const nextThreshold = LEVEL_THRESHOLDS[lvl];
  return (xp - currentThreshold) / (nextThreshold - currentThreshold);
}

/** Check which achievements just unlocked given new state. Returns newly unlocked IDs. */
export function checkAchievements(
  params: {
    xp: number;
    totalReviews: number;
    streak: number;
    cardsInSession: number;
    accuracy: number;
    deckCount: number;
    cardCount: number;
    reviewHour: number;
    daysSinceLastReview: number;
  },
  existingAchievements: Achievement[],
): AchievementId[] {
  const unlocked: AchievementId[] = [];
  const unlockedIds = new Set(existingAchievements.filter((a) => a.unlockedAt).map((a) => a.id));

  function tryUnlock(id: AchievementId, condition: boolean): void {
    if (condition && !unlockedIds.has(id)) {
      unlocked.push(id);
      unlockedIds.add(id);
    }
  }

  tryUnlock("first_steps", params.totalReviews > 0);
  tryUnlock("hot_streak", params.streak >= 3);
  tryUnlock("on_fire", params.streak >= 7);
  tryUnlock("unstoppable", params.streak >= 30);
  tryUnlock("century", params.totalReviews >= 100);
  tryUnlock("half_marathon", params.totalReviews >= 500);
  tryUnlock("marathon", params.totalReviews >= 1000);
  tryUnlock("perfectionist", params.cardsInSession >= 10 && params.accuracy === 100);
  tryUnlock("night_owl", params.reviewHour >= 0 && params.reviewHour < 5);
  tryUnlock("early_bird", params.reviewHour >= 5 && params.reviewHour < 6);
  tryUnlock("deck_collector", params.deckCount >= 5);
  tryUnlock("card_hoarder", params.cardCount >= 100);
  tryUnlock("speed_demon", params.cardsInSession >= 50);
  tryUnlock("comeback_kid", params.daysSinceLastReview >= 7);

  return unlocked;
}

/** Create Achievement objects for newly unlocked IDs */
export function applyNewAchievements(
  unlockedIds: AchievementId[],
  existingAchievements: Achievement[],
  now: string,
): Achievement[] {
  const achievements = [...existingAchievements];
  for (const id of unlockedIds) {
    const def = ACHIEVEMENT_DEFS[id];
    achievements.push({
      id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      unlockedAt: now,
    });
  }
  return achievements;
}

/** Level-up confetti — bigger, flashier */
export function triggerLevelUpConfetti(): void {
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.3 },
    colors: ["#a855f7", "#6366f1", "#8b5cf6", "#d946ef", "#f59e0b", "#ec4899"],
    ticks: 200,
  });
}

/** Achievement unlock confetti — smaller burst */
export function triggerAchievementConfetti(): void {
  confetti({
    particleCount: 60,
    spread: 60,
    origin: { y: 0.5 },
    colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899"],
  });
}