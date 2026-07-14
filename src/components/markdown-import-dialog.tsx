import { useEffect } from "react";
import { FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialText?: string;
}

export function MarkdownImportDialog({ deckId, open: controlledOpen, onOpenChange, initialText }: MarkdownImportDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [cards, setCards] = useState<MarkdownCardInput[]>([]);
  const [targetDeckId, setTargetDeckId] = useState(deckId ?? "");
  const [loading, setLoading] = useState(false);
  const decks = useRecallStore((state) => state.decks);
  const createCard = useRecallStore((state) => state.createCard);

  // Pre-load text from drag-and-drop
  useEffect(() => {
    if (initialText && open) {
      const parsed = parseMarkdownCards(initialText);
      if (parsed.length > 0) setCards(parsed);
    }
  }, [initialText, open]);

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
      
      if (parsed.length === 0) {
        toast.error(t("markdownImport.noCardsFound"));
        return;
      }
      
      setCards(parsed);
      if (!targetDeckId && decks.length > 0) {
        setTargetDeckId(deckId ?? decks[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("markdownImport.unknownError");
      toast.error(t("markdownImport.couldNotReadFile", { message }));
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(): Promise<void> {
    if (!targetDeckId || cards.length === 0) return;
    let imported = 0;
    let failed = 0;
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
      } catch (err) {
        failed++;
        console.error("Failed to import card:", err);
      }
    }
    if (failed > 0) {
      toast.warning(t("markdownImport.partialImport", { imported, total: cards.length, failed }));
    } else {
      toast.success(t("markdownImport.importedSuccess", { count: imported }));
    }
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
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all">
          <FileText className="h-4 w-4 mr-1" />
          {t("markdownImport.importMd")}
        </button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,700px)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("markdownImport.title")}</DialogTitle>
          <DialogDescription>
            {t("markdownImport.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {cards.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <FileText className="h-12 w-12 text-on-surface-variant dark:text-on-surface-variant" />
              <p className="text-sm text-on-surface-variant dark:text-on-surface-variant">
                {t("markdownImport.selectFileHint")}
              </p>
              <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all" onClick={handleFilePick} disabled={loading}>
                {loading ? t("markdownImport.reading") : t("markdownImport.chooseFile")}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {t("markdownImport.cardsFound", { count: cards.length })}
                </p>
                <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all" onClick={handleFilePick} disabled={loading}>
                  {t("markdownImport.chooseDifferentFile")}
                </button>
              </div>

              <div className="space-y-2">
                <Label>{t("markdownImport.targetDeck")}</Label>
                <Select value={targetDeckId} onValueChange={setTargetDeckId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("markdownImport.selectDeck")} />
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
                    <p className="text-on-surface-variant dark:text-on-surface-variant truncate mt-1">{card.back}</p>
                    {(card.hint || card.tags.length > 0) && (
                      <div className="flex gap-2 mt-1.5">
                        {card.hint && (
                          <span className="text-xs bg-surface-container dark:bg-surface-container px-1.5 py-0.5 rounded">{t("markdownImport.hintLabel")}: {card.hint}</span>
                        )}
                        {card.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-surface-container dark:bg-surface-container text-text-primary dark:text-text-primary px-1.5 py-0.5 rounded">
                            {tag}
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
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all" onClick={handleClose}>
            {t("markdownImport.cancel")}
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all" onClick={handleImport} disabled={cards.length === 0 || !targetDeckId}>
            {t("markdownImport.importCards", { count: cards.length })}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
