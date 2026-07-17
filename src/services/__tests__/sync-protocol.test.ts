import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteSyncData,
  performEncryptedSync,
  testSyncRelay,
} from "../sync-protocol";
import type { RecallStateSnapshot } from "@/types";

const SYNC_CODE = "AAAAA-BBBBB-CCCCC-DDDDD-EEEEE-FFFFF-GGGGG-HHHHH-IIIII-JJJJJ";

function emptySnapshot(): RecallStateSnapshot {
  return {
    decks: [],
    cards: [],
    reviewLogs: [],
    studySessions: [],
    settings: {
      theme: "light",
      accentColor: "zinc",
      dyslexiaFont: false,
      seededAt: "",
      dailyNewCardLimit: 20,
      leechThreshold: 5,
      onboardingComplete: true,
      xp: 0,
      achievements: [],
      dailyGoal: 20,
      notificationsEnabled: false,
      soundVolume: 100,
      allowHtml: false,
      desiredRetention: 0.9,
      backupFolder: null,
      backupSchedule: "never",
      lastBackupAt: null,
      syncFolder: null,
      syncEnabled: true,
      syncCode: SYNC_CODE,
      syncRelayUrl: "http://insecure.example",
      syncLastAt: null,
      syncAutoInterval: 0,
      ttsEnabled: false,
      ttsAutoRead: false,
      ttsSpeed: 1,
      fsrsWeights: null,
      voiceInputEnabled: true,
      swipeGestures: true,
    },
  };
}

describe("sync-protocol HTTPS enforcement", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("testSyncRelay rejects http relay without calling fetch", async () => {
    const ok = await testSyncRelay("http://insecure.example");
    expect(ok).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("testSyncRelay allows https relay", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
    );
    const ok = await testSyncRelay("https://sync.example");
    expect(ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://sync.example/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("deleteSyncData rejects http relay without calling fetch", async () => {
    const ok = await deleteSyncData({
      relayUrl: "http://insecure.example",
      syncCode: SYNC_CODE,
      enabled: true,
      lastSyncAt: null,
      autoSyncInterval: 0,
    });
    expect(ok).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("performEncryptedSync fails closed on http relay", async () => {
    const result = await performEncryptedSync(emptySnapshot(), {
      relayUrl: "http://insecure.example",
      syncCode: SYNC_CODE,
      enabled: true,
      lastSyncAt: null,
      autoSyncInterval: 0,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/HTTPS/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
