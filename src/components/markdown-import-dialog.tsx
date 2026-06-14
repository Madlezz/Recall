import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseMarkdownCards, type MarkdownCardInput } from "@/lib/markdown-importer";
import { useRecallStore } from "@/stores/recall-store";

interface MarkdownImportDialogProps {
  deckId?: string;
}

export function MarkdownImportDialog({ deckId }: MarkdownImportDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<MarkdownCardInput[]>([]);
  const [targetDeckId, setTargetDeckId] = useState(deckId ?? "");
  const [loading, setLoading] = useState(false);
  const decks = useRecallStore((state) => state.decks);
  const createCard = useRecallStore((state) => state.createCard);

  async function handleFilePick(): Promise<void> {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const selected = await openDialog({
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
        multiple: false,
      });
      if (!selected) return;

      const path = typeof selected === "string" ? selected : (selected as { path: string }).path;
      setLoading(true);
      const content = await readTextFile(path);
      const parsed = parseMarkdownCards(content);
      setCards(parsed);
      if (!targetDeckId && decks.length > 0) {
        setTargetDeckId(deckId ?? decks[0].id);
      }
    } catch {
      toast.error("Could not read markdown file");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(): Promise<void> {
    if (!targetDeckId || cards.length === 0) return;
    let imported = 0;
    for (const card of cards) {
      try {
        await createCard({
          deckId: targetDeckId,
          front: card.front,
          back: card.back,
          hint: card.hint,
          source: "",
          tags: card.tags,
        });
        imported++;
      } catch {
        // skip individual failures
      }
    }
    toast.success(`Imported ${imported} of ${cards.length} cards`);
    setOpen(false);
    setCards([]);
  }

  function handleClose(): void {
    setOpen(false);
    setCards([]);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-1" />
          Import MD
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,700px)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Markdown</DialogTitle>
          <DialogDescription>
            Parse a Markdown file into flashcards. Supports heading-based (## question) and Q:/A: pair formats.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {cards.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Select a Markdown file to parse flashcards from it.
              </p>
              <Button onClick={handleFilePick} disabled={loading}>
                {loading ? "Reading..." : "Choose File"}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Found {cards.length} card{cards.length !== 1 ? "s" : ""}
                </p>
                <Button variant="ghost" size="sm" onClick={handleFilePick} disabled={loading}>
                  Choose different file
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Target Deck</Label>
                <Select value={targetDeckId} onValueChange={setTargetDeckId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a deck" />
                  </SelectTrigger>
                  <SelectContent>
                    {decks.map((deck) => (
                      <SelectItem key={deck.id} value={deck.id}>
                        {deck.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-[40vh] overflow-y-auto space-y-2 border rounded-md p-3">
                {cards.map((card, i) => (
                  <div key={i} className="border rounded-md p-3 text-sm">
                    <p className="font-medium truncate">{card.front}</p>
                    <p className="text-muted-foreground truncate mt-1">{card.back}</p>
                    {(card.hint || card.tags.length > 0) && (
                      <div className="flex gap-2 mt-1.5">
                        {card.hint && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Hint: {card.hint}</span>
                        )}
                        {card.tags.map((t) => (
                          <span key={t} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={cards.length === 0 || !targetDeckId}>
            Import {cards.length > 0 ? `${cards.length} cards` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}