import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecallStateSnapshot } from "@/types";
import { buildExportPayload } from "../import-export";

const writeTextFile = vi.fn();
const readTextFile = vi.fn();
const join = vi.fn(async (...parts: string[]) => parts.join("/"));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: (...args: unknown[]) => writeTextFile(...args),
  readTextFile: (...args: unknown[]) => readTextFile(...args),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: (...args: unknown[]) => join(...(args as string[])),
}));

import { exportToSyncFolder, importFromSyncFolder, performSync } from "../sync";

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
      syncFolder: "/sync",
      syncEnabled: false,
      syncCode: null,
      syncRelayUrl: null,
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

describe("folder sync (sync.ts)", () => {
  beforeEach(() => {
    writeTextFile.mockReset().mockResolvedValue(undefined);
    readTextFile.mockReset();
    join.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exportToSyncFolder writes recall-sync.json", async () => {
    const state = emptySnapshot();
    await expect(exportToSyncFolder(state, "/drive/Recall")).resolves.toBe(true);
    expect(join).toHaveBeenCalledWith("/drive/Recall", "recall-sync.json");
    expect(writeTextFile).toHaveBeenCalledTimes(1);
    const [path, body] = writeTextFile.mock.calls[0] as [string, string];
    expect(path).toBe("/drive/Recall/recall-sync.json");
    const parsed = JSON.parse(body);
    expect(parsed.version).toBe(2);
    expect(parsed.settings.syncFolder).toBe("/sync");
  });

  it("exportToSyncFolder returns false on write error", async () => {
    writeTextFile.mockRejectedValue(new Error("disk full"));
    await expect(exportToSyncFolder(emptySnapshot(), "/x")).resolves.toBe(false);
  });

  it("importFromSyncFolder returns null when file missing", async () => {
    readTextFile.mockRejectedValue(new Error("not found"));
    await expect(importFromSyncFolder("/drive/Recall")).resolves.toBeNull();
  });

  it("importFromSyncFolder returns null on unsupported version", async () => {
    readTextFile.mockResolvedValue(JSON.stringify({ version: 1, decks: [], cards: [] }));
    await expect(importFromSyncFolder("/drive/Recall")).resolves.toBeNull();
  });

  it("importFromSyncFolder parses v2 payload", async () => {
    const remote = buildExportPayload(
      emptySnapshot({ dailyNewCardLimit: 7 }),
    );
    remote.decks = [
      {
        id: "deck-r",
        name: "Remote",
        description: "",
        color: "blue",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    readTextFile.mockResolvedValue(JSON.stringify(remote));
    const data = await importFromSyncFolder("/drive/Recall");
    expect(data?.version).toBe(2);
    expect(data?.decks).toHaveLength(1);
    expect(data?.decks[0].id).toBe("deck-r");
  });

  it("performSync export-only when no remote file", async () => {
    readTextFile.mockRejectedValue(new Error("missing"));
    const result = await performSync(emptySnapshot(), "/drive/Recall");
    expect(result.success).toBe(true);
    expect(result.imported).toBe(false);
    expect(result.exported).toBe(true);
    expect(writeTextFile).toHaveBeenCalledTimes(1);
  });

  it("performSync import+merge then export when remote exists", async () => {
    const local = emptySnapshot();
    local.decks = [
      {
        id: "deck-local",
        name: "Local",
        description: "",
        color: "green",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const remote = buildExportPayload(emptySnapshot());
    remote.decks = [
      {
        id: "deck-remote",
        name: "Remote",
        description: "",
        color: "rose",
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ];
    readTextFile.mockResolvedValue(JSON.stringify(remote));

    const result = await performSync(local, "/drive/Recall");
    expect(result.success).toBe(true);
    expect(result.imported).toBe(true);
    expect(result.exported).toBe(true);

    const body = writeTextFile.mock.calls[0][1] as string;
    const written = JSON.parse(body);
    const ids = written.decks.map((d: { id: string }) => d.id).sort();
    expect(ids).toEqual(["deck-local", "deck-remote"]);
  });

  it("performSync fails when export write fails", async () => {
    readTextFile.mockRejectedValue(new Error("missing"));
    writeTextFile.mockRejectedValue(new Error("ro fs"));
    const result = await performSync(emptySnapshot(), "/drive/Recall");
    expect(result.success).toBe(false);
    expect(result.exported).toBe(false);
  });
});
