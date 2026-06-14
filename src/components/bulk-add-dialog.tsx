import { Eye, FileText, Plus, X } from "lucide-react";
import { useState, useMemo } from "react";
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
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);

  const parsed = useMemo(() => parseBulkCards(text), [text]);

  if (!open) return null;

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
      toast.error("No valid cards found");
      return;
    }
    setImporting(true);
    try {
      await onImport(parsed);
      toast.success(`Imported ${parsed.length} card(s)`);
      setText("");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border bg-card p-6 shadow-xl animate-fade-in">
        <button onClick={onClose} className="absolute right-4 top-4 rounded p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Bulk Add Cards</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Paste cards below using <code className="bg-muted px-1 rounded">Q:</code> / <code className="bg-muted px-1 rounded">A:</code> syntax.
          Blank lines separate cards. Cloze deletions are supported.
        </p>

        <textarea
          className="w-full h-48 rounded-md border bg-background p-4 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Paste your cards here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {parsed.length} card{parsed.length !== 1 ? "s" : ""} detected
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setText(example)}>
              Load example
            </Button>
            <Button size="sm" onClick={() => void handleImport()} disabled={parsed.length === 0 || importing}>
              <Plus className="h-4 w-4 mr-1" />
              {importing ? "Importing..." : `Import ${parsed.length} card${parsed.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>

        {/* Preview */}
        {parsed.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preview</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {parsed.map((card, i) => (
                <div key={i} className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground mt-0.5">#{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{card.front || <span className="italic text-muted-foreground">(empty)</span>}</div>
                      {card.back && <div className="text-muted-foreground truncate mt-1">{card.back}</div>}
                      {card.hint && <div className="text-xs text-muted-foreground mt-1">Hint: {card.hint}</div>}
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