/**
 * Centralized XP economy rules.
 * All XP amounts and thresholds are defined here for easy tuning.
 */

// ── Focus Timer XP ──
export function getFocusTimerXp(durationSeconds: number): number {
  if (durationSeconds <= 15 * 60) return 15;
  if (durationSeconds <= 25 * 60) return 25;
  return 45;
}

// ── Match Game XP ──
export const MATCH_GAME_XP = {
  base: 30,
  perfectGame: 25, // every move was a match
  fastGame: 20, // completed in under 60 seconds
  quickGame: 10, // completed in under 120 seconds
} as const;

export interface MatchGameXpParams {
  isPerfect: boolean;
  elapsedSeconds: number;
}

export function getMatchGameXp({ isPerfect, elapsedSeconds }: MatchGameXpParams): number {
  let xp = MATCH_GAME_XP.base;
  if (isPerfect) xp += MATCH_GAME_XP.perfectGame;
  if (elapsedSeconds < 60) xp += MATCH_GAME_XP.fastGame;
  else if (elapsedSeconds < 120) xp += MATCH_GAME_XP.quickGame;
  return xp;
}

// ── Level Thresholds ──
// Defined in types.ts as LEVEL_THRESHOLDS, but re-exported here for XP-related logic
export { LEVEL_THRESHOLDS } from "@/types";
