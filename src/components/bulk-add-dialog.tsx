import { Eye, FileText, Plus, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseBulkCards, type BulkCardInput } from "@/lib/bulk-parser";

interface BulkAddDialogProps {
  open: boolean;
  onClose: () => void;
  deckId: string;
  onImport: (cards: BulkCardInput[]) => Promise<void>;
}

export function BulkAddDialog({ open, onClose, deckId: _deckId, onImport }: BulkAddDialogProps): JSX.Element | null {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);

  const parsed = useMemo(() => parseBulkCards(text), [text]);

  if (!open) return null;

  // Note: example kept as a literal string (not via t()) because it demonstrates
  // the Q:/A: syntax and contains cloze markers ({{c1::...}}) that collide with
  // i18next interpolation. The structural markers are parser syntax, not UI copy.
  const example = `Q: What is the powerhouse of the cell?
A: Mitochondria

Q: {{c1::Tauri}} is a desktop framework written in {{c2::Rust}}
Source: tauri.app

---next deck: Geography---
Q: What is the capital of Indonesia?
A: Jakarta
Hint: On the island of Java
Tags: asia, capitals`;

  async function handleImport(): Promise<void> {
    if (parsed.length === 0) {
      toast.error(t("bulkAdd.noValidCards"));
      return;
    }
    setImporting(true);
    try {
      await onImport(parsed);
      toast.success(t("bulkAdd.imported", { count: parsed.length }));
      setText("");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("bulkAdd.unknownError");
      toast.error(t("bulkAdd.importFailed", { message }));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border bg-white dark:bg-zinc-900 p-6 shadow-sm animate-fade-in">
        <button onClick={onClose} className="absolute right-4 top-4 rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
          <h2 className="text-xl font-semibold">{t("bulkAdd.title")}</h2>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          {t("bulkAdd.instructionsPrefix")}{" "}
          <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">Q:</code>{" / "}
          <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">A:</code>{" "}
          {t("bulkAdd.instructionsSuffix")}
        </p>

        <textarea
          className="w-full h-48 rounded-md border bg-background p-4 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
          placeholder={t("bulkAdd.placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("bulkAdd.cardsDetected", { count: parsed.length })}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setText(example)}>
              {t("bulkAdd.loadExample")}
            </Button>
            <Button size="sm" onClick={() => void handleImport()} disabled={parsed.length === 0 || importing}>
              <Plus className="h-4 w-4 mr-1" />
              {importing ? t("bulkAdd.importing") : t("bulkAdd.importCards", { count: parsed.length })}
            </Button>
          </div>
        </div>

        {/* Preview */}
        {parsed.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("bulkAdd.preview")}</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {parsed.map((card, i) => (
                <div key={i} className="rounded-md border bg-zinc-50 dark:bg-zinc-800/50 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">#{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{card.front || <span className="italic text-zinc-500 dark:text-zinc-400">{t("bulkAdd.empty")}</span>}</div>
                      {card.back && <div className="text-zinc-500 dark:text-zinc-400 truncate mt-1">{card.back}</div>}
                      {card.hint && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t("bulkAdd.hintLabel")} {card.hint}</div>}
                      {card.nextDeckName && (
                        <Badge tone="warning" className="mt-1 text-xs">
                          → {card.nextDeckName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
