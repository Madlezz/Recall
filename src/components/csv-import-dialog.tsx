import { FileSpreadsheet, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
  const decks = useRecallStore((s) => s.decks);
  const createCard = useRecallStore((s) => s.createCard);
  const [targetDeck, setTargetDeck] = useState(deckId ?? "");
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const deckName = useMemo(
    () => decks.find((d) => d.id === targetDeck)?.name ?? "Select a deck",
    [decks, targetDeck],
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
        toast.error("CSV file is empty");
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
        toast.error("No valid card rows found (need at least front + back)");
        return;
      }

      setRows(csvRows);
      toast.success(`Parsed ${csvRows.length} cards`);
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
      toast.success(`Imported ${imported} card(s) to ${deckName}`);
      setRows(null);
      if (fileRef.current) fileRef.current.value = "";
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Import failed",
      );
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
            CSV Import
          </DialogTitle>
          <DialogDescription>
            Import cards from a CSV file. First column = front, second = back, third = hint, fourth = tags.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Deck selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Target deck</Label>
            <Select value={targetDeck} onValueChange={setTargetDeck}>
              <SelectTrigger>
                <SelectValue placeholder="Select a deck" />
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
            <Label className="text-xs">CSV file</Label>
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
              Format: <code className="text-zinc-900 dark:text-zinc-100">front,back,hint,tags</code> (one card per line)
            </p>
          </div>

          {/* Preview */}
          {rows && rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium">
                Preview — {rows.length} card(s) ready
              </p>
              <div className="max-h-48 overflow-y-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-100/50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Front</th>
                      <th className="px-2 py-1.5 text-left">Back</th>
                      <th className="px-2 py-1.5 text-left">Hint</th>
                      <th className="px-2 py-1.5 text-left">Tags</th>
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
                          ... and {rows.length - 20} more
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
            {rows ? `${rows.length} cards to import` : "Pick a file first"}
          </p>
          <Button
            onClick={() => void handleImport()}
            disabled={!rows || rows.length === 0 || !targetDeck || pending}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {pending ? "Importing..." : `Import ${rows?.length ?? 0} cards`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}