import { describe, expect, it } from "vitest";
import { getFocusTimerXp, getMatchGameXp, MATCH_GAME_XP } from "../xp-rules";

describe("getFocusTimerXp", () => {
  it("returns 15 XP for sessions <= 15 minutes", () => {
    expect(getFocusTimerXp(0)).toBe(15);
    expect(getFocusTimerXp(15 * 60)).toBe(15);
    expect(getFocusTimerXp(10 * 60)).toBe(15);
  });

  it("returns 25 XP for sessions > 15 min and <= 25 minutes", () => {
    expect(getFocusTimerXp(15 * 60 + 1)).toBe(25);
    expect(getFocusTimerXp(25 * 60)).toBe(25);
    expect(getFocusTimerXp(20 * 60)).toBe(25);
  });

  it("returns 45 XP for sessions > 25 minutes", () => {
    expect(getFocusTimerXp(25 * 60 + 1)).toBe(45);
    expect(getFocusTimerXp(60 * 60)).toBe(45);
  });
});

describe("getMatchGameXp", () => {
  it("returns base XP for a normal game", () => {
    expect(getMatchGameXp({ isPerfect: false, elapsedSeconds: 180 })).toBe(MATCH_GAME_XP.base);
  });

  it("adds perfect game bonus", () => {
    expect(getMatchGameXp({ isPerfect: true, elapsedSeconds: 180 })).toBe(
      MATCH_GAME_XP.base + MATCH_GAME_XP.perfectGame,
    );
  });

  it("adds fast game bonus for < 60 seconds", () => {
    expect(getMatchGameXp({ isPerfect: false, elapsedSeconds: 30 })).toBe(
      MATCH_GAME_XP.base + MATCH_GAME_XP.fastGame,
    );
  });

  it("adds quick game bonus for 60-120 seconds", () => {
    expect(getMatchGameXp({ isPerfect: false, elapsedSeconds: 90 })).toBe(
      MATCH_GAME_XP.base + MATCH_GAME_XP.quickGame,
    );
  });

  it("stacks perfect + fast bonuses", () => {
    expect(getMatchGameXp({ isPerfect: true, elapsedSeconds: 45 })).toBe(
      MATCH_GAME_XP.base + MATCH_GAME_XP.perfectGame + MATCH_GAME_XP.fastGame,
    );
  });

  it("stacks perfect + quick bonuses", () => {
    expect(getMatchGameXp({ isPerfect: true, elapsedSeconds: 90 })).toBe(
      MATCH_GAME_XP.base + MATCH_GAME_XP.perfectGame + MATCH_GAME_XP.quickGame,
    );
  });

  it("does not stack fast + quick bonuses", () => {
    // Fast game takes priority over quick
    expect(getMatchGameXp({ isPerfect: false, elapsedSeconds: 59 })).toBe(
      MATCH_GAME_XP.base + MATCH_GAME_XP.fastGame,
    );
  });

  it("boundary: exactly 60 seconds gets quick bonus", () => {
    expect(getMatchGameXp({ isPerfect: false, elapsedSeconds: 60 })).toBe(
      MATCH_GAME_XP.base + MATCH_GAME_XP.quickGame,
    );
  });

  it("boundary: exactly 120 seconds gets no speed bonus", () => {
    expect(getMatchGameXp({ isPerfect: false, elapsedSeconds: 120 })).toBe(MATCH_GAME_XP.base);
  });
});
