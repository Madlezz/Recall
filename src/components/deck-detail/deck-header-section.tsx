import { Calendar, Play, Brain } from "lucide-react";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getDeckStats } from "@/lib/stats";
import { useRecallStore } from "@/stores/recall-store";
import { toast } from "sonner";
import type { Deck, Card } from "@/types";

interface DeckHeaderSectionProps {
  deck: Deck;
  deckCards: Card[];
  onStudyNow: () => void;
}

export function DeckHeaderSection({ deck, deckCards, onStudyNow }: DeckHeaderSectionProps): JSX.Element {
  const { t } = useTranslation();
  const startMatch = useRecallStore((s) => s.startMatch);
  const setExamDeadline = useRecallStore((s) => s.setExamDeadline);

  const [showExamPicker, setShowExamPicker] = useState(false);
  const [examDateInput, setExamDateInput] = useState(deck.examDeadline?.split("T")[0] ?? "");

  const examDays = useMemo(() => {
    if (!deck.examDeadline) return null;
    const now = new Date();
    const d = new Date(deck.examDeadline);
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [deck.examDeadline]);

  const stats = getDeckStats(deck, deckCards);
  const progress = stats.total === 0 ? 0 : Math.round((stats.mastered / stats.total) * 100);

  async function handleSetExamDeadline(): Promise<void> {
    if (!examDateInput) {
      await setExamDeadline(deck.id, null);
      toast.success(t("deckDetail.examDeadlineRemoved"));
      setShowExamPicker(false);
      return;
    }
    const deadline = new Date(examDateInput + "T23:59:59").toISOString();
    await setExamDeadline(deck.id, deadline);
    toast.success(t("deckDetail.examSetFor", { date: examDateInput }));
    setShowExamPicker(false);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-normal">{deck.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {deck.description || t("deckDetail.noDescription")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="lg" onClick={onStudyNow} aria-label={t("deckDetail.studyNowAria")}>
            <Play className="h-4 w-4" aria-hidden="true" />
            {t("deckDetail.studyNow")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => startMatch(deck.id)} aria-label={t("deckDetail.matchGameAria")}>
            <Brain className="h-4 w-4" aria-hidden="true" />
            {t("deckDetail.matchGame")}
          </Button>
        </div>
      </div>

      {/* Exam deadline */}
      <div className="flex items-center gap-3">
        <button
          aria-expanded={showExamPicker}
          aria-controls="exam-date-picker"
          onClick={() => {
            setExamDateInput(deck.examDeadline?.split("T")[0] ?? "");
            setShowExamPicker(!showExamPicker);
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition",
            examDays !== null
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-dashed text-muted-foreground hover:border-primary/50 hover:text-foreground",
          )}
        >
          <Calendar className="h-4 w-4" />
          {examDays !== null
            ? examDays <= 0
              ? t("deckDetail.examToday")
              : examDays === 1
                ? t("deckDetail.examTomorrow")
                : t("deckDetail.examInDays", { count: examDays })
            : t("deckDetail.setExamDate")}
        </button>
        {examDays !== null && examDays <= 3 && (
          <span className="text-xs font-medium text-amber-400">
            {t("deckDetail.cramMode")}
          </span>
        )}
      </div>

      {showExamPicker && (
        <div id="exam-date-picker" className="flex items-center gap-2" role="group" aria-label={t("deckDetail.examDatePicker")}>
          <label htmlFor="exam-date-input" className="sr-only">{t("deckDetail.examDate")}</label>
          <input
            id="exam-date-input"
            type="date"
            value={examDateInput}
            onChange={(e) => setExamDateInput(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          />
          <Button size="sm" onClick={() => void handleSetExamDeadline()}>
            {t("deckDetail.save")}
          </Button>
          {deck.examDeadline && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setExamDateInput("");
                void handleSetExamDeadline();
              }}
            >
              {t("deckDetail.remove")}
            </Button>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="max-w-xl space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {t("deckDetail.masteredProgress", { mastered: stats.mastered, total: stats.total })}
          </span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>
    </section>
  );
}
