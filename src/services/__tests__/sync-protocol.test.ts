import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteSyncData,
  getDefaultRelayUrl,
  getDeviceId,
  performEncryptedSync,
  testSyncRelay,
} from "../sync-protocol";
import { encryptData, generateSyncCode } from "../crypto";
import { buildExportPayload } from "../import-export";
import type { RecallStateSnapshot } from "@/types";

const SYNC_CODE = "AAAAA-BBBBB-CCCCC-DDDDD-EEEEE-FFFFF-GGGGG-HHHHH-IIIII-JJJJJ";

function emptySnapshot(overrides: Partial<RecallStateSnapshot["settings"]> = {}): RecallStateSnapshot {
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
      syncRelayUrl: "https://sync.example",
      syncLastAt: null,
      syncAutoInterval: 0,
      ttsEnabled: false,
      ttsAutoRead: false,
      ttsSpeed: 1,
      fsrsWeights: null,
      voiceInputEnabled: true,
      swipeGestures: true,
      ...overrides,
    },
  };
}

function httpsConfig(relayUrl = "https://sync.example") {
  return {
    relayUrl,
    syncCode: SYNC_CODE,
    enabled: true,
    lastSyncAt: null,
    autoSyncInterval: 0,
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

describe("sync-protocol happy paths", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("getDefaultRelayUrl is https", () => {
    expect(getDefaultRelayUrl()).toMatch(/^https:\/\//);
  });

  it("getDeviceId persists across calls", () => {
    const a = getDeviceId();
    const b = getDeviceId();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(8);
  });

  it("first sync uploads when relay has no blob (404)", async () => {
    const { code } = generateSyncCode();
    const snapshot = emptySnapshot({ syncCode: code });

    vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/sync/") && (!init || init.method === "GET" || init.method === undefined)) {
        return new Response(null, { status: 404 });
      }
      if (url.includes("/sync/") && init?.method === "PUT") {
        return new Response(JSON.stringify({ success: true, revision: "1" }), {
          status: 200,
          headers: { ETag: '"1"' },
        });
      }
      return new Response(null, { status: 500 });
    });

    const result = await performEncryptedSync(snapshot, {
      ...httpsConfig(),
      syncCode: code,
    });

    expect(result.success).toBe(true);
    expect(result.uploaded).toBe(true);
    expect(result.downloaded).toBe(false);
    expect(result.mergedSnapshot).toBeNull();

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const put = calls.find((c) => c[1]?.method === "PUT");
    expect(put).toBeTruthy();
    expect(String(put![0])).toMatch(/^https:\/\/sync\.example\/sync\/[a-f0-9]{64}$/);
    expect(put![1]?.headers).toMatchObject({ "If-Match": '"0"' });
  });

  it("download+merge+upload when remote blob exists", async () => {
    const { code } = generateSyncCode();
    const local = emptySnapshot({ syncCode: code });
    const remote = emptySnapshot({
      syncCode: code,
      dailyNewCardLimit: 5,
    });
    // Distinct remote card so merge is observable via changes counts
    const remotePayload = buildExportPayload({
      ...remote,
      decks: [
        {
          id: "deck-remote",
          name: "Remote Deck",
          description: "",
          color: "blue",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const encrypted = await encryptData(JSON.stringify(remotePayload), code);

    vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/sync/") && (!init || init.method === "GET" || init.method === undefined)) {
        return new Response(JSON.stringify(encrypted), {
          status: 200,
          headers: { ETag: '"3"' },
        });
      }
      if (url.includes("/sync/") && init?.method === "PUT") {
        return new Response(JSON.stringify({ success: true, revision: "4" }), {
          status: 200,
          headers: { ETag: '"4"' },
        });
      }
      return new Response(null, { status: 500 });
    });

    const result = await performEncryptedSync(local, {
      ...httpsConfig(),
      syncCode: code,
    });

    expect(result.success).toBe(true);
    expect(result.downloaded).toBe(true);
    expect(result.uploaded).toBe(true);
    expect(result.mergedSnapshot).not.toBeNull();
    expect(result.mergedSnapshot!.decks.some((d) => d.id === "deck-remote")).toBe(true);
    expect(result.changes?.decks).toBeGreaterThanOrEqual(1);

    const put = vi.mocked(globalThis.fetch).mock.calls.find((c) => c[1]?.method === "PUT");
    expect(put![1]?.headers).toMatchObject({ "If-Match": '"3"' });
  });

  it("retries once on 409 conflict then succeeds", async () => {
    const { code } = generateSyncCode();
    const local = emptySnapshot({ syncCode: code });
    const remotePayload = buildExportPayload({
      ...emptySnapshot({ syncCode: code }),
      decks: [
        {
          id: "deck-remote",
          name: "Remote Deck",
          description: "",
          color: "blue",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const encrypted = await encryptData(JSON.stringify(remotePayload), code);

    let putCount = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/sync/") && (!init || init.method === "GET" || init.method === undefined)) {
        return new Response(JSON.stringify(encrypted), {
          status: 200,
          headers: { ETag: putCount === 0 ? '"1"' : '"2"' },
        });
      }
      if (url.includes("/sync/") && init?.method === "PUT") {
        putCount += 1;
        if (putCount === 1) {
          return new Response(JSON.stringify({ error: "Conflict", revision: "2" }), {
            status: 409,
            headers: { ETag: '"2"' },
          });
        }
        return new Response(JSON.stringify({ success: true, revision: "3" }), {
          status: 200,
          headers: { ETag: '"3"' },
        });
      }
      return new Response(null, { status: 500 });
    });

    const result = await performEncryptedSync(local, {
      ...httpsConfig(),
      syncCode: code,
    });

    expect(result.success).toBe(true);
    expect(result.uploaded).toBe(true);
    expect(putCount).toBe(2);
    const puts = vi.mocked(globalThis.fetch).mock.calls.filter((c) => c[1]?.method === "PUT");
    expect(puts[0]![1]?.headers).toMatchObject({ "If-Match": '"1"' });
    expect(puts[1]![1]?.headers).toMatchObject({ "If-Match": '"2"' });
  });

  it("fails when remote decrypt validates as garbage JSON", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ciphertext: "not-valid",
          iv: "not-valid",
          salt: "not-valid",
          iterations: 600_000,
        }),
        { status: 200 },
      ),
    );

    const { code } = generateSyncCode();
    const result = await performEncryptedSync(emptySnapshot({ syncCode: code }), {
      ...httpsConfig(),
      syncCode: code,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("deleteSyncData hits DELETE on https relay", async () => {
    const { code } = generateSyncCode();
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const ok = await deleteSyncData({
      ...httpsConfig(),
      syncCode: code,
    });
    expect(ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/sync\.example\/sync\/[a-f0-9]{64}$/),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
