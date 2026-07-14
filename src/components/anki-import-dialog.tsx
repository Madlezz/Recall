import { toast } from "sonner";
import { parseAnkiApkg } from "@/services/anki-import";
import type { AnkiCard } from "@/services/anki-import";
import { useRecallStore } from "@/stores/recall-store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { AlertTriangle, BrainCircuit, CalendarClock, Check, FileWarning, Layers, Tag, Upload, X } from "lucide-react";

interface ImportReport {
  deckName: string;
  totalFound: number;
  imported: number;
  failed: number;
  cardTypes: { basic: number; cloze: number };
  tags: string[];
  warnings: string[];
  decksCreated: string[];
  mediaImported: number;
  schedulingPreserved: number;
  fsrsStateImported: number;
}

export function AnkiImportDialog(): JSX.Element {
  const { t } = useTranslation();
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
    const { open } = await import("@tauri-apps/plugin-dialog");
    const filePath = await open({
      title: t("ankiImport.dialogTitle"),
      filters: [{ name: t("ankiImport.ankiPackage"), extensions: ["apkg"] }],
    });

    if (typeof filePath === "string") {
      setSelectedFile(filePath);
      const fileName = filePath.split(/[/\\]/).pop() || "";
      setDeckName(fileName.replace(/\.apkg$/i, ""));
    }
  }

  async function handleImport() {
    if (!selectedFile && !deckName.trim()) {
      toast.error(t("ankiImport.errorSelectFileAndDeck"));
      return;
    }
    if (!selectedFile) {
      toast.error(t("ankiImport.errorSelectFile"));
      return;
    }
    if (!deckName.trim()) {
      toast.error(t("ankiImport.errorEnterDeckName"));
      return;
    }

    setIsImporting(true);
    try {
      const ankiReport = await parseAnkiApkg(selectedFile);
      const ankiCards = ankiReport.cards;

      if (ankiCards.length === 0) {
        toast.error(t("ankiImport.noCardsFound"));
        setIsImporting(false);
        return;
      }

      // Group cards by deck_name (preserves Anki hierarchy)
      const cardsByDeck = new Map<string, AnkiCard[]>();
      for (const card of ankiCards) {
        const deck = card.deck_name || deckName.trim();
        if (!cardsByDeck.has(deck)) cardsByDeck.set(deck, []);
        cardsByDeck.get(deck)!.push(card);
      }

      let imported = 0;
      let failed = 0;
      let basicCount = 0;
      let clozeCount = 0;
      let schedulingPreserved = 0;
      let fsrsStateImported = 0;
      const tagSet = new Set<string>();
      const decksCreated: string[] = [];

      // Create decks and import cards per deck
      for (const [ankiDeckName, deckCards] of cardsByDeck) {
        const resolvedName = cardsByDeck.size === 1
          ? deckName.trim()
          : `${deckName.trim()} :: ${ankiDeckName}`;

        const newDeckId = await createDeck({
          name: resolvedName,
          description: t("ankiImport.deckDescription", { date: new Date().toLocaleDateString() }),
          color: "blue",
        });
        decksCreated.push(resolvedName);

        for (const ankiCard of deckCards) {
          try {
            // Validate state is one of our CardState values
            const validStates = ["new", "learning", "review", "relearning"];
            const cardState = validStates.includes(ankiCard.state) ? ankiCard.state as "new" | "learning" | "review" | "relearning" : "new" as const;

            await createCard({
              deckId: newDeckId,
              front: ankiCard.front.trim(),
              back: ankiCard.back.trim(),
              hint: "",
              source: "",
              tags: ankiCard.tags.filter((tag) => tag.trim() !== ""),
              scheduling: {
                state: cardState,
                stability: ankiCard.stability,
                difficulty: ankiCard.difficulty,
                reps: ankiCard.reps,
                lapses: ankiCard.lapses,
                daysUntilNext: ankiCard.days_until_next,
              },
            });
            imported++;

            // Track scheduling preservation
            if (ankiCard.reps > 0 || ankiCard.state !== "new") {
              schedulingPreserved++;
            }
            if (ankiCard.has_fsrs_state) {
              fsrsStateImported++;
            }

            if (/\{\{c\d+::[^}]+\}\}/.test(ankiCard.front)) {
              clozeCount++;
            } else {
              basicCount++;
            }

            for (const tag of ankiCard.tags) {
              if (tag.trim()) tagSet.add(tag.trim());
            }
          } catch (err) {
            console.error("Failed to create card:", err);
            failed++;
          }
        }
      }

      setReport({
        deckName: deckName.trim(),
        totalFound: ankiReport.cards_detected,
        imported,
        failed,
        cardTypes: { basic: basicCount, cloze: clozeCount },
        tags: [...tagSet].sort(),
        warnings: ankiReport.warnings,
        decksCreated,
        mediaImported: ankiReport.media_imported,
        schedulingPreserved,
        fsrsStateImported,
      });
    } catch (error) {
      console.error("Anki import failed:", error);
      const message = error instanceof Error ? error.message : t("ankiImport.unknownError");
      
      if (message.includes("sqlite") || message.includes("database")) {
        toast.error(t("ankiImport.errorCorruptedFile"));
      } else if (message.includes("not found") || message.includes("ENOENT")) {
        toast.error(t("ankiImport.errorFileNotFound"));
      } else {
        toast.error(t("ankiImport.importFailed", { message }));
      }
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
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all">
          <Upload className="h-4 w-4" />
          {t("ankiImport.importFromAnki")}
        </button>
      </DialogTrigger>

      {/* Import form screen */}
      {!report && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("ankiImport.importAnkiDeck")}</DialogTitle>
            <DialogDescription>
              {t("ankiImport.importDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deck-name">{t("ankiImport.deckName")}</Label>
              <Input
                id="deck-name"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder={t("ankiImport.deckNamePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-select">{t("ankiImport.ankiFile")}</Label>
              <div className="flex gap-2">
                <Input
                  id="file-select"
                  value={selectedFile ? selectedFile.split(/[/\\]/).pop() : ""}
                  readOnly
                  placeholder={t("ankiImport.noFileSelected")}
                  className="flex-1"
                />
                <button className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all" onClick={handleFileSelect} disabled={isImporting}>
                  {t("ankiImport.browse")}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all" onClick={handleClose} disabled={isImporting}>
              {t("ankiImport.cancel")}
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all" onClick={handleImport} disabled={isImporting || !selectedFile || !deckName.trim()}>
              {isImporting ? t("ankiImport.importing") : t("ankiImport.importCards")}
            </button>
          </DialogFooter>
        </DialogContent>
      )}

      {/* Import report screen */}
      {report && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {report.failed > 0 ? (
                <FileWarning className="h-5 w-5 text-review-hard" />
              ) : (
                <Check className="h-5 w-5 text-review-easy" />
              )}
              {t("ankiImport.importComplete")}
            </DialogTitle>
            <DialogDescription>
              {t("ankiImport.deckCreated", { name: report.deckName })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-2">
              <ReportTile
                icon={Layers}
                label={t("ankiImport.found")}
                value={report.totalFound}
                color="text-on-surface-variant dark:text-on-surface-variant"
              />
              <ReportTile
                icon={Check}
                label={t("ankiImport.imported")}
                value={report.imported}
                color="text-review-easy"
              />
              {report.failed > 0 && (
                <ReportTile
                  icon={X}
                  label={t("ankiImport.failed")}
                  value={report.failed}
                  color="text-destructive"
                />
              )}
            </div>

            {report.schedulingPreserved > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <ReportTile
                  icon={CalendarClock}
                  label={t("ankiImport.schedulingPreserved")}
                  value={report.schedulingPreserved}
                  color="text-primary"
                />
                {report.fsrsStateImported > 0 && (
                  <ReportTile
                    icon={BrainCircuit}
                    label={t("ankiImport.fsrsStateImported")}
                    value={report.fsrsStateImported}
                    color="text-purple-500"
                  />
                )}
              </div>
            )}

            <div className="rounded-md bg-surface-container/50 dark:bg-surface-container/50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-on-surface-variant dark:text-on-surface-variant">{t("ankiImport.basicCards")}</span>
                <span className="font-medium">{report.cardTypes.basic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant dark:text-on-surface-variant">{t("ankiImport.clozeCards")}</span>
                <span className="font-medium">{report.cardTypes.cloze}</span>
              </div>
              {report.mediaImported > 0 && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant dark:text-on-surface-variant">{t("ankiImport.mediaFiles")}</span>
                  <span className="font-medium">{report.mediaImported}</span>
                </div>
              )}
            </div>

            {report.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs text-on-surface-variant dark:text-on-surface-variant mb-2">
                  <Tag className="h-3 w-3" />
                  {t("ankiImport.tagsFound")}
                </div>
                <div className="flex flex-wrap gap-1">
                  {report.tags.slice(0, 10).map((tag) => (
                    <span key={tag} className="rounded bg-surface-container dark:bg-surface-container px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                  {report.tags.length > 10 && (
                    <span className="text-xs text-on-surface-variant dark:text-on-surface-variant">
                      {t("ankiImport.moreTags", { count: report.tags.length - 10 })}
                    </span>
                  )}
                </div>
              </div>
            )}

            {report.decksCreated.length > 1 && (
              <div>
                <div className="flex items-center gap-1 text-xs text-on-surface-variant dark:text-on-surface-variant mb-2">
                  <Layers className="h-3 w-3" />
                  {t("ankiImport.decksCreatedCount", { count: report.decksCreated.length })}
                </div>
                <div className="flex flex-wrap gap-1">
                  {report.decksCreated.slice(0, 8).map((d) => (
                    <span key={d} className="rounded bg-primary-soft px-2 py-0.5 text-xs text-primary">
                      {d}
                    </span>
                  ))}
                  {report.decksCreated.length > 8 && (
                    <span className="text-xs text-on-surface-variant dark:text-on-surface-variant">
                      {t("ankiImport.moreDecks", { count: report.decksCreated.length - 8 })}
                    </span>
                  )}
                </div>
              </div>
            )}

            {report.warnings.length > 0 && (
              <div className="rounded-md bg-secondary-container border border-secondary-container p-3">
                <div className="flex items-center gap-1 text-xs font-semibold text-review-hard mb-2">
                  <AlertTriangle className="h-3 w-3" />
                  {t("ankiImport.warnings")}
                </div>
                <ul className="space-y-1">
                  {report.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-review-hard">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all w-full" onClick={handleClose}>
              {t("ankiImport.done")}
            </button>
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
    <div className="rounded-md border bg-surface dark:bg-surface p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="flex items-center justify-center gap-1 text-xs text-on-surface-variant dark:text-on-surface-variant mt-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
    </div>
  );
}