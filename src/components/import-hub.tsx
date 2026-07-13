import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, FileSpreadsheet, FileText, Package, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnkiImportDialog } from "@/components/anki-import-dialog";
import { CsvImportDialog } from "@/components/csv-import-dialog";
import { MarkdownImportDialog } from "@/components/markdown-import-dialog";
import { RecallImportDialog } from "@/components/recall-import-dialog";
import { cardSurface, dashedSurface } from "@/lib/surface";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";

export function ImportHub(): JSX.Element {
  const { t } = useTranslation();
  const showDashboard = useRecallStore((state) => state.showDashboard);
  const [showCsv, setShowCsv] = useState(false);

  return (
    <div className="animate-fade-in max-w-[768px] mx-auto px-gutter-mobile py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          {t("importHub.title")}
        </h1>
        <Button variant="ghost" size="icon" onClick={showDashboard} aria-label={t("common.close")}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <p className="text-sm text-on-surface-variant mb-6">
        {t("importHub.description")}
      </p>

      {/* Drop zone */}
      <div className={dashedSurface("flex flex-col items-center justify-center p-12 mb-8 text-center")}>
        <Upload className="h-10 w-10 text-outline mb-4" />
        <p className="font-label-lg text-sm font-semibold text-text-primary mb-1">
          {t("importHub.dropTitle")}
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
          dialog={<CsvImportDialog open={showCsv} onClose={() => setShowCsv(false)} />}
          onClick={() => setShowCsv(true)}
        />
        <ImportCard
          icon={FileText}
          title={t("importHub.markdown")}
          desc={t("importHub.markdownDesc")}
          dialog={<MarkdownImportDialog />}
        />
        <ImportCard
          icon={Plus}
          title={t("importHub.manual")}
          desc={t("importHub.manualDesc")}
          onClick={showDashboard}
        />
      </div>

      {/* Recall import */}
      <div className={cardSurface("p-5 mb-6")}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-label-lg text-sm font-semibold text-text-primary">{t("importHub.recall")}</p>
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
      <h3 className="font-label-lg text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-on-surface-variant mb-3">{desc}</p>
      {dialog}
    </div>
  );
}