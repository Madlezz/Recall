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
import { Upload } from "lucide-react";

export function AnkiImportDialog(): JSX.Element {
  const [openDialog, setOpenDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const createDeck = useRecallStore((state) => state.createDeck);
  const createCard = useRecallStore((state) => state.createCard);

  async function handleFileSelect() {
    const filePath = await open({
      title: "Select Anki .apkg file",
      filters: [{ name: "Anki Package", extensions: ["apkg"] }],
    });

    if (typeof filePath === "string") {
      setSelectedFile(filePath);
      // Auto-fill deck name from filename
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
      // Parse the Anki file
      const ankiCards = await parseAnkiApkg(selectedFile);

      if (ankiCards.length === 0) {
        toast.warning("No cards found in the selected .apkg file");
        setIsImporting(false);
        return;
      }

      // Create a new deck
      const newDeckId = await createDeck({
        name: deckName.trim(),
        description: `Imported from Anki on ${new Date().toLocaleDateString()}`,
        color: "blue",
      });

      // Insert all cards with FSRS initial state
      let successCount = 0;
      for (const ankiCard of ankiCards) {
        try {
          await createCard({
            deckId: newDeckId,
            front: ankiCard.front.trim(),
            back: ankiCard.back.trim(),
            hint: "",
            tags: ankiCard.tags.filter((t) => t.trim() !== ""),
          });
          successCount++;
        } catch (err) {
          console.error("Failed to create card:", err);
        }
      }

      toast.success(`Successfully imported ${successCount} of ${ankiCards.length} cards`);
      setOpenDialog(false);
      setSelectedFile(null);
      setDeckName("");
    } catch (error) {
      console.error("Anki import failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import Anki file");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          Import from Anki
        </Button>
      </DialogTrigger>
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
          <Button variant="ghost" onClick={() => setOpenDialog(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !selectedFile || !deckName.trim()}>
            {isImporting ? "Importing..." : "Import Cards"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
