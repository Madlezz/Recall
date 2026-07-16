import { describe, expect, it } from "vitest";
import type { RecallStateSnapshot } from "@/types";
import { preserveDeviceSyncSettings, validateImportSnapshot } from "@/services/repository";

const validSnapshot: RecallStateSnapshot = {
  decks: [
    {
      id: "deck-1",
      name: "SQLite",
      description: "Local data",
      color: "green",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  cards: [
    {
      id: "card-1",
            deckId: "deck-1",
            front: "What is SQLite?",
            back: "A local relational database.",
            hint: "",
            source: "",
            tags: ["sqlite"],
            cardType: "basic",
            state: "new",
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0, learningSteps: 0,
      lastReviewDate: null,
      nextReviewDate: "2026-06-01T00:00:00.000Z",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  studySessions: [
    {
      id: "session-1",
      deckId: "deck-1",
      startedAt: "2026-06-01T00:00:00.000Z",
      endedAt: "2026-06-01T00:05:00.000Z",
      cardsStudied: 1,
    },
  ],
  reviewLogs: [
    {
      id: "review-1",
      cardId: "card-1",
      rating: "good",
      reviewDate: "2026-06-01T00:03:00.000Z",
      stability: 1.0,
      difficulty: 5.0,
      elapsedDays: 0,
      scheduledDays: 1,
    },
  ],
  settings: {
    theme: "dark",
    accentColor: "zinc",
    dyslexiaFont: false,
      seededAt: "2026-06-01T00:00:00.000Z",
      dailyNewCardLimit: 20,
      leechThreshold: 5,
      onboardingComplete: false,
            xp: 0,
            achievements: [],
            dailyGoal: 20,
            notificationsEnabled: false,
            soundVolume: 100,
            allowHtml: false,
            desiredRetention: 0.9,
                        backupFolder: null,
                        backupSchedule: "never" as const,
                        lastBackupAt: null,
      syncFolder: null,
      syncEnabled: false, syncCode: null, syncRelayUrl: null, syncLastAt: null, syncAutoInterval: 0,
                            ttsEnabled: false,
                            ttsAutoRead: false,
                            ttsSpeed: 1,
                            fsrsWeights: null,
                            voiceInputEnabled: true, swipeGestures: true,
                      },
};

describe("validateImportSnapshot", () => {
  it("accepts a referentially valid snapshot", () => {
    expect(() => validateImportSnapshot(validSnapshot)).not.toThrow();
  });

  it("rejects duplicate deck names before replace/merge", () => {
    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        decks: [
          validSnapshot.decks[0],
          { ...validSnapshot.decks[0], id: "deck-2", name: " sqlite " },
        ],
      }),
    ).toThrow("Duplicate deck name");
  });

  it("rejects dangling card, session, and review log references", () => {
    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        cards: [{ ...validSnapshot.cards[0], deckId: "missing-deck" }],
      }),
    ).toThrow("Card references missing deck");

    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        studySessions: [{ ...validSnapshot.studySessions[0], deckId: "missing-deck" }],
      }),
    ).toThrow("Session references missing deck");

    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        reviewLogs: [{ ...validSnapshot.reviewLogs[0], cardId: "missing-card" }],
      }),
    ).toThrow("Review log references missing card");
  });

  it("rejects invalid enum values before persistence", () => {
    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        decks: [{ ...validSnapshot.decks[0], color: "neon" as never }],
      }),
    ).toThrow("Invalid deck color");

    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        cards: [{ ...validSnapshot.cards[0], state: "stuck" as never }],
      }),
    ).toThrow("Invalid card state");

    expect(() =>
      validateImportSnapshot({
        ...validSnapshot,
        reviewLogs: [{ ...validSnapshot.reviewLogs[0], rating: "maybe" as never }],
      }),
    ).toThrow("Invalid review rating");
  });
});

describe("preserveDeviceSyncSettings", () => {
  const deviceSettings = {
    syncFolder: "/safe/vault",
    syncEnabled: true,
    syncCode: "DEVICE-SECRET-KEY",
    syncRelayUrl: "https://device.relay",
    syncLastAt: "2026-01-01T00:00:00.000Z",
    syncAutoInterval: 15,
  } as const;

  const importedSettings = {
    syncFolder: "/evil/vault",
    syncEnabled: true,
    syncCode: "ATTACKER-KEY",
    syncRelayUrl: "https://evil.relay",
    syncLastAt: null,
    syncAutoInterval: 0,
  } as const;

  it("never lets an import override the device sync credentials", () => {
    const result = preserveDeviceSyncSettings(
      importedSettings as unknown as RecallStateSnapshot["settings"],
      deviceSettings as unknown as RecallStateSnapshot["settings"],
    );
    expect(result.syncCode).toBe("DEVICE-SECRET-KEY");
    expect(result.syncRelayUrl).toBe("https://device.relay");
    expect(result.syncFolder).toBe("/safe/vault");
    expect(result.syncEnabled).toBe(true);
    expect(result.syncAutoInterval).toBe(15);
  });

  it("preserves non-sync settings from the imported payload", () => {
    const merged = {
      ...importedSettings,
      theme: "dark" as const,
      dailyGoal: 50,
    } as unknown as RecallStateSnapshot["settings"];
    const result = preserveDeviceSyncSettings(
      merged,
      deviceSettings as unknown as RecallStateSnapshot["settings"],
    );
    expect(result.theme).toBe("dark");
    expect(result.dailyGoal).toBe(50);
  });
});
