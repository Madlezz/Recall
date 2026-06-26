import { PackageOpen } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { openRecallPackage, restorePackageImages } from "@/services/import-export";
import { useRecallStore } from "@/stores/recall-store";

interface RecallImportDialogProps {
  deckId?: string;
}

export function RecallImportDialog({ deckId }: RecallImportDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pkgData, setPkgData] = useState<{
    deckName: string;
    cardCount: number;
    cards: Array<{ front: string; back: string; tags: string[] }>;
  } | null>(null);
  const [targetDeckId, setTargetDeckId] = useState(deckId ?? "");
  const [loading, setLoading] = useState(false);
  const decks = useRecallStore((state) => state.decks);
  const createCard = useRecallStore((state) => state.createCard);
  const createDeck = useRecallStore((state) => state.createDeck);

  async function handleOpen(): Promise<void> {
    setLoading(true);
    try {
      const result = await openRecallPackage();
      if (!result) {
        setLoading(false);
        return;
      }

      const { pkg } = result;
      setPkgData({
        deckName: pkg.metadata.deckName,
        cardCount: pkg.metadata.cardCount,
        cards: pkg.payload.cards.map((c) => ({
          front: c.front,
          back: c.back,
          tags: c.tags,
        })),
      });

      // Restore images in background
      if (Object.keys(pkg.images).length > 0) {
        restorePackageImages(pkg.images).then((report) => {
          if (report.warnings.length > 0) {
            toast.warning(report.warnings[0]);
          }
        }).catch(() => {
          // Image restore failures are non-fatal; cards still import
        });
      }

      // Auto-select matching deck or first available
      const match = decks.find((d) => d.name === pkg.metadata.deckName);
      if (match) {
        setTargetDeckId(match.id);
      } else if (!targetDeckId && decks.length > 0) {
        setTargetDeckId(decks[0].id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("recallImport.couldNotOpenFile"));
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(): Promise<void> {
    if (!pkgData) return;

    let targetId = targetDeckId;

    // Create deck if "new" selected
    if (targetId === "__new__") {
      try {
        const newId = await createDeck({ name: pkgData.deckName, description: "", color: "blue" });
        targetId = newId;
        setTargetDeckId(newId);
      } catch {
        toast.error(t("recallImport.couldNotCreateDeck"));
        return;
      }
    }

    if (!targetId || targetId === "__new__") return;

    let imported = 0;
    for (const card of pkgData.cards) {
      try {
        await createCard({
          deckId: targetId,
          front: card.front,
          back: card.back,
          hint: "",
          source: "",
          tags: card.tags,
        });
        imported++;
      } catch {
        // skip individual failures
      }
    }

    toast.success(t("recallImport.imported", { imported, total: pkgData.cards.length }));
    setOpen(false);
    setPkgData(null);
  }

  function handleClose(): void {
    setOpen(false);
    setPkgData(null);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleOpen}>
          <PackageOpen className="h-4 w-4 mr-1" />
          {t("recallImport.importRecall")}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,600px)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("recallImport.title")}</DialogTitle>
          <DialogDescription>
            {t("recallImport.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("recallImport.readingPackage")}</p>
          ) : pkgData ? (
            <>
              <div className="rounded-md border p-4 space-y-2">
                <p className="font-medium">{pkgData.deckName}</p>
                <p className="text-sm text-muted-foreground">{t("recallImport.cardCount", { count: pkgData.cardCount })}</p>
              </div>

              <div className="space-y-2">
                <Label>{t("recallImport.targetDeck")}</Label>
                <Select value={targetDeckId} onValueChange={setTargetDeckId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("recallImport.selectOrCreateDeck")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">{t("recallImport.createNewDeck", { name: pkgData.deckName })}</SelectItem>
                    {decks.map((deck) => (
                      <SelectItem key={deck.id} value={deck.id}>
                        {deck.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-[30vh] overflow-y-auto space-y-1 border rounded-md p-3">
                {pkgData.cards.slice(0, 20).map((card, i) => (
                  <div key={i} className="text-sm border-b last:border-0 py-1.5">
                    <p className="font-medium truncate">{card.front}</p>
                    <p className="text-muted-foreground truncate">{card.back}</p>
                  </div>
                ))}
                {pkgData.cards.length > 20 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    {t("recallImport.andMore", { count: pkgData.cards.length - 20 })}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <PackageOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {t("recallImport.selectFileHint")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("recallImport.cancel")}
          </Button>
          <Button onClick={handleImport} disabled={!pkgData || (!targetDeckId && targetDeckId !== "__new__")}>
            {t("recallImport.importCards", { count: pkgData ? pkgData.cardCount : 0 })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
