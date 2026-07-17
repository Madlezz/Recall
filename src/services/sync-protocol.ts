/**
 * End-to-end encrypted sync protocol.
 *
 * Architecture:
 * 1. Device A generates sync code → derives encryption key via PBKDF2
 * 2. Device A encrypts state → uploads encrypted blob to relay
 * 3. Device B enters sync code → downloads blob → decrypts → merges
 * 4. Device B encrypts merged state → uploads
 *
 * The relay server NEVER sees plaintext or the encryption key.
 * It only stores opaque encrypted blobs, keyed by a hash of the sync code.
 *
 * Optimistic concurrency: GET returns ETag (revision). PUT sends If-Match.
 * 409 → re-download, re-merge, retry once.
 *
 * For Tauri desktop, this can fall back to the existing folder-based sync
 * (sync.ts) if the user prefers local folder sync (Dropbox/Drive).
 */

import type { RecallStateSnapshot, RecallExportPayload } from "@/types";
import { buildExportPayload, mergeImportPayload, parseImportPayload } from "./import-export";
import { encryptData, decryptData, type EncryptedPayload } from "./crypto";

/**
 * Built-in default relay URL.
 * Empty on purpose: Recall does not run a maintainer-funded public relay.
 * Users self-host `sync-relay/` (Cloudflare Worker + R2) or use folder/file sync.
 * See docs/DEPLOYMENT.md and AGENTS.md Cost / infra.
 */
export function getDefaultRelayUrl(): string {
  return "";
}

/** Trim + require non-empty HTTPS relay (self-hosted). */
export function resolveRelayUrl(relayUrl: string | null | undefined): string {
  const trimmed = (relayUrl ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new Error("Sync relay URL required (self-host sync-relay/ or set your worker URL)");
  }
  return enforceHttps(trimmed);
}

export interface SyncConfig {
  /** The sync relay URL */
  relayUrl: string;
  /** The sync code (human-readable, encodes key material) */
  syncCode: string;
  /** Whether sync is enabled */
  enabled: boolean;
  /** Last sync timestamp (ISO) */
  lastSyncAt: string | null;
  /** Auto-sync interval in minutes (0 = manual only) */
  autoSyncInterval: number;
}

export interface SyncResult {
  success: boolean;
  uploaded: boolean;
  downloaded: boolean;
  mergedSnapshot: RecallStateSnapshot | null;
  error?: string;
  /** Number of items changed in merge */
  changes?: { decks: number; cards: number; reviewLogs: number };
}

type RemoteBlob = {
  payload: EncryptedPayload;
  /** Bare revision string (no quotes), "0" for legacy blobs without metadata */
  etag: string;
};

export class SyncConflictError extends Error {
  readonly etag: string | null;
  constructor(message = "Sync conflict", etag: string | null = null) {
    super(message);
    this.name = "SyncConflictError";
    this.etag = etag;
  }
}

/**
 * Get the device ID for this device (persisted in localStorage).
 * Used for conflict detection (don't merge with ourselves).
 */
export function getDeviceId(): string {
  const KEY = "recall.device-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Compute the sync blob key from a sync code.
 * This is a SHA-256 hash of the code, so the relay can't reverse it to get the key.
 */
async function getBlobKey(syncCode: string): Promise<string> {
  const encoded = new TextEncoder().encode(syncCode.replace(/[-\s]/g, "").toUpperCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stripEtag(value: string | null): string | null {
  if (value == null) return null;
  const t = value.trim();
  if (t.startsWith("W/")) return stripEtag(t.slice(2));
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) return t.slice(1, -1);
  return t;
}

/**
 * Upload encrypted state to the relay with If-Match concurrency.
 * ifMatch "0" means create (or legacy empty).
 */
async function uploadEncrypted(
  payload: EncryptedPayload,
  blobKey: string,
  relayUrl: string,
  deviceId: string,
  ifMatch: string,
): Promise<void> {
  const safeUrl = enforceHttps(relayUrl);
  const response = await fetch(`${safeUrl}/sync/${blobKey}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
      "If-Match": `"${ifMatch}"`,
    },
    body: JSON.stringify(payload),
  });
  if (response.status === 409) {
    throw new SyncConflictError(
      "Sync conflict: remote changed",
      stripEtag(response.headers.get("ETag")),
    );
  }
  if (!response.ok) {
    throw new Error(`Sync relay error: ${response.status}`);
  }
}

/**
 * Download encrypted state from the relay.
 * Returns null if no data exists yet (first sync).
 */
async function downloadEncrypted(
  blobKey: string,
  relayUrl: string,
  deviceId: string,
): Promise<RemoteBlob | null> {
  const safeUrl = enforceHttps(relayUrl);
  const response = await fetch(`${safeUrl}/sync/${blobKey}`, {
    method: "GET",
    headers: {
      "X-Device-Id": deviceId,
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Sync relay error: ${response.status}`);

  const body = await response.text();
  if (body.length > 5 * 1024 * 1024) {
    throw new Error("Sync payload exceeds maximum size (5MB)");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error("Invalid sync relay response: not valid JSON");
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("ciphertext" in payload) ||
    !("iv" in payload) ||
    typeof (payload as EncryptedPayload).ciphertext !== "string" ||
    typeof (payload as EncryptedPayload).iv !== "string"
  ) {
    throw new Error("Invalid sync relay response: missing ciphertext/iv");
  }

  const etag = stripEtag(response.headers.get("ETag")) ?? "0";
  return { payload: payload as EncryptedPayload, etag };
}

/**
 * Enforce HTTPS on relay URLs. Plaintext HTTP exposes deviceId + encrypted blobs
 * to network sniffers, defeating the purpose of E2E encryption metadata protection.
 */
function enforceHttps(relayUrl: string): string {
  if (!relayUrl.startsWith("https://")) {
    throw new Error("Sync relay must use HTTPS");
  }
  return relayUrl;
}

/**
 * Validate the shape of a decrypted sync payload before merging.
 * Prevents type-corrupt data from mangling local state.
 */
function validateDecryptedPayload(raw: string): RecallExportPayload {
  const parsed = parseImportPayload(raw);
  return parsed;
}

function mergeCounts(
  local: RecallStateSnapshot,
  merged: RecallStateSnapshot,
): { decks: number; cards: number; reviewLogs: number } {
  return {
    decks: merged.decks.length - local.decks.length,
    cards: merged.cards.length - local.cards.length,
    reviewLogs: merged.reviewLogs.length - local.reviewLogs.length,
  };
}

/**
 * One download → merge → upload attempt.
 * Returns partial SyncResult fields; throws SyncConflictError on 409.
 */
async function syncOnce(
  localState: RecallStateSnapshot,
  config: SyncConfig,
  deviceId: string,
  blobKey: string,
): Promise<Pick<SyncResult, "uploaded" | "downloaded" | "mergedSnapshot" | "changes">> {
  const relayUrl = resolveRelayUrl(config.relayUrl);
  const remote = await downloadEncrypted(blobKey, relayUrl, deviceId);

  if (remote) {
    const remoteJson = await decryptData(remote.payload, config.syncCode);
    const remoteData = validateDecryptedPayload(remoteJson);
    const merged = mergeImportPayload(localState, remoteData);
    const exportPayload = buildExportPayload(merged);
    const encrypted = await encryptData(JSON.stringify(exportPayload), config.syncCode);
    await uploadEncrypted(encrypted, blobKey, relayUrl, deviceId, remote.etag);
    return {
      downloaded: true,
      uploaded: true,
      mergedSnapshot: merged,
      changes: mergeCounts(localState, merged),
    };
  }

  // First sync — create with If-Match: 0
  const exportPayload = buildExportPayload(localState);
  const encrypted = await encryptData(JSON.stringify(exportPayload), config.syncCode);
  await uploadEncrypted(encrypted, blobKey, relayUrl, deviceId, "0");
  return {
    downloaded: false,
    uploaded: true,
    mergedSnapshot: null,
  };
}

export async function performEncryptedSync(
  localState: RecallStateSnapshot,
  config: SyncConfig,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    uploaded: false,
    downloaded: false,
    mergedSnapshot: null,
  };

  const deviceId = getDeviceId();
  const blobKey = await getBlobKey(config.syncCode);

  try {
    // Fail fast if relay missing/invalid before network
    resolveRelayUrl(config.relayUrl);
    try {
      const once = await syncOnce(localState, config, deviceId, blobKey);
      Object.assign(result, once);
      result.success = true;
    } catch (first) {
      if (!(first instanceof SyncConflictError)) throw first;
      // One retry: re-download + re-merge against latest remote
      const once = await syncOnce(localState, config, deviceId, blobKey);
      Object.assign(result, once);
      result.success = true;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error("Sync failed:", result.error);
  }

  return result;
}

/**
 * Test connectivity to the sync relay.
 * Returns true if the relay is reachable and responding.
 */
export async function testSyncRelay(relayUrl: string): Promise<boolean> {
  try {
    const safeUrl = resolveRelayUrl(relayUrl);
    const response = await fetch(`${safeUrl}/health`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete all synced data from the relay (unlink this sync code).
 */
export async function deleteSyncData(config: SyncConfig): Promise<boolean> {
  const deviceId = getDeviceId();
  const blobKey = await getBlobKey(config.syncCode);

  try {
    const safeUrl = resolveRelayUrl(config.relayUrl);
    const response = await fetch(`${safeUrl}/sync/${blobKey}`, {
      method: "DELETE",
      headers: { "X-Device-Id": deviceId },
    });
    return response.ok;
  } catch {
    return false;
  }
}
