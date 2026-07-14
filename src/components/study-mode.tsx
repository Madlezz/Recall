import { AlertCircle, ArrowLeft, BookOpen, Check, Clock, Edit3, EyeOff, RotateCcw, RotateCw, Timer, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RichCard } from "@/components/RichCard";
import { Button } from "@/components/ui/button";
import { CardDialog } from "@/components/card-dialog";
import { useRecallStore } from "@/stores/recall-store";
import { useSwipeGesture, type SwipeDirection } from "@/hooks/use-swipe-gesture";
import { speakText, stopSpeaking, isTTSSupported, setSpeakingCallback } from "@/services/tts";
import { playFlipSound, playCorrectSound, playAgainSound, playHardSound } from "@/services/audio";
import { previewIntervals } from "@/services/fsrs-engine";
import { cn } from "@/lib/utils";
import { cardSurface } from "@/lib/surface";
import { matchesShortcut, shortcutLabel, DEFAULT_SHORTCUTS } from "@/lib/shortcuts";
import { SessionSummaryModal } from "./study-mode/session-summary-modal";
import { AnswerButton, CompletionStat } from "./study-mode/study-helpers";

export function StudyMode(): JSX.Element {
  const { t } = useTranslation();
  const activeStudy = useRecallStore((state) => state.activeStudy);
  const decks = useRecallStore((state) => state.decks);
  const settings = useRecallStore((state) => state.settings);
  const revealAnswer = useRecallStore((state) => state.revealAnswer);
  const answerCurrentCard = useRecallStore((state) => state.answerCurrentCard);
  const exitStudy = useRecallStore((state) => state.exitStudy);
  const buryCard = useRecallStore((state) => state.buryCard);
  const snoozeCard = useRecallStore((state) => state.snoozeCard);
  const undoLastReview = useRecallStore((state) => state.undoLastReview);
  const lastSessionSummary = useRecallStore((state) => state.lastSessionSummary);
  const clearSessionSummary = useRecallStore((state) => state.clearSessionSummary);
  const showDashboard = useRecallStore((state) => state.showDashboard);
  const cards = useRecallStore((state) => state.cards);

  const cardId = activeStudy?.cardIds[activeStudy.currentIndex];
  const card = cards.find((item) => item.id === cardId);
  const deck = decks.find((item) => item.id === activeStudy?.deckId);
  const total = activeStudy?.cardIds.length ?? 0;
  const answered = activeStudy
    ? Object.values(activeStudy.ratings).reduce((a, b) => a + b, 0)
    : 0;

  // Visual feedback for answer rating (for deaf users)
  const [ratingFlash, setRatingFlash] = useState<"again" | "hard" | "good" | "easy" | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ttsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    setSpeakingCallback(setIsSpeaking);
    return () => setSpeakingCallback(() => {});
  }, []);
  
  useEffect(() => {
    if (ratingFlash) {
      const timer = setTimeout(() => setRatingFlash(null), 300);
      return () => clearTimeout(timer);
    }
  }, [ratingFlash]);

  // Auto-read cards when TTS is enabled
  useEffect(() => {
    if (!settings?.ttsEnabled || !settings?.ttsAutoRead || !card) return;
    // Clear any pending TTS timeout from previous card
    if (ttsTimeoutRef.current) { clearTimeout(ttsTimeoutRef.current); ttsTimeoutRef.current = null; }
    if (activeStudy?.revealed) {
      // Read back when answer revealed
      ttsTimeoutRef.current = setTimeout(() => speakText(card.back, "en-US", settings.ttsSpeed), 300);
    } else {
      // Read front when card shown
      ttsTimeoutRef.current = setTimeout(() => speakText(card.front, "en-US", settings.ttsSpeed), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on card/reveal change
  }, [card?.id, activeStudy?.revealed, settings?.ttsEnabled, settings?.ttsAutoRead]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!activeStudy || activeStudy.completed) return;

      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const sc = settings?.shortcuts ?? DEFAULT_SHORTCUTS;

      if (matchesShortcut(event, sc.undo) && !activeStudy.revealed && activeStudy.currentIndex > 0) {
        event.preventDefault();
        void undoLastReview().then((didUndo) => {
          if (didUndo) toast.info(t("study.reviewUndone"));
          else toast.info(t("study.nothingToUndo"));
        });
        return;
      }

      if (!activeStudy.revealed) {
        if (matchesShortcut(event, sc.bury)) { event.preventDefault(); buryCard(); return; }
        if (matchesShortcut(event, sc.snooze)) { event.preventDefault(); void snoozeCard(120); toast.info(t("study.snoozed")); return; }
        if (matchesShortcut(event, sc.tts) && settings?.ttsEnabled) {
          event.preventDefault();
          if (isSpeaking) { stopSpeaking(); } else { speakText(card!.front, "en-US", settings.ttsSpeed); }
          return;
        }
      }

      if (matchesShortcut(event, sc.reveal) && !activeStudy.revealed) { event.preventDefault(); revealAnswer(); }

      if (!activeStudy.revealed) return;
      if (matchesShortcut(event, sc.rateAgain)) { event.preventDefault(); void answerCurrentCard("again"); }
      if (matchesShortcut(event, sc.rateHard)) { event.preventDefault(); void answerCurrentCard("hard"); }
      if (matchesShortcut(event, sc.rateGood)) { event.preventDefault(); void answerCurrentCard("good"); }
      if (matchesShortcut(event, sc.rateEasy)) { event.preventDefault(); void answerCurrentCard("easy"); }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStudy, answerCurrentCard, revealAnswer, undoLastReview, buryCard, snoozeCard, settings, isSpeaking, card, t]);

  useEffect(() => { return () => { stopSpeaking(); if (ttsTimeoutRef.current) { clearTimeout(ttsTimeoutRef.current); ttsTimeoutRef.current = null; } }; }, [cardId]);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!activeStudy || activeStudy.completed) return;
    const start = new Date(activeStudy.startedAt).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-tick on activeStudy lifecycle
    }, [activeStudy?.id, activeStudy?.completed]);

  function formatElapsed(ms: number): string {
    const sec = Math.floor(ms / 1000);
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  }

  // ── Swipe gesture handling ──
  // Must be before early returns - hooks can't be conditional
  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (!activeStudy) return;

    // Before reveal: tap/swipe any direction = reveal
    if (!activeStudy.revealed) {
      playFlipSound();
      revealAnswer();
      return;
    }

    // After reveal: swipe to rate
    // left = again, right = good, up = easy, down = hard
    switch (direction) {
      case "left":
        playAgainSound();
        setRatingFlash("again");
        void answerCurrentCard("again");
        break;
      case "right":
        playCorrectSound();
        setRatingFlash("good");
        void answerCurrentCard("good");
        break;
      case "up":
        playCorrectSound();
        setRatingFlash("easy");
        void answerCurrentCard("easy");
        break;
      case "down":
        playHardSound();
        setRatingFlash("hard");
        void answerCurrentCard("hard");
        break;
    }
  }, [activeStudy, revealAnswer, answerCurrentCard]);

  const swipeEnabled = settings?.swipeGestures ?? true;
  const { offset: swipeOffset, isSwiping, touchHandlers } = useSwipeGesture(
    { onSwipe: handleSwipe },
    swipeEnabled,
  );

  // ── Session complete (no summary) ──
  if (!activeStudy && lastSessionSummary) {
    return (
      <SessionSummaryModal
        summary={lastSessionSummary}
        onContinue={() => { clearSessionSummary(); showDashboard(); }}
      />
    );
  }

  // ── No active study ──
  if (!activeStudy) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container dark:bg-surface-container">
            <BookOpen className="h-7 w-7 text-on-surface-variant" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary dark:text-text-primary">{t("study.noActiveSession")}</h1>
          <p className="text-sm text-on-surface-variant">{t("study.startSessionHint")}</p>
          <Button className="mt-2" onClick={exitStudy}>{t("study.backToDashboard")}</Button>
        </div>
      </div>
    );
  }

  // ── Completed but still showing inline ──
  if (activeStudy.completed) {
    const totalReviews = answered;
    const goodAndEasy = activeStudy.ratings.good + activeStudy.ratings.easy;
    const accuracy = totalReviews === 0 ? 0 : Math.round((goodAndEasy / totalReviews) * 100);

    return (
      <div className="flex min-h-[76vh] items-center justify-center">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container dark:bg-surface-container">
            <Check className="h-7 w-7 text-on-surface-variant dark:text-on-surface-variant" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-text-primary dark:text-text-primary">{t("study.sessionComplete")}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{deck?.name ?? t("study.allDueCards")}</p>

          <div className="mt-6 grid grid-cols-5 gap-2">
            <CompletionStat label={t("study.cards")} value={totalReviews} />
            <CompletionStat label={t("study.again")} value={activeStudy.ratings.again} />
            <CompletionStat label={t("study.hard")} value={activeStudy.ratings.hard} />
            <CompletionStat label={t("study.good")} value={activeStudy.ratings.good} />
            <CompletionStat label={t("study.easy")} value={activeStudy.ratings.easy} />
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <span className="text-on-surface-variant">{t("study.accuracy")}</span>
            <span className="font-bold tabular-nums text-text-primary dark:text-text-primary">{accuracy}%</span>
          </div>

          <Button className="mt-6 w-full gap-2" onClick={exitStudy}>
            <ArrowLeft className="h-4 w-4" /> {t("study.return")}
          </Button>
        </div>
      </div>
    );
  }

  // ── No card found ──
  if (!card) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container dark:bg-surface-container">
            <AlertCircle className="h-7 w-7 text-on-surface-variant" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary dark:text-text-primary">{t("study.cardNotFound")}</h1>
          <p className="text-sm text-on-surface-variant">{t("study.cardNotFoundHint")}</p>
          <Button onClick={exitStudy}>{t("study.backToDashboard")}</Button>
        </div>
      </div>
    );
  }

  const progress = ((activeStudy.currentIndex) / total) * 100;

  // Compute interval preview when answer is revealed
  const intervals = activeStudy.revealed && card
    ? previewIntervals(card, settings?.desiredRetention)
    : null;

  // Compute card transform for visual feedback during swipe
  const cardTransform = isSwiping
    ? `translate(${swipeOffset.x * 0.5}px, ${swipeOffset.y * 0.5}px)`
    : undefined;

  // Tint color based on swipe direction
  const swipeTint = isSwiping
    ? Math.abs(swipeOffset.x) > Math.abs(swipeOffset.y)
      ? swipeOffset.x < 0
        ? "shadow-red-200/50 dark:shadow-red-900/30"
        : "shadow-emerald-200/50 dark:shadow-emerald-900/30"
      : swipeOffset.y < 0
        ? "shadow-blue-200/50 dark:shadow-blue-900/30"
        : "shadow-amber-200/50 dark:shadow-amber-900/30"
    : "";

  // ── Active study ──
  return (
    <div className="flex min-h-[82vh] flex-col relative">
      {/* Rating flash overlay for deaf users */}
      {ratingFlash && (
        <div
          className={`pointer-events-none fixed inset-0 z-50 transition-opacity duration-300 ${
            ratingFlash === "again" ? "bg-review-again/10" :
            ratingFlash === "hard" ? "bg-review-hard/10" :
            ratingFlash === "good" ? "bg-review-good/10" :
            "bg-review-easy/10"
          }`}
          aria-hidden="true"
        />
      )}

      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {t("study.cardProgress", { answered: activeStudy.currentIndex + 1, total })}
        {activeStudy.revealed ? t("study.answerRevealedSr") : t("study.pressSpaceSr")}
      </div>

      {/* Top bar - compact on mobile */}
      <header className="flex items-center justify-between py-2 gap-2">
        <Button variant="ghost" size="sm" onClick={exitStudy} className="gap-1.5 shrink-0" aria-label={t("study.exitStudyMode")}>
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">{t("study.exit")}</span>
        </Button>

        {/* Center: progress - takes available space */}
        <div className="flex-1 min-w-0 max-w-[200px] mx-auto">
          <div className="flex items-center justify-center gap-2 text-sm tabular-nums text-on-surface-variant dark:text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" />
              {formatElapsed(elapsed)}
            </span>
            <span className="text-on-surface-variant dark:text-on-surface-variant">·</span>
            <span>{activeStudy.currentIndex + 1} / {total}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-container dark:bg-surface-container overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={t("study.studyProgress", { current: activeStudy.currentIndex, total })}>
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Right: TTS toggle */}
        <div className="flex items-center shrink-0">
          {isTTSSupported() && settings?.ttsEnabled && (
            <button
              aria-label={isSpeaking ? t("study.stopReading") : t("study.readAloud")}
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking();
                } else {
                  const text = activeStudy.revealed ? `${card.front} ${card.back}` : card.front;
                  speakText(text, "en-US", settings.ttsSpeed);
                }
              }}
              className={`min-h-[44px] min-w-[44px] rounded-md p-1.5 transition-colors ${
                isSpeaking
                  ? "text-primary hover:text-primary-hover hover:bg-primary-soft dark:hover:bg-primary-container animate-pulse"
                  : "text-on-surface-variant hover:text-on-surface-variant hover:bg-surface-container-high dark:hover:text-text-secondary dark:hover:bg-surface-container"
              }`}
              title={t("study.readAloudTitle")}
            >
              {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Exam banner */}
      {deck?.examDeadline ? (() => {
        const now = new Date();
        const deadline = new Date(deck.examDeadline);
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 30) return null;
        return (
          <div
            className={cn(
              "rounded-md px-4 py-2 text-center text-sm font-semibold",
              daysLeft <= 0 ? "bg-review-again/10 text-review-again dark:bg-review-again/20 dark:text-review-again" :
              daysLeft <= 3 ? "bg-review-hard/10 text-review-hard dark:bg-review-hard/20 dark:text-review-hard" :
              "bg-primary-soft text-primary dark:bg-primary-container dark:text-primary",
            )}
          >
            📅 {daysLeft <= 0 ? t("study.examToday") : daysLeft === 1 ? t("study.examTomorrow") : t("study.examInDays", { days: daysLeft })}
            {daysLeft <= 3 ? " ⚡" : ""}
          </div>
        );
      })() : null}

      {/* Card */}
      <section className="flex flex-1 items-center justify-center py-4 sm:py-6">
        <div
          className="w-full max-w-3xl"
          style={{ perspective: "1400px" }}
          {...(swipeEnabled ? touchHandlers : {})}
        >
          <div
            key={card?.id}
            className={cn("study-card relative min-h-[300px] sm:min-h-[380px]", swipeTint)}
            data-revealed={activeStudy.revealed}
            style={{
              ...(cardTransform ? { transform: cardTransform } : {}),
              ...(isSwiping ? { transitionDuration: "0ms" } : {}),
            }}
          >
{/* Front */}
	            <div className={cn("study-card-face absolute inset-0 flex flex-col justify-center", cardSurface("p-5 shadow-sm sm:p-10"))}>
	              <div className="flex items-center gap-2">
	                <span className="rounded-full bg-primary-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
	                  {card.cardType === "cloze" ? t("study.clozeType") : card.cardType === "image-occlusion" ? t("study.imageOcclusionType") : t("study.basicType")}
	                </span>
	              </div>
	              <p className="mt-2 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{deck?.name ?? t("study.review")}</p>
	              <div className="mt-4 text-balance text-lg font-semibold leading-relaxed text-text-primary dark:text-text-primary sm:mt-5 sm:text-2xl">
	                <RichCard content={card.front} cardType={card.cardType} revealed={activeStudy.revealed} allowHtml={settings?.allowHtml} />
	              </div>
              {card.hint && (
                <p className="mt-4 text-sm text-on-surface-variant sm:mt-6">{t("study.hint")}: {card.hint}</p>
              )}
            </div>
            {/* Back */}
            <div className={cn("study-card-face study-card-back absolute inset-0 flex flex-col justify-center", cardSurface("p-5 shadow-sm sm:p-10"))}>
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">{t("study.answer")}</p>
              <div className="mt-4 text-balance text-lg font-semibold leading-relaxed text-text-primary dark:text-text-primary sm:mt-5 sm:text-2xl">
                <RichCard content={card.back} isBack allowHtml={settings?.allowHtml} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Answer footer - full-width grid on mobile */}
      <footer className="flex flex-col gap-2 pb-4 lg:flex-wrap lg:flex-row lg:items-center lg:justify-center">
        {!activeStudy.revealed && activeStudy.currentIndex > 0 && (
          <Button
            variant="ghost" size="sm"
            onClick={() => void undoLastReview().then((didUndo) => { if (didUndo) toast.info(t("study.reviewUndone")); else toast.info(t("study.nothingToUndo")); })}
            className="gap-1.5 self-start lg:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t("study.undo")}
          </Button>
        )}

        {!activeStudy.revealed ? (
          <Button size="lg" onClick={() => { playFlipSound(); revealAnswer(); }} className="gap-2 min-h-[48px] w-full sm:w-auto sm:min-w-[140px]">
            <RotateCw className="h-4 w-4" /> {t("study.reveal")}
          </Button>
        ) : (
          /* 2x2 grid on mobile, inline row on desktop */
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
            <AnswerButton label={t("study.again")} keyHint={shortcutLabel(settings?.shortcuts?.rateAgain ?? DEFAULT_SHORTCUTS.rateAgain)} variant="again" interval={intervals?.again} colorBlind={settings?.colorBlindMode} onClick={() => { playAgainSound(); setRatingFlash("again"); void answerCurrentCard("again"); }} />
            <AnswerButton label={t("study.hard")} keyHint={shortcutLabel(settings?.shortcuts?.rateHard ?? DEFAULT_SHORTCUTS.rateHard)} variant="hard" interval={intervals?.hard} colorBlind={settings?.colorBlindMode} onClick={() => { playHardSound(); setRatingFlash("hard"); void answerCurrentCard("hard"); }} />
            <AnswerButton label={t("study.good")} keyHint={shortcutLabel(settings?.shortcuts?.rateGood ?? DEFAULT_SHORTCUTS.rateGood)} variant="good" interval={intervals?.good} colorBlind={settings?.colorBlindMode} onClick={() => { playCorrectSound(); setRatingFlash("good"); void answerCurrentCard("good"); }} />
            <AnswerButton label={t("study.easy")} keyHint={shortcutLabel(settings?.shortcuts?.rateEasy ?? DEFAULT_SHORTCUTS.rateEasy)} variant="easy" interval={intervals?.easy} colorBlind={settings?.colorBlindMode} onClick={() => { playCorrectSound(); setRatingFlash("easy"); void answerCurrentCard("easy"); }} />
          </div>
        )}

        {/* Swipe hint - mobile only, shown when revealed and swipe enabled */}
        {activeStudy.revealed && swipeEnabled && (
          <p className="text-center text-[10px] text-on-surface-variant lg:hidden">
            ← {t("study.again")} · → {t("study.good")} · ↑ {t("study.easy")} · ↓ {t("study.hard")}
          </p>
        )}

        {/* Edit card mid-review */}
        {activeStudy.revealed && card && (
          <CardDialog
            card={card}
            deckId={card.deckId}
            trigger={
              <Button variant="ghost" size="sm" className="gap-1.5 self-start lg:self-auto" title={t("study.editCardTitle")}>
                <Edit3 className="h-3.5 w-3.5" /> {t("study.edit")}
              </Button>
            }
          />
        )}

        {!activeStudy.revealed && (
          <div className="flex gap-2 self-start">
            <Button variant="ghost" size="sm" onClick={buryCard} className="gap-1.5 min-h-[44px]">
              <EyeOff className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("study.bury")}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { void snoozeCard(120); toast.info(t("study.snoozed")); }} className="gap-1.5 min-h-[44px]">
              <Clock className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("study.snooze")}</span>
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
}