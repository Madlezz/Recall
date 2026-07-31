import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Eye, FileSpreadsheet, FileText, FileDown, Package, Plus, Upload, X } from "lucide-react";
import { AnkiImportDialog } from "@/components/anki-import-dialog";
import { CsvImportDialog } from "@/components/csv-import-dialog";
import { MarkdownImportDialog } from "@/components/markdown-import-dialog";
import { RecallImportDialog } from "@/components/recall-import-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { parseBulkCards } from "@/lib/bulk-parser";
import { cardSurface, dashedSurface, typeClass } from "@/lib/surface";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import { toast } from "sonner";

export function ImportHub(): JSX.Element {
  const { t } = useTranslation();
  const showDashboard = useRecallStore((state) => state.showDashboard);
  const decks = useRecallStore((state) => state.decks);
  const createCard = useRecallStore((state) => state.createCard);
  const [showCsv, setShowCsv] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [showMd, setShowMd] = useState(false);
  const [mdText, setMdText] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      setCsvFile(file);
      setShowCsv(true);
    } else if (ext === "md" || ext === "markdown") {
      const reader = new FileReader();
      reader.onload = () => {
        setMdText(reader.result as string);
        setShowMd(true);
      };
      reader.readAsText(file);
    } else if (ext === "apkg") {
      toast.info(t("importHub.dropAnkiHint"));
    } else if (ext === "recall") {
      toast.info(t("importHub.dropRecallHint"));
    } else {
      toast.error(t("importHub.unsupportedFormat"));
    }
  }, [t]);

  // Manual entry
  const [showManual, setShowManual] = useState(false);
  const [manualDeckId, setManualDeckId] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualImporting, setManualImporting] = useState(false);
  const manualParsed = useMemo(() => parseBulkCards(manualText), [manualText]);

  async function handleManualImport(): Promise<void> {
    if (manualParsed.length === 0 || !manualDeckId) return;
    setManualImporting(true);
    try {
      for (const card of manualParsed) {
        await createCard({
          deckId: manualDeckId,
          front: card.front,
          back: card.back,
          hint: card.hint,
          source: "",
          tags: card.tags ?? [],
        });
      }
      toast.success(t("bulkAdd.imported", { count: manualParsed.length }));
      setManualText("");
      setShowManual(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("bulkAdd.unknownError");
      toast.error(t("bulkAdd.importFailed", { message }));
    } finally {
      setManualImporting(false);
    }
  }

  return (
    <div className="animate-fade-in max-w-[768px] mx-auto px-gutter-mobile py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className={cn(typeClass.display, "text-2xl font-bold text-text-primary")}>
          {t("importHub.title")}
        </h1>
        <button
          onClick={showDashboard}
          aria-label={t("common.close")}
          className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="text-sm text-on-surface-variant mb-6">
        {t("importHub.description")}
      </p>

      {/* Drop zone */}
      <div
        className={cn(
          dashedSurface("flex flex-col items-center justify-center p-12 mb-8 text-center transition-all"),
          dragOver && "border-primary bg-primary-soft/30 scale-[1.02]",
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {dragOver ? (
          <FileDown className="h-10 w-10 text-primary mb-4 animate-pulse" />
        ) : (
          <Upload className="h-10 w-10 text-outline mb-4" />
        )}
        <p className={cn(typeClass["label-lg"], "text-sm font-semibold text-text-primary mb-1")}>
          {dragOver ? t("importHub.dropHere") : t("importHub.dropTitle")}
        </p>
        <p className="text-xs text-on-surface-variant">
          {t("importHub.dropHint")}
        </p>
      </div>

      {/* Import method cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <ImportCard
          icon={Package}
          title={t("importHub.anki")}
          desc={t("importHub.ankiDesc")}
          dialog={<AnkiImportDialog />}
        />
        <ImportCard
          icon={FileSpreadsheet}
          title={t("importHub.csv")}
          desc={t("importHub.csvDesc")}
          dialog={<CsvImportDialog open={showCsv} onClose={() => { setShowCsv(false); setCsvFile(null); }} file={csvFile} />}
          onClick={() => setShowCsv(true)}
        />
        <ImportCard
          icon={FileText}
          title={t("importHub.markdown")}
          desc={t("importHub.markdownDesc")}
          dialog={<MarkdownImportDialog open={showMd} onOpenChange={(v) => { setShowMd(v); if (!v) setMdText(""); }} initialText={mdText} />}
        />
        <ImportCard
          icon={Plus}
          title={t("importHub.manual")}
          desc={t("importHub.manualDesc")}
          onClick={() => setShowManual(true)}
        />
      </div>

      {/* Recall import */}
      <div className={cardSurface("p-5 mb-6")}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className={cn(typeClass["label-lg"], "text-sm font-semibold text-text-primary")}>{t("importHub.recall")}</p>
            <p className="text-xs text-on-surface-variant">{t("importHub.recallDesc")}</p>
          </div>
          <RecallImportDialog />
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-on-surface-variant">
          {t("importHub.privacyNote")}
        </p>
      </div>

      {/* Manual entry dialog */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="manual-entry-title">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border bg-surface dark:bg-surface p-6 shadow-sm animate-fade-in">
            <button onClick={() => setShowManual(false)} className="absolute right-4 top-4 rounded p-1 hover:bg-surface-container-high dark:hover:bg-surface-container" aria-label={t("common.close")}>
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-text-primary dark:text-text-primary" />
              <h2 id="manual-entry-title" className="text-xl font-semibold">{t("bulkAdd.title")}</h2>
            </div>

            {/* Deck selector */}
            <div className="space-y-1.5 mb-4">
              <Label className="text-xs">{t("csvImport.targetDeck")}</Label>
              <Select value={manualDeckId} onValueChange={setManualDeckId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("csvImport.selectDeck")} />
                </SelectTrigger>
                <SelectContent>
                  {decks.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-on-surface-variant dark:text-on-surface-variant mb-4">
              {t("bulkAdd.instructionsPrefix")}{" "}
              <code className="bg-surface-container dark:bg-surface-container px-1 rounded">Q:</code>{" / "}
              <code className="bg-surface-container dark:bg-surface-container px-1 rounded">A:</code>{" "}
              {t("bulkAdd.instructionsSuffix")}
            </p>

            <textarea
              className="w-full h-48 rounded-md border bg-background p-4 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
              placeholder={t("bulkAdd.placeholder")}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-on-surface-variant dark:text-on-surface-variant" />
                <span className="text-sm text-on-surface-variant dark:text-on-surface-variant">
                  {t("bulkAdd.cardsDetected", { count: manualParsed.length })}
                </span>
              </div>
              <button
                onClick={() => void handleManualImport()}
                disabled={manualParsed.length === 0 || !manualDeckId || manualImporting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4 mr-1" />
                {manualImporting ? t("bulkAdd.importing") : t("bulkAdd.importCards", { count: manualParsed.length })}
              </button>
            </div>

            {/* Preview */}
            {manualParsed.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant dark:text-on-surface-variant">{t("bulkAdd.preview")}</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {manualParsed.map((card, i) => (
                    <div key={i} className="rounded-md border bg-background dark:bg-surface-container/50 p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-mono text-on-surface-variant dark:text-on-surface-variant mt-0.5">#{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{card.front || <span className="italic text-on-surface-variant dark:text-on-surface-variant">{t("bulkAdd.empty")}</span>}</div>
                          {card.back && <div className="text-on-surface-variant dark:text-on-surface-variant truncate mt-1">{card.back}</div>}
                          {card.hint && <div className="text-xs text-on-surface-variant dark:text-on-surface-variant mt-1">{t("bulkAdd.hintLabel")} {card.hint}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ImportCard({
  icon: Icon,
  title,
  desc,
  dialog,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  dialog?: React.ReactNode;
  onClick?: () => void;
}): JSX.Element {
  return (
    <div className={cn(cardSurface("p-5"), "group cursor-pointer")} onClick={onClick}>
      <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center mb-4 group-hover:bg-primary-container transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className={cn(typeClass["label-lg"], "text-sm font-semibold text-text-primary mb-1")}>{title}</h3>
      <p className="text-xs text-on-surface-variant mb-3">{desc}</p>
      {dialog}
    </div>
  );
}