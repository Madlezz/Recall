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
 * For Tauri desktop, this can fall back to the existing folder-based sync
 * (sync.ts) if the user prefers local folder sync (Dropbox/Drive).
 */

import type { RecallStateSnapshot, RecallExportPayload } from "@/types";
import { buildExportPayload, mergeImportPayload } from "./import-export";
import { encryptData, decryptData, type EncryptedPayload } from "./crypto";

/**
 * Sync relay URL.
 * Default is the official Recall relay. Users can self-host by setting syncRelayUrl in settings.
 * The official relay is deployed as a Cloudflare Worker - see sync-relay/ directory.
 */
export function getDefaultRelayUrl(): string {
  return "https://sync.recall.app";
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

/**
 * Upload encrypted state to the relay.
 */
async function uploadEncrypted(
  payload: EncryptedPayload,
  blobKey: string,
  relayUrl: string,
  deviceId: string,
): Promise<boolean> {
  const response = await fetch(`${relayUrl}/sync/${blobKey}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
    },
    body: JSON.stringify(payload),
  });
  return response.ok;
}

/**
 * Download encrypted state from the relay.
 * Returns null if no data exists yet (first sync).
 */
async function downloadEncrypted(
  blobKey: string,
  relayUrl: string,
  deviceId: string,
): Promise<EncryptedPayload | null> {
  const response = await fetch(`${relayUrl}/sync/${blobKey}`, {
    method: "GET",
    headers: {
      "X-Device-Id": deviceId,
    },
  });

  if (response.status === 404) return null; // No data yet
  if (!response.ok) throw new Error(`Sync relay error: ${response.status}`);

  return (await response.json()) as EncryptedPayload;
}

/**
 * Perform a full bidirectional sync:
 * 1. Download remote encrypted blob
 * 2. Decrypt it
 * 3. Merge with local state
 * 4. Re-encrypt merged state
 * 5. Upload to relay
 *
 * @param localState Current local state
 * @param config Sync configuration
 * @returns Sync result with merged snapshot
 */
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
    // Step 1: Download remote blob
    const remotePayload = await downloadEncrypted(blobKey, config.relayUrl, deviceId);

    if (remotePayload) {
      // Step 2: Decrypt remote data
      const remoteJson = await decryptData(remotePayload, config.syncCode);
      const remoteData = JSON.parse(remoteJson) as RecallExportPayload;

      // Step 3: Merge remote into local
      const beforeDecks = localState.decks.length;
      const beforeCards = localState.cards.length;
      const beforeLogs = localState.reviewLogs.length;

      const merged = mergeImportPayload(localState, remoteData);

      result.downloaded = true;
      result.changes = {
        decks: merged.decks.length - beforeDecks,
        cards: merged.cards.length - beforeCards,
        reviewLogs: merged.reviewLogs.length - beforeLogs,
      };
      result.mergedSnapshot = merged;

      // Step 4: Encrypt merged state
      const exportPayload = buildExportPayload(merged);
      const encrypted = await encryptData(JSON.stringify(exportPayload), config.syncCode);

      // Step 5: Upload
      const uploaded = await uploadEncrypted(encrypted, blobKey, config.relayUrl, deviceId);
      result.uploaded = uploaded;
      result.success = uploaded;
    } else {
      // No remote data - first sync, just upload local state
      const exportPayload = buildExportPayload(localState);
      const encrypted = await encryptData(JSON.stringify(exportPayload), config.syncCode);
      const uploaded = await uploadEncrypted(encrypted, blobKey, config.relayUrl, deviceId);
      result.uploaded = uploaded;
      result.success = uploaded;
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
    const response = await fetch(`${relayUrl}/health`, { method: "GET" });
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
    const response = await fetch(`${config.relayUrl}/sync/${blobKey}`, {
      method: "DELETE",
      headers: { "X-Device-Id": deviceId },
    });
    return response.ok;
  } catch {
    return false;
  }
}
