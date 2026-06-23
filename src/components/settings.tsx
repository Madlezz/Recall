import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { isTauriRuntime } from "@/db/client";
import { useRecallStore } from "@/stores/recall-store";
import type { RecallExportPayload } from "@/types";
import { AppearanceSection } from "./settings/appearance-section";
import { StudySection } from "./settings/study-section";
import { NotificationsSection } from "./settings/notifications-section";
import { ImportExportSection } from "./settings/import-export-section";
import { DataSection } from "./settings/data-section";
import { UpdatesSection } from "./settings/updates-section";

type ImportMode = "merge" | "replace";

export function Settings(): JSX.Element {
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [pendingReplace, setPendingReplace] = useState<RecallExportPayload | null>(null);
  const [lastAction, setLastAction] = useState<{ type: string; time: string } | null>(null);
  const replaceData = useRecallStore((state) => state.replaceData);

  async function handleReplace(): Promise<void> {
    if (!pendingReplace) return;
    try {
      await replaceData(pendingReplace);
      setPendingReplace(null);
      toast.success("Data replaced successfully");
      setLastAction({ type: "Replaced all data", time: new Date().toLocaleTimeString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not replace data: ${message}`);
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

      {/* Appearance + Audio */}
      <AppearanceSection />

      {/* FSRS + Study Settings */}
      <StudySection />

      {/* Notifications + Import/Export */}
      <section className="grid gap-4 lg:grid-cols-2">
        <NotificationsSection />
        <ImportExportSection
          importMode={importMode}
          setImportMode={setImportMode}
          pendingReplace={pendingReplace}
          setPendingReplace={setPendingReplace}
          lastAction={lastAction}
          setLastAction={setLastAction}
        />
      </section>

      {/* Data Management */}
      <DataSection />

      {/* Updates (Tauri only) */}
      {isTauriRuntime() && <UpdatesSection />}

      {/* Replace Confirmation Dialog */}
      <AlertDialog open={pendingReplace !== null} onOpenChange={(open) => !open && setPendingReplace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes local decks, cards, reviews, and sessions before loading the import file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={() => void handleReplace()}>Replace data</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
