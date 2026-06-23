import { HardDrive, Layers, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertCancelButton,
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isTauriRuntime } from "@/db/client";
import { useRecallStore } from "@/stores/recall-store";

export function DataSection(): JSX.Element {
  const cards = useRecallStore((state) => state.cards);
  const decks = useRecallStore((state) => state.decks);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const studySessions = useRecallStore((state) => state.studySessions);
  const settings = useRecallStore((state) => state.settings);
  const updateSettings = useRecallStore((state) => state.updateSettings);
  const resetData = useRecallStore((state) => state.resetData);
  const startFresh = useRecallStore((state) => state.startFresh);
  const performSync = useRecallStore((state) => state.performSync);

  async function handleReset(): Promise<void> {
    try {
      await resetData();
      toast.success("Seed data restored. All your cards and review history have been reset");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not reset data: ${message}`);
    }
  }

  async function handleStartFresh(): Promise<void> {
    try {
      await startFresh();
      toast.success("All data deleted. Starting fresh with empty state");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not delete data: ${message}`);
    }
  }

  return (
    <>
      {/* Data Health */}
      <section>
        <h3 className="mb-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">Data Health</h3>
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="flex items-center gap-2.5 text-zinc-500"><Layers className="h-4 w-4" /> Cards</span>
            <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{cards.length} in {decks.length} decks</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="flex items-center gap-2.5 text-zinc-500"><HardDrive className="h-4 w-4" /> Reviews</span>
            <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{reviewLogs.length} total</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="flex items-center gap-2.5 text-zinc-500"><HardDrive className="h-4 w-4" /> Sessions</span>
            <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{studySessions.length} completed</span>
          </div>
          <div className="px-5 py-3 text-xs text-zinc-400">
            {isTauriRuntime() ? "SQLite (recall.db)" : "Browser localStorage"} · Export JSON for portable backup
          </div>
        </div>
      </section>

      {/* Auto-Backup */}
      <section>
        <h3 className="mb-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">Auto-Backup</h3>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={settings.backupSchedule}
              onValueChange={(v) => void updateSettings({ backupSchedule: v as "daily" | "weekly" | "never" })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={async () => {
                try {
                  const { open } = await import("@tauri-apps/plugin-dialog");
                  const folder = await open({ directory: true, title: "Choose backup folder" });
                  if (folder) {
                    await updateSettings({ backupFolder: folder as string });
                    toast.success("Backup folder set");
                  }
                } catch {
                  toast.error("Folder picker only works in the Tauri desktop app");
                }
              }}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            >
              <Save className="h-3.5 w-3.5" />
              {settings.backupFolder ? "Change Folder" : "Pick Folder"}
            </button>
            {settings.backupFolder && (
              <span className="text-xs text-zinc-400 truncate max-w-[200px]">{settings.backupFolder}</span>
            )}
          </div>
          {settings.lastBackupAt ? (
            <p className="mt-3 text-xs text-zinc-400">
              <Save className="inline h-3 w-3 mr-1" />
              Last backup: {new Date(settings.lastBackupAt).toLocaleDateString()}
            </p>
          ) : (
            <p className="mt-3 text-xs text-zinc-400">No backups yet. Set a schedule and pick a folder.</p>
          )}
        </div>
      </section>

      {/* Cloud Sync */}
      <section>
        <h3 className="mb-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">Cloud Sync</h3>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Sync your data to a cloud folder (Dropbox, Google Drive, OneDrive, etc.) for backup and multi-device access.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.syncEnabled}
                onChange={(e) => void updateSettings({ syncEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Enable sync</span>
            </label>
            <button
              onClick={async () => {
                try {
                  const { open } = await import("@tauri-apps/plugin-dialog");
                  const folder = await open({ directory: true, title: "Choose sync folder" });
                  if (folder) {
                    await updateSettings({ syncFolder: folder as string });
                    toast.success("Sync folder set");
                  }
                } catch {
                  toast.error("Folder picker only works in the Tauri desktop app");
                }
              }}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            >
              <Save className="h-3.5 w-3.5" />
              {settings.syncFolder ? "Change Folder" : "Pick Folder"}
            </button>
            {settings.syncFolder && (
              <span className="text-xs text-zinc-400 truncate max-w-[200px]">{settings.syncFolder}</span>
            )}
            {settings.syncFolder && (
              <button
                onClick={async () => {
                  try {
                    toast.loading("Syncing...", { id: "sync" });
                    await performSync();
                    toast.success("Sync complete", { id: "sync" });
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Sync failed", { id: "sync" });
                  }
                }}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync Now
              </button>
            )}
          </div>
          {settings.syncFolder && (
            <p className="mt-3 text-xs text-zinc-400">
              Data will be synced to: <code className="text-xs">{settings.syncFolder}</code>
            </p>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h3 className="mb-4 text-sm font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
        <div className="rounded-lg border border-red-200 bg-red-50/30 p-5 dark:border-red-900 dark:bg-red-950/20 space-y-5">
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Delete All Data</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Permanently delete all decks, cards, and review history. Starts with a completely empty state.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-md bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700">
                  <Trash2 className="h-4 w-4" /> Delete All Data
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes all your decks, cards, reviews, and sessions. You will start with an empty state — no demo data will be loaded. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertCancelButton />
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={() => void handleStartFresh()}>Delete everything</Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="border-t border-red-200 dark:border-red-900 pt-5">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Restore Demo Decks</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Reset to the built-in demo decks. Clears all your current data and replaces it with sample content.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-md bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700">
                  <RotateCcw className="h-4 w-4" /> Restore Demo Decks
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restore demo decks?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears current decks, cards, reviews, and sessions, then restores the built-in demo decks. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertCancelButton />
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={() => void handleReset()}>Restore demo decks</Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>
    </>
  );
}
