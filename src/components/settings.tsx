import { Download, HardDrive, Layers, Moon, RotateCcw, Sun, Upload, Bell, BellOff, Volume2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
      toast.error(error instanceof Error ? error.message : "Could not save theme");
    }
  }

  async function handleExport(): Promise<void> {
    try {
      const payload = exportData();
      const saved = await saveExportPayload(payload);
      if (saved) {
        toast.success("Export ready");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export data");
    }
  }

  async function handleReset(): Promise<void> {
    try {
      await resetData();
      toast.success("Seed data restored");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset data");
    }
  }

  async function handleReplace(): Promise<void> {
    if (!pendingReplace) {
      return;
    }

    try {
      await replaceData(pendingReplace);
      setPendingReplace(null);
      toast.success("Import replaced local data");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not replace data");
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const payload = parseImportPayload(await file.text());
      if (importMode === "replace") {
        setPendingReplace(payload);
        return;
      }

      await mergeData(payload);
      toast.success("Import merged");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid import file");
    }
  }

  async function handleNativeImport(): Promise<void> {
    try {
      const raw = await openImportPayload();
      if (!raw) {
        if (!isTauriRuntime()) {
          fileInputRef.current?.click();
        }
        return;
      }

      const payload = parseImportPayload(raw);
      if (importMode === "replace") {
        setPendingReplace(payload);
        return;
      }

      await mergeData(payload);
      toast.success("Import merged");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid import file");
    }
  }

  return (
    <div className="animate-fade-in space-y-8">
      <section>
        <p className="text-sm font-medium text-primary">Preferences</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Everything stays local. Export JSON when you want a portable backup.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Appearance" description="Theme is stored locally.">
                          <div className="flex flex-wrap gap-2">
                            <Button variant={settings.theme === "dark" ? "default" : "outline"} onClick={() => void handleTheme("dark")}>
                              <Moon className="h-4 w-4" />
                              Dark
                            </Button>
                            <Button variant={settings.theme === "light" ? "default" : "outline"} onClick={() => void handleTheme("light")}>
                              <Sun className="h-4 w-4" />
                              Light
                            </Button>
                          </div>
                        </Panel>

                        <Panel title="Sound Volume" description="Master volume for card sounds, chimes, and ambient soundscapes.">
                          <div className="flex items-center gap-3">
                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={settings.soundVolume}
                              onChange={(e) => void updateSettings({ soundVolume: parseInt(e.target.value, 10) })}
                              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                            />
                            <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">
                              {settings.soundVolume}%
                            </span>
                          </div>
                        </Panel>

                <Panel title="Daily New Cards" description="Limit how many new cards appear per day to avoid overwhelm.">
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.dailyNewCardLimit}
                      onChange={(e) => void updateSettings({ dailyNewCardLimit: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">cards per day</span>
                  </div>
                </Panel>

                                <Panel title="Leech Detection" description="Cards failed more than this threshold are flagged as leeches (shown with ⚠️ in deck detail).">
                                                                  <div className="flex items-center gap-3">
                                                                    <Input
                                                                      type="number"
                                                                      min="1"
                                                                      max="20"
                                                                      value={settings.leechThreshold}
                                                                      onChange={(e) => void updateSettings({ leechThreshold: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)) })}
                                                                      className="w-24"
                                                                    />
                                                                    <span className="text-sm text-muted-foreground">lapses before flagged</span>
                                                                  </div>
                                                                </Panel>

                                        <Panel title="Daily Goal" description="Cards to review per day. Hit it and celebrate! 🎉">
                                          <div className="flex items-center gap-3">
                                            <Input
                                              type="number"
                                              min="1"
                                              max="500"
                                              value={settings.dailyGoal}
                                              onChange={(e) => void updateSettings({ dailyGoal: Math.max(1, Math.min(500, parseInt(e.target.value) || 20)) })}
                                              className="w-24"
                                            />
                                            <span className="text-sm text-muted-foreground">cards per day</span>
                                          </div>
                                        </Panel>

                                                                <Panel title="Notifications" description="Desktop reminders when cards are due. Only works in the Tauri desktop app.">
                                                                  <div className="flex items-center gap-3">
                                                                    <Button
                                                                      variant={settings.notificationsEnabled ? "default" : "outline"}
                                                                      onClick={() => void updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
                                                                    >
                                                                      {settings.notificationsEnabled ? (
                                                                        <><Bell className="h-4 w-4" /> Enabled</>
                                                                      ) : (
                                                                        <><BellOff className="h-4 w-4" /> Disabled</>
                                                                      )}
                                                                    </Button>
                                                                    {settings.notificationsEnabled ? (
                                                                      <Button variant="outline" size="sm" onClick={async () => {
                                                                        const ok = await sendTestNotification();
                                                                        if (ok) toast.success("Test notification sent!");
                                                                        else toast.error("Notifications not available (browser mode or permission denied)");
                                                                      }}>
                                                                        Test
                                                                      </Button>
                                                                    ) : null}
                                                                  </div>
                                                                </Panel>

                                                                <Panel title="Import / Export" description="JSON only. Merge skips duplicates by deck name and card front.">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr_1fr]">
            <Select value={importMode} onValueChange={(value) => setImportMode(value as ImportMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">Merge</SelectItem>
                <SelectItem value="replace">Replace</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void handleNativeImport()}>
              <Upload className="h-4 w-4" />
              Import Data
            </Button>
            <Button onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
                  </Panel>

                  <Panel title="Data Health" description="Your data lives on this device. Export regularly for safe backup.">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Layers className="h-4 w-4" />
                          Cards
                        </span>
                        <span className="font-semibold tabular-nums">{cards.length} in {decks.length} decks</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <HardDrive className="h-4 w-4" />
                          Reviews
                        </span>
                        <span className="font-semibold tabular-nums">{reviewLogs.length} total</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <HardDrive className="h-4 w-4" />
                          Sessions
                        </span>
                        <span className="font-semibold tabular-nums">{studySessions.length} completed</span>
                      </div>
                    </div>
                    <div className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                      <span className="font-medium">Storage:</span>{" "}
                      {typeof window !== "undefined" && (window as any).__TAURI__ ? "SQLite (recall.db)" : "Browser localStorage"}
                      {" · "}Export JSON for portable backup
                    </div>
                  </Panel>

                  <Panel title="Reset" description="Restore seeded demo data and clear local progress.">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <RotateCcw className="h-4 w-4" />
                Reset All Data
              </Button>
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
                  <Button
                    variant="destructive"
                    onClick={() => void handleReset()}
                  >
                    Reset data
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Panel>
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
              <Button
                variant="destructive"
                onClick={() => void handleReplace()}
              >
                Replace data
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface PanelProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function Panel({ title, description, children }: PanelProps): JSX.Element {
  return (
    <article className="rounded-lg border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </article>
  );
}
