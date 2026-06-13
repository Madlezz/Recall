/**
 * Desktop notification service — Tauri-native notifications.
 * Falls back gracefully in browser dev mode.
 */

let tauriNotification: {
  isPermissionGranted: () => Promise<boolean>;
  requestPermission: () => Promise<string>;
  sendNotification: (options: { title: string; body: string }) => void;
} | null = null;

async function initPlugin(): Promise<void> {
  if (tauriNotification) return;
  try {
    const mod = await import("@tauri-apps/plugin-notification");
    tauriNotification = {
      isPermissionGranted: mod.isPermissionGranted,
      requestPermission: mod.requestPermission,
      sendNotification: mod.sendNotification,
    };
  } catch {
    // Browser mode — notifications not available, fail silently
  }
}

async function ensurePermission(): Promise<boolean> {
  await initPlugin();
  if (!tauriNotification) return false;
  if (await tauriNotification.isPermissionGranted()) return true;
  const result = await tauriNotification.requestPermission();
  return result === "granted";
}

export async function sendDueReminder(dueCount: number): Promise<void> {
  const ok = await ensurePermission();
  if (!ok) return;

  const body =
    dueCount === 1
      ? "1 card is due for review."
      : `${dueCount} cards are due for review.`;

  tauriNotification!.sendNotification({
    title: "📚 Recall",
    body,
  });
}

/** Test notification — used from settings to verify it works */
export async function sendTestNotification(): Promise<boolean> {
  const ok = await ensurePermission();
  if (!ok) return false;

  tauriNotification!.sendNotification({
    title: "📚 Recall",
    body: "Notifications are working! You'll get reminders when cards are due.",
  });
  return true;
}