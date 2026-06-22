import type { RecallStateSnapshot, RecallExportPayload } from "@/types";
import { buildExportPayload, mergeImportPayload } from "./import-export";

/**
 * Folder-based sync service
 *
 * Syncs data to/from a user-chosen folder (e.g., Dropbox, Google Drive).
 * Uses merge-on-import to handle conflicts gracefully.
 */

export interface SyncResult {
  success: boolean;
  exported: boolean;
  imported: boolean;
  error?: string;
}

/**
 * Export current state to sync folder
 */
export async function exportToSyncFolder(
  state: RecallStateSnapshot,
  syncFolder: string,
): Promise<boolean> {
  try {
    const payload = buildExportPayload(state);
    const filename = "recall-sync.json";
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    await writeTextFile(await join(syncFolder, filename), JSON.stringify(payload, null, 2));
    return true;
  } catch (error) {
    console.error("Failed to export to sync folder:", error);
    return false;
  }
}

/**
 * Import and merge data from sync folder
 */
export async function importFromSyncFolder(
  syncFolder: string,
): Promise<RecallExportPayload | null> {
  try {
    const filename = "recall-sync.json";
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    const content = await readTextFile(await join(syncFolder, filename));
    const data = JSON.parse(content) as RecallExportPayload;

    // Validate version
    if (data.version !== 2) {
      console.error("Unsupported sync file version:", data.version);
      return null;
    }

    return data;
  } catch (error) {
    // File doesn't exist or can't be read — not an error
    return null;
  }
}

/**
 * Perform bidirectional sync:
 * 1. Import from sync folder (merge into local)
 * 2. Export to sync folder (overwrite with merged state)
 */
export async function performSync(
  state: RecallStateSnapshot,
  syncFolder: string,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    exported: false,
    imported: false,
  };

  try {
    // Step 1: Import from sync folder
    const remoteData = await importFromSyncFolder(syncFolder);
    if (remoteData) {
      // Merge remote data into local state
      const merged = mergeImportPayload(state, remoteData);
      result.imported = true;

      // Step 2: Export merged state to sync folder
      const exported = await exportToSyncFolder(merged, syncFolder);
      result.exported = exported;
      result.success = exported;
    } else {
      // No remote data — just export local state
      const exported = await exportToSyncFolder(state, syncFolder);
      result.exported = exported;
      result.success = exported;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error("Sync failed:", result.error);
  }

  return result;
}
