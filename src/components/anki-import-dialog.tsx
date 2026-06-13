import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { parseAnkiApkg, type AnkiCard } from "@/services/anki-import";
import { useRecallStore } from "@/stores/recall-store";
import { createId } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, FileWarning, Layers, Tag, Upload, X } from "lucide-react";

interface ImportReport {
  deckName: string;
  totalFound: number;
  imported: number;
  failed: number;
  cardTypes: { basic: number; cloze: number };
  tags: string[];
}

export function AnkiImportDialog(): JSX.Element {
  const [openDialog, setOpenDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  const createDeck = useRecallStore((state) => state.createDeck);
  const createCard = useRecallStore((state) => state.createCard);

  function resetState(): void {
    setSelectedFile(null);
    setDeckName("");
    setReport(null);
  }

  async function handleFileSelect() {
    const filePath = await open({
      title: "Select Anki .apkg file",
      filters: [{ name: "Anki Package", extensions: ["apkg"] }],
    });

    if (typeof filePath === "string") {
      setSelectedFile(filePath);
      const fileName = filePath.split(/[/\\]/).pop() || "";
      setDeckName(fileName.replace(/\.apkg$/i, ""));
    }
  }

  async function handleImport() {
    if (!selectedFile || !deckName.trim()) {
      toast.error("Please select a file and enter a deck name");
      return;
    }

    setIsImporting(true);
    try {
      const ankiCards = await parseAnkiApkg(selectedFile);

      if (ankiCards.length === 0) {
        toast.warning("No cards found in the selected .apkg file");
        setIsImporting(false);
        return;
      }

      const newDeckId = await createDeck({
        name: deckName.trim(),
        description: `Imported from Anki on ${new Date().toLocaleDateString()}`,
        color: "blue",
      });

      let imported = 0;
      let failed = 0;
      let basicCount = 0;
      let clozeCount = 0;
      const tagSet = new Set<string>();

      for (const ankiCard of ankiCards) {
        try {
          await createCard({
            deckId: newDeckId,
            front: ankiCard.front.trim(),
            back: ankiCard.back.trim(),
            hint: "",
            tags: ankiCard.tags.filter((t) => t.trim() !== ""),
          });
          imported++;

          // Detect card type
          if (/\{\{c\d+::[^}]+\}\}/.test(ankiCard.front)) {
            clozeCount++;
          } else {
            basicCount++;
          }

          // Collect tags
          for (const t of ankiCard.tags) {
            if (t.trim()) tagSet.add(t.trim());
          }
        } catch (err) {
          console.error("Failed to create card:", err);
          failed++;
        }
      }

      setReport({
        deckName: deckName.trim(),
        totalFound: ankiCards.length,
        imported,
        failed,
        cardTypes: { basic: basicCount, cloze: clozeCount },
        tags: [...tagSet].sort(),
      });
    } catch (error) {
      console.error("Anki import failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import Anki file");
    } finally {
      setIsImporting(false);
    }
  }

  function handleClose(): void {
    setOpenDialog(false);
    resetState();
  }

  return (
    <Dialog open={openDialog} onOpenChange={(open) => { setOpenDialog(open); if (!open) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          Import from Anki
        </Button>
      </DialogTrigger>

      {/* Import form screen */}
      {!report && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Anki Deck</DialogTitle>
            <DialogDescription>
              Select an .apkg file to import your existing Anki cards into Recall.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deck-name">Deck Name</Label>
              <Input
                id="deck-name"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="My Imported Deck"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-select">Anki File (.apkg)</Label>
              <div className="flex gap-2">
                <Input
                  id="file-select"
                  value={selectedFile ? selectedFile.split(/[/\\]/).pop() : ""}
                  readOnly
                  placeholder="No file selected"
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleFileSelect} disabled={isImporting}>
                  Browse
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting || !selectedFile || !deckName.trim()}>
              {isImporting ? "Importing..." : "Import Cards"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}

      {/* Import report screen */}
      {report && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {report.failed > 0 ? (
                <FileWarning className="h-5 w-5 text-amber-500" />
              ) : (
                <Check className="h-5 w-5 text-emerald-500" />
              )}
              Import Complete
            </DialogTitle>
            <DialogDescription>
              Deck <span className="font-medium">{report.deckName}</span> created
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-2">
              <ReportTile
                icon={Layers}
                label="Found"
                value={report.totalFound}
                color="text-muted-foreground"
              />
              <ReportTile
                icon={Check}
                label="Imported"
                value={report.imported}
                color="text-emerald-500"
              />
              {report.failed > 0 && (
                <ReportTile
                  icon={X}
                  label="Failed"
                  value={report.failed}
                  color="text-red-500"
                />
              )}
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basic cards</span>
                <span className="font-medium">{report.cardTypes.basic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cloze cards</span>
                <span className="font-medium">{report.cardTypes.cloze}</span>
              </div>
            </div>

            {report.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Tag className="h-3 w-3" />
                  Tags found
                </div>
                <div className="flex flex-wrap gap-1">
                  {report.tags.slice(0, 10).map((t) => (
                    <span key={t} className="rounded bg-muted px-2 py-0.5 text-xs">
                      {t}
                    </span>
                  ))}
                  {report.tags.length > 10 && (
                    <span className="text-xs text-muted-foreground">
                      +{report.tags.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

function ReportTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
  color: string;
}): JSX.Element {
  return (
    <div className="rounded-md border bg-card p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
    </div>
  );
}