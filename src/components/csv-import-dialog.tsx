import { FileSpreadsheet, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecallStore } from "@/stores/recall-store";

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pre-select a deck when opened from deck detail */
  deckId?: string | null;
}

interface CsvRow {
  front: string;
  back: string;
  hint: string;
  tags: string;
}

export function CsvImportDialog({ open, onClose, deckId }: CsvImportDialogProps): JSX.Element {
  const { t } = useTranslation();
  const decks = useRecallStore((s) => s.decks);
  const createCard = useRecallStore((s) => s.createCard);
  const [targetDeck, setTargetDeck] = useState(deckId ?? "");
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const deckName = useMemo(
    () => decks.find((d) => d.id === targetDeck)?.name ?? t("csvImport.selectDeck"),
    [decks, targetDeck, t],
  );

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote inside quoted string
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
      i++;
    }
    result.push(current.trim());
    return result;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) {
        toast.error(t("csvImport.fileEmpty"));
        return;
      }

      const parsed = lines.map(parseCsvLine);

      // Detect if first row is a header
      const first = parsed[0].map((s) => s.toLowerCase().replace(/^"|"$/g, ""));
      const hasHeader =
        first.includes("front") || first.includes("back") || first.includes("question");

      const dataRows = hasHeader ? parsed.slice(1) : parsed;

      const csvRows: CsvRow[] = dataRows
        .filter((cols) => cols.length >= 2 && cols[0] && cols[1])
        .map((cols) => ({
          front: cols[0]?.replace(/^"|"$/g, "") ?? "",
          back: cols[1]?.replace(/^"|"$/g, "") ?? "",
          hint: cols[2]?.replace(/^"|"$/g, "") ?? "",
          tags: cols[3]?.replace(/^"|"$/g, "") ?? "",
        }));

      if (csvRows.length === 0) {
        const skipped = dataRows.length - csvRows.length;
        toast.error(t("csvImport.noValidCards", { skipped }));
        return;
      }

      setRows(csvRows);
      toast.success(t("csvImport.parsedCards", { count: csvRows.length }));
    };
    reader.readAsText(file);
  }

  async function handleImport(): Promise<void> {
    if (!rows || !targetDeck) return;
    setPending(true);
    let imported = 0;
    try {
      for (const row of rows) {
        await createCard({
          deckId: targetDeck,
          front: row.front,
          back: row.back,
          hint: row.hint,
          source: "",
          tags: row.tags
            .split(/[;,]/)
            .map((t) => t.trim())
            .filter(Boolean),
        });
        imported++;
      }
      toast.success(t("csvImport.importedTo", { count: imported, deck: deckName }));
      setRows(null);
      if (fileRef.current) fileRef.current.value = "";
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("csvImport.unknownError");
      toast.error(t("csvImport.importFailed", { message }));
    } finally {
      setPending(false);
    }
  }

  function handleOpenChange(isOpen: boolean): void {
    if (!isOpen) {
      setRows(null);
      if (fileRef.current) fileRef.current.value = "";
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            {t("csvImport.title")}
          </DialogTitle>
          <DialogDescription>
            {t("csvImport.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Deck selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("csvImport.targetDeck")}</Label>
            <Select value={targetDeck} onValueChange={setTargetDeck}>
              <SelectTrigger>
                <SelectValue placeholder={t("csvImport.selectDeck")} />
              </SelectTrigger>
              <SelectContent>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File picker */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("csvImport.csvFile")}</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="block w-full text-sm text-zinc-500 dark:text-zinc-400
                file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:text-zinc-900 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700 file:px-4 file:py-2
                file:text-sm file:font-medium"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("csvImport.formatLabel")}{" "}
              <code className="text-zinc-900 dark:text-zinc-100">front,back,hint,tags</code>{" "}
              {t("csvImport.oneCardPerLine")}
            </p>
          </div>

          {/* Preview */}
          {rows && rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium">
                {t("csvImport.previewReady", { count: rows.length })}
              </p>
              <div className="max-h-48 overflow-y-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-100/50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-2 py-1.5 text-left">{t("csvImport.front")}</th>
                      <th className="px-2 py-1.5 text-left">{t("csvImport.back")}</th>
                      <th className="px-2 py-1.5 text-left">{t("csvImport.hint")}</th>
                      <th className="px-2 py-1.5 text-left">{t("csvImport.tags")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="max-w-[120px] truncate px-2 py-1">{row.front}</td>
                        <td className="max-w-[120px] truncate px-2 py-1">{row.back}</td>
                        <td className="max-w-[80px] truncate px-2 py-1 text-zinc-500 dark:text-zinc-400">
                          {row.hint || "—"}
                        </td>
                        <td className="max-w-[80px] truncate px-2 py-1 text-zinc-500 dark:text-zinc-400">
                          {row.tags || "—"}
                        </td>
                      </tr>
                    ))}
                    {rows.length > 20 && (
                      <tr>
                        <td colSpan={4} className="px-2 py-1 text-center text-zinc-500 dark:text-zinc-400">
                          {t("csvImport.andMore", { count: rows.length - 20 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {rows ? t("csvImport.cardsToImport", { count: rows.length }) : t("csvImport.pickFileFirst")}
          </p>
          <Button
            onClick={() => void handleImport()}
            disabled={!rows || rows.length === 0 || !targetDeck || pending}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {pending ? t("csvImport.importing") : t("csvImport.importCards", { count: rows?.length ?? 0 })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
