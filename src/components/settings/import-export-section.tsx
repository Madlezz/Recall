import { Download, Upload, Check } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsCard } from "./settings-card";
import { useRecallStore } from "@/stores/recall-store";
import { parseImportPayload } from "@/services/import-export";
import { openImportPayload, saveExportPayload } from "@/services/native-files";
import { isTauriRuntime } from "@/db/client";
import type { RecallExportPayload } from "@/types";

type ImportMode = "merge" | "replace";

export function ImportExportSection({
  importMode,
  setImportMode,
  setPendingReplace,
  lastAction,
  setLastAction,
}: {
  importMode: ImportMode;
  setImportMode: (mode: ImportMode) => void;
  setPendingReplace: (payload: RecallExportPayload | null) => void;
  lastAction: { type: string; time: string } | null;
  setLastAction: (action: { type: string; time: string } | null) => void;
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportData = useRecallStore((state) => state.exportData);
  const mergeData = useRecallStore((state) => state.mergeData);

  async function handleExport(): Promise<void> {
    try {
      const payload = exportData();
      const saved = await saveExportPayload(payload);
      if (saved) {
        toast.success("Data exported successfully");
        setLastAction({ type: "Exported backup", time: new Date().toLocaleTimeString() });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not export data: ${message}`);
    }
  }

  async function processImportPayload(raw: string): Promise<void> {
    const payload = parseImportPayload(raw);
    if (importMode === "replace") {
      setPendingReplace(payload);
      return;
    }
    await mergeData(payload);
    toast.success("Data imported and merged successfully");
    setLastAction({ type: "Imported and merged", time: new Date().toLocaleTimeString() });
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await processImportPayload(await file.text());
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
      await processImportPayload(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Invalid import file: ${message}. Make sure you're importing a valid Recall JSON export`);
    }
  }

  return (
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
      {lastAction && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          <span>{lastAction.type} at {lastAction.time}</span>
        </div>
      )}
    </SettingsCard>
  );
}
