import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { typeClass } from "@/lib/surface";
import { isTauriRuntime } from "@/db/client";
import { useRecallStore } from "@/stores/recall-store";
import type { RecallExportPayload } from "@/types";
import { AppearanceSection } from "./settings/appearance-section";
import { StudySection } from "./settings/study-section";
import { NotificationsSection } from "./settings/notifications-section";
import { ImportExportSection } from "./settings/import-export-section";
import { DataSection } from "./settings/data-section";
import { SyncSection } from "./settings/sync-section";
import { UpdatesSection } from "./settings/updates-section";

type ImportMode = "merge" | "replace";

export function Settings(): JSX.Element {
  const { t } = useTranslation();
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [pendingReplace, setPendingReplace] = useState<RecallExportPayload | null>(null);
  const [lastAction, setLastAction] = useState<{ type: string; time: string } | null>(null);
  const replaceData = useRecallStore((state) => state.replaceData);

  async function handleReplace(): Promise<void> {
    if (!pendingReplace) return;
    try {
      await replaceData(pendingReplace);
      setPendingReplace(null);
      toast.success(t("settings.dataReplacedSuccess"));
      setLastAction({ type: t("settings.replacedAllData"), time: new Date().toLocaleTimeString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(t("settings.dataReplaceFailed", { message }));
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <section>
        <p className={cn(typeClass.caption, "text-on-surface-variant tracking-[0.15em]")}>{t("settings.preferences")}</p>
        <h1 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-text-primary dark:text-text-primary">{t("settings.title")}</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-on-surface-variant dark:text-on-surface-variant">
          {t("settings.headerDescription")}
        </p>
      </section>

      {/* Tabbed settings */}
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t("settings.general")}</TabsTrigger>
          <TabsTrigger value="study">{t("settings.study")}</TabsTrigger>
          <TabsTrigger value="data">{t("settings.data")}</TabsTrigger>
          {isTauriRuntime() && <TabsTrigger value="about">{t("settings.about")}</TabsTrigger>}
        </TabsList>

        {/* General: Appearance + Notifications */}
        <TabsContent value="general" className="space-y-6">
          <AppearanceSection />
          <NotificationsSection />
        </TabsContent>

        {/* Study: FSRS + scheduling */}
        <TabsContent value="study">
          <StudySection />
        </TabsContent>

        {/* Data: Import/Export + Sync + Danger Zone */}
        <TabsContent value="data" className="space-y-6">
          <ImportExportSection
            importMode={importMode}
            setImportMode={setImportMode}
            setPendingReplace={setPendingReplace}
            lastAction={lastAction}
            setLastAction={setLastAction}
          />
          <SyncSection />
          <DataSection />
        </TabsContent>

        {/* About: Updates (Tauri only) */}
        {isTauriRuntime() && (
          <TabsContent value="about">
            <UpdatesSection />
          </TabsContent>
        )}
      </Tabs>

      {/* Replace Confirmation Dialog */}
      <AlertDialog open={pendingReplace !== null} onOpenChange={(open) => !open && setPendingReplace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.replaceDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.replaceDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <button
                className="inline-flex items-center justify-center rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all"
                onClick={() => void handleReplace()}
              >
                {t("settings.replaceData")}
              </button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
