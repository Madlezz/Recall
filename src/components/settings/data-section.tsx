import { HardDrive, Layers, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      toast.success(t("settings.seedDataRestored"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(t("settings.dataResetFailed", { message }));
    }
  }

  async function handleStartFresh(): Promise<void> {
    try {
      await startFresh();
      toast.success(t("settings.allDataDeleted"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(t("settings.dataDeleteFailed", { message }));
    }
  }

  return (
    <>
      {/* Data Health */}
      <section>
        <h3 className="mb-4 text-sm font-bold text-text-primary dark:text-text-primary">{t("settings.dataHealth")}</h3>
        <div className="rounded-lg border border-outline-variant bg-surface dark:border-outline-variant dark:bg-surface divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="flex items-center gap-2.5 text-on-surface-variant"><Layers className="h-4 w-4" /> {t("settings.cardsLabel")}</span>
            <span className="font-semibold tabular-nums text-text-primary dark:text-text-primary">{t("settings.cardsInDecks", { cards: cards.length, decks: decks.length })}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="flex items-center gap-2.5 text-on-surface-variant"><HardDrive className="h-4 w-4" /> {t("settings.reviewsLabel")}</span>
            <span className="font-semibold tabular-nums text-text-primary dark:text-text-primary">{t("settings.totalReviews", { count: reviewLogs.length })}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="flex items-center gap-2.5 text-on-surface-variant"><HardDrive className="h-4 w-4" /> {t("settings.sessionsLabel")}</span>
            <span className="font-semibold tabular-nums text-text-primary dark:text-text-primary">{t("settings.sessionsCompleted", { count: studySessions.length })}</span>
          </div>
          <div className="px-5 py-3 text-xs text-on-surface-variant">
            {isTauriRuntime() ? "SQLite (recall.db)" : t("settings.browserStorage")} · {t("settings.exportJsonHint")}
          </div>
        </div>
      </section>

      {/* Auto-Backup */}
      <section>
        <h3 className="mb-4 text-sm font-bold text-text-primary dark:text-text-primary">{t("settings.autoBackup")}</h3>
        <div className="rounded-lg border border-outline-variant bg-surface p-5 dark:border-outline-variant dark:bg-surface">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={settings.backupSchedule}
              onValueChange={(v) => void updateSettings({ backupSchedule: v as "daily" | "weekly" | "never" })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">{t("settings.scheduleNever")}</SelectItem>
                <SelectItem value="daily">{t("settings.scheduleDaily")}</SelectItem>
                <SelectItem value="weekly">{t("settings.scheduleWeekly")}</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={async () => {
                try {
                  const { open } = await import("@tauri-apps/plugin-dialog");
                  const folder = await open({ directory: true, title: t("settings.chooseBackupFolder") });
                  if (folder) {
                    await updateSettings({ backupFolder: folder as string });
                    toast.success(t("settings.backupFolderSet"));
                  }
                } catch {
                  toast.error(t("settings.folderPickerTauriOnly"));
                }
              }}
              className="flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-background dark:border-outline dark:text-on-surface-variant dark:hover:bg-surface-container/50"
            >
              <Save className="h-3.5 w-3.5" />
              {settings.backupFolder ? t("settings.changeFolder") : t("settings.pickFolder")}
            </button>
            {settings.backupFolder && (
              <span className="text-xs text-on-surface-variant truncate max-w-[200px]">{settings.backupFolder}</span>
            )}
          </div>
          {settings.lastBackupAt ? (
            <p className="mt-3 text-xs text-on-surface-variant">
              <Save className="inline h-3 w-3 mr-1" />
              {t("settings.lastBackup")}: {new Date(settings.lastBackupAt).toLocaleDateString()}
            </p>
          ) : (
            <p className="mt-3 text-xs text-on-surface-variant">{t("settings.noBackupsYet")}</p>
          )}
        </div>
      </section>

      {/* Cloud Sync */}
      <section>
        <h3 className="mb-4 text-sm font-bold text-text-primary dark:text-text-primary">{t("settings.cloudSync")}</h3>
        <div className="rounded-lg border border-outline-variant bg-surface p-5 dark:border-outline-variant dark:bg-surface">
          <p className="text-sm text-on-surface-variant dark:text-on-surface-variant mb-4">
            {t("settings.cloudSyncDescription")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.syncEnabled}
                onChange={(e) => void updateSettings({ syncEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-text-secondary dark:text-text-secondary">{t("settings.enableSync")}</span>
            </label>
            <button
              onClick={async () => {
                try {
                  const { open } = await import("@tauri-apps/plugin-dialog");
                  const folder = await open({ directory: true, title: t("settings.chooseSyncFolder") });
                  if (folder) {
                    await updateSettings({ syncFolder: folder as string });
                    toast.success(t("settings.syncFolderSet"));
                  }
                } catch {
                  toast.error(t("settings.folderPickerTauriOnly"));
                }
              }}
              className="flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-background dark:border-outline dark:text-on-surface-variant dark:hover:bg-surface-container/50"
            >
              <Save className="h-3.5 w-3.5" />
              {settings.syncFolder ? t("settings.changeFolder") : t("settings.pickFolder")}
            </button>
            {settings.syncFolder && (
              <span className="text-xs text-on-surface-variant truncate max-w-[200px]">{settings.syncFolder}</span>
            )}
            {settings.syncFolder && (
              <button
                onClick={async () => {
                  try {
                    toast.loading(t("settings.syncing"), { id: "sync" });
                    await performSync();
                    toast.success(t("settings.syncComplete"), { id: "sync" });
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : t("settings.syncFailed"), { id: "sync" });
                  }
                }}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("settings.syncNow")}
              </button>
            )}
          </div>
          {settings.syncFolder && (
            <p className="mt-3 text-xs text-on-surface-variant">
              {t("settings.dataWillSyncTo")}: <code className="text-xs">{settings.syncFolder}</code>
            </p>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h3 className="mb-4 text-sm font-bold text-destructive">{t("settings.dangerZone")}</h3>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 space-y-5">
          <div>
            <p className="text-sm font-medium text-text-secondary dark:text-text-secondary mb-1">{t("settings.deleteAllData")}</p>
            <p className="text-sm text-on-surface-variant dark:text-on-surface-variant mb-3">
              {t("settings.deleteAllDataDescription")}
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-md bg-destructive px-3.5 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90">
                  <Trash2 className="h-4 w-4" /> {t("settings.deleteAllData")}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.deleteAllDataTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.deleteAllDataWarning")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertCancelButton />
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={() => void handleStartFresh()}>{t("settings.deleteEverything")}</Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="border-t border-red-200 dark:border-red-900 pt-5">
            <p className="text-sm font-medium text-text-secondary dark:text-text-secondary mb-1">{t("settings.restoreDemoDecks")}</p>
            <p className="text-sm text-on-surface-variant dark:text-on-surface-variant mb-3">
              {t("settings.restoreDemoDescription")}
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-md bg-destructive px-3.5 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90">
                  <RotateCcw className="h-4 w-4" /> {t("settings.restoreDemoDecks")}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.restoreDemoTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.restoreDemoWarning")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertCancelButton />
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={() => void handleReset()}>{t("settings.restoreDemoDecks")}</Button>
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
