import type { DownloadEvent } from "@tauri-apps/plugin-updater";

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

export interface UpdateMessages {
  noUpdateTitle: string;
  noUpdateBody: string;
  completeTitle: string;
  completeBody: string;
  failedTitle: string;
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (update) {
      return {
        version: update.version,
        currentVersion: update.currentVersion,
        body: update.body,
        date: update.date,
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to check for updates:", error);
    return null;
  }
}

export async function downloadAndInstallUpdate(
  messages: UpdateMessages,
  onProgress?: (event: DownloadEvent) => void
): Promise<void> {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const { message } = await import("@tauri-apps/plugin-dialog");

    const update = await check();
    if (!update) {
      await message(messages.noUpdateBody, { title: messages.noUpdateTitle, kind: "info" });
      return;
    }

    await update.downloadAndInstall(onProgress);
    await message(messages.completeBody, { title: messages.completeTitle, kind: "info" });
  } catch (error) {
    console.error("Failed to download and install update:", error);
    const { message } = await import("@tauri-apps/plugin-dialog");
    await message(
      `${messages.failedTitle}: ${error instanceof Error ? error.message : String(error)}`,
      { title: messages.failedTitle, kind: "error" }
    );
  }
}
