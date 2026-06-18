import { Download, FolderOpen, HardDrive, Layers, Moon, RotateCcw, Save, Sun, Upload, Bell, BellOff, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
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
import { parseImportPayload } from "@/services/import-export";
import { openImportPayload, saveExportPayload } from "@/services/native-files";
import { useRecallStore } from "@/stores/recall-store";
import { sendTestNotification } from "@/services/notifications";
import type { RecallExportPayload, Theme } from "@/types";

type ImportMode = "merge" | "replace";

export function Settings(): JSX.Element {
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [pendingReplace, setPendingReplace] = useState<RecallExportPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settings = useRecallStore((state) => state.settings);
  const cards = useRecallStore((state) => state.cards);
  const decks = useRecallStore((state) => state.decks);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const studySessions = useRecallStore((state) => state.studySessions);
  const setTheme = useRecallStore((state) => state.setTheme);
  const updateSettings = useRecallStore((state) => state.updateSettings);
  const resetData = useRecallStore((state) => state.resetData);
  const exportData = useRecallStore((state) => state.exportData);
  const mergeData = useRecallStore((state) => state.mergeData);
  const replaceData = useRecallStore((state) => state.replaceData);

  async function handleTheme(theme: Theme): Promise<void> {
    try {
      await setTheme(theme);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not change theme: ${message}`);
    }
  }

  async function handleExport(): Promise<void> {
    try {
      const payload = exportData();
      const saved = await saveExportPayload(payload);
      if (saved) toast.success("Data exported successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not export data: ${message}`);
    }
  }

  async function handleReset(): Promise<void> {
    try {
      await resetData();
      toast.success("Seed data restored. All your cards and review history have been reset");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not reset data: ${message}`);
    }
  }

  async function handleReplace(): Promise<void> {
    if (!pendingReplace) return;
    try {
      await replaceData(pendingReplace);
      setPendingReplace(null);
      toast.success("Data replaced successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not replace data: ${message}`);
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const payload = parseImportPayload(await file.text());
      if (importMode === "replace") {
        setPendingReplace(payload);
        return;
      }
      await mergeData(payload);
      toast.success("Data imported and merged successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Invalid import file: ${message}. Make sure you're importing a valid Recall JSON export`);
    }
  }

  async function handleNativeImport(): Promise<void> {
    try {
      const raw = await openImportPayload();
      if (!raw) {
        if (!isTauriRuntime()) fileInputRef.current?.click();
        return;
      }
      const payload = parseImportPayload(raw);
      if (importMode === "replace") {
        setPendingReplace(payload);
        return;
      }
      await mergeData(payload);
      toast.success("Data imported and merged successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Invalid import file: ${message}. Make sure you're importing a valid Recall JSON export`);
    }
  }

  return (
    <div className="animate-fade-in space-y-10">
      {/* Header */}
      <section>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Preferences</p>
        <h1 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Everything stays local. Export JSON when you want a portable backup.
        </p>
      </section>

      {/* Appearance + Sound */}
      <section className="grid gap-4 lg:grid-cols-2">
        <SettingsCard title="Appearance">
          <div className="flex gap-2">
            <button
              onClick={() => void handleTheme("dark")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
                settings.theme === "dark"
                  ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
            <button
              onClick={() => void handleTheme("light")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
                settings.theme === "light"
                  ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
          </div>
        </SettingsCard>

        <SettingsCard title="Sound Volume">
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
            <input
              type="range"
              min="0" max="100"
              aria-label="Sound volume"
              value={settings.soundVolume}
              onChange={(e) => void updateSettings({ soundVolume: parseInt(e.target.value, 10) })}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-700 dark:bg-zinc-700 dark:accent-zinc-300"
            />
            <span className="w-9 text-right text-sm tabular-nums text-zinc-400" aria-live="polite">{settings.soundVolume}%</span>
          </div>
        </SettingsCard>
      </section>

      {/* Study settings */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SettingsCard title="Daily New Cards">
          <div className="flex items-center gap-2">
            <label htmlFor="daily-new-cards" className="sr-only">Daily new cards</label>
            <input
              id="daily-new-cards"
              type="number" min="0" max="100"
              value={settings.dailyNewCardLimit}
              onChange={(e) => void updateSettings({ dailyNewCardLimit: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
              className="w-20 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm text-zinc-400">cards/day</span>
          </div>
        </SettingsCard>

        <SettingsCard title="Leech Threshold">
          <div className="flex items-center gap-2">
            <label htmlFor="leech-threshold" className="sr-only">Leech threshold</label>
            <input
              id="leech-threshold"
              type="number" min="1" max="20"
              value={settings.leechThreshold}
              onChange={(e) => void updateSettings({ leechThreshold: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)) })}
              className="w-20 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm text-zinc-400">lapses</span>
          </div>
        </SettingsCard>

        <SettingsCard title="Daily Goal">
          <div className="flex items-center gap-2">
            <label htmlFor="daily-goal" className="sr-only">Daily goal</label>
            <input
              id="daily-goal"
              type="number" min="1" max="500"
              value={settings.dailyGoal}
              onChange={(e) => void updateSettings({ dailyGoal: Math.max(1, Math.min(500, parseInt(e.target.value) || 20)) })}
              className="w-20 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm text-zinc-400">cards/day</span>
          </div>
        </SettingsCard>
      </section>

      {/* Notifications */}
      <section className="grid gap-4 lg:grid-cols-2">
        <SettingsCard title="Notifications">
          <div className="flex items-center gap-2">
            <button
              onClick={() => void updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
              className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
                settings.notificationsEnabled
                  ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              {settings.notificationsEnabled ? <><Bell className="h-4 w-4" /> Enabled</> : <><BellOff className="h-4 w-4" /> Disabled</>}
            </button>
            {settings.notificationsEnabled && (
              <button
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                onClick={async () => {
                  const ok = await sendTestNotification();
                  if (ok) toast.success("Test notification sent!");
                  else toast.error("Notifications not available");
                }}
              >
                Test
              </button>
            )}
          </div>
        </SettingsCard>

        {/* Import / Export */}
        <SettingsCard title="Import / Export">
          <div className="flex items-center gap-2">
            <Select value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">Merge</SelectItem>
                <SelectItem value="replace">Replace</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => void handleNativeImport()}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            >
              <Upload className="h-3.5 w-3.5" /> Import
            </button>
            <button
              onClick={() => void handleExport()}
              className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
        </SettingsCard>
      </section>

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
              <FolderOpen className="h-3.5 w-3.5" />
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

      {/* Reset */}
      <section>
        <h3 className="mb-4 text-sm font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
        <div className="rounded-lg border border-red-200 bg-red-50/30 p-5 dark:border-red-900 dark:bg-red-950/20">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Restore seeded demo data and clear all local progress. This cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-md bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700">
                <RotateCcw className="h-4 w-4" /> Reset All Data
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears current decks, cards, reviews, and sessions, then restores seed data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertCancelButton />
                <AlertDialogAction asChild>
                  <Button variant="destructive" onClick={() => void handleReset()}>Reset data</Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <AlertDialog open={pendingReplace !== null} onOpenChange={(open) => !open && setPendingReplace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes local decks, cards, reviews, and sessions before loading the import file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertCancelButton />
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={() => void handleReplace()}>Replace data</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── SettingsCard ──

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3">{title}</h3>
      {children}
    </div>
  );
}