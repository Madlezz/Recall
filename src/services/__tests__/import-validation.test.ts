import { describe, it, expect } from "vitest";
import { validateImportSnapshot } from "@/services/repository";
import type { RecallStateSnapshot } from "@/types";

const baseSnapshot: RecallStateSnapshot = {
  decks: [{ id: "d1", name: "Test", description: "", color: "blue", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" }],
  cards: [],
  studySessions: [],
  reviewLogs: [],
  settings: {
    theme: "dark",
    seededAt: "2025-01-01T00:00:00.000Z",
    dailyNewCardLimit: 20,
    leechThreshold: 5,
    onboardingComplete: false,
    xp: 0,
    achievements: [],
    dailyGoal: 20,
    notificationsEnabled: false,
    soundVolume: 100,
    backupFolder: null,
    backupSchedule: "never" as const,
    lastBackupAt: null,
  },
};

describe("validateImportSnapshot", () => {
  it("accepts valid snapshot", () => {
    expect(() => validateImportSnapshot(baseSnapshot)).not.toThrow();
  });

  it("rejects duplicate deck ids", () => {
    const snap = {
      ...baseSnapshot,
      decks: [
        baseSnapshot.decks[0],
        { ...baseSnapshot.decks[0], name: "Other" },
      ],
    };
    expect(() => validateImportSnapshot(snap)).toThrow("Duplicate deck id");
  });

  it("rejects duplicate deck names", () => {
    const snap = {
      ...baseSnapshot,
      decks: [
        baseSnapshot.decks[0],
        { ...baseSnapshot.decks[0], id: "d2" },
      ],
    };
    expect(() => validateImportSnapshot(snap)).toThrow("Duplicate deck name");
  });

  it("rejects cards referencing missing decks", () => {
    const snap = {
      ...baseSnapshot,
      cards: [{
        id: "c1", deckId: "nonexistent", front: "Q", back: "A", hint: "", source: "", tags: [],
        cardType: "basic" as const, state: "new" as const, lastReviewDate: null,
        nextReviewDate: "2025-01-01T00:00:00.000Z", stability: 0, difficulty: 0,
        elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0,
        createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z",
      }],
    };
    expect(() => validateImportSnapshot(snap)).toThrow("Card references missing deck");
  });

  it("rejects cards with empty front", () => {
    const snap = {
      ...baseSnapshot,
      cards: [{
        id: "c1", deckId: "d1", front: "", back: "A", hint: "", source: "", tags: [],
        cardType: "basic" as const, state: "new" as const, lastReviewDate: null,
        nextReviewDate: "2025-01-01T00:00:00.000Z", stability: 0, difficulty: 0,
        elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0,
        createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z",
      }],
    };
    expect(() => validateImportSnapshot(snap)).toThrow("Card front is required");
  });

  it("rejects invalid card state", () => {
    const snap = {
      ...baseSnapshot,
      cards: [{
        id: "c1", deckId: "d1", front: "Q", back: "A", hint: "", source: "", tags: [],
        cardType: "basic" as const, state: "invalid" as any, lastReviewDate: null,
        nextReviewDate: "2025-01-01T00:00:00.000Z", stability: 0, difficulty: 0,
        elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0,
        createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z",
      }],
    };
    expect(() => validateImportSnapshot(snap)).toThrow("Invalid card state");
  });
});