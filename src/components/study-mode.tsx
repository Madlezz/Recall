import confetti from "canvas-confetti";
import { AlertCircle, ArrowLeft, BookOpen, Check, Clock, EyeOff, RotateCcw, RotateCw, Timer, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RichCard } from "@/components/RichCard";
import { Button } from "@/components/ui/button";
import { useRecallStore } from "@/stores/recall-store";
import { speakText, stopSpeaking, isTTSSupported, setSpeakingCallback } from "@/services/tts";
import { playFlipSound, playCorrectSound, playAgainSound, playHardSound } from "@/services/audio";
import { previewIntervals } from "@/services/fsrs-engine";
import { cn } from "@/lib/utils";
import type { SessionSummary } from "@/types";

export function StudyMode(): JSX.Element {
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

      if (event.ctrlKey && event.key === "z" && !activeStudy.revealed && activeStudy.currentIndex > 0) {
        event.preventDefault();
        void undoLastReview().then((didUndo) => {
          if (didUndo) toast.info("Review undone");
          else toast.info("Nothing to undo");
        });
        return;
      }

      if (!activeStudy.revealed) {
        if (event.key.toLowerCase() === "b") { event.preventDefault(); buryCard(); return; }
        if (event.key.toLowerCase() === "s") { event.preventDefault(); void snoozeCard(120); toast.info("Snoozed for 2 hours"); return; }
        if (event.key.toLowerCase() === "t" && settings?.ttsEnabled) {
          event.preventDefault();
          if (isSpeaking) { stopSpeaking(); } else { speakText(card!.front, "en-US", settings.ttsSpeed); }
          return;
        }
      }

      if (event.code === "Space" && !activeStudy.revealed) { event.preventDefault(); revealAnswer(); }

      if (!activeStudy.revealed) return;
      if (event.key === "1") { event.preventDefault(); void answerCurrentCard("again"); }
      if (event.key === "2") { event.preventDefault(); void answerCurrentCard("hard"); }
      if (event.key === "3") { event.preventDefault(); void answerCurrentCard("good"); }
      if (event.key === "4") { event.preventDefault(); void answerCurrentCard("easy"); }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStudy, answerCurrentCard, revealAnswer, undoLastReview, buryCard, snoozeCard, settings, isSpeaking, card]);

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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <BookOpen className="h-7 w-7 text-zinc-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">No active session</h1>
          <p className="text-sm text-zinc-500">Start a study session from the dashboard or a deck.</p>
          <Button className="mt-2" onClick={exitStudy}>Back to dashboard</Button>
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <Check className="h-7 w-7 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-zinc-800 dark:text-zinc-200">Session complete</h1>
          <p className="mt-1 text-sm text-zinc-500">{deck?.name ?? "All due cards"}</p>

          <div className="mt-6 grid grid-cols-5 gap-2">
            <CompletionStat label="Cards" value={totalReviews} />
            <CompletionStat label="Again" value={activeStudy.ratings.again} />
            <CompletionStat label="Hard" value={activeStudy.ratings.hard} />
            <CompletionStat label="Good" value={activeStudy.ratings.good} />
            <CompletionStat label="Easy" value={activeStudy.ratings.easy} />
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <span className="text-zinc-500">Accuracy</span>
            <span className="font-bold tabular-nums text-zinc-800 dark:text-zinc-200">{accuracy}%</span>
          </div>

          <Button className="mt-6 w-full gap-2" onClick={exitStudy}>
            <ArrowLeft className="h-4 w-4" /> Return
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <AlertCircle className="h-7 w-7 text-zinc-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">Card not found</h1>
          <p className="text-sm text-zinc-500">This card may have been deleted or moved.</p>
          <Button onClick={exitStudy}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  const progress = ((activeStudy.currentIndex) / total) * 100;

  // Compute interval preview when answer is revealed
  const intervals = activeStudy.revealed && card
    ? previewIntervals(card, settings?.desiredRetention)
    : null;

  // ── Active study ──
  return (
    <div className="flex min-h-[82vh] flex-col relative">
      {/* Rating flash overlay for deaf users */}
      {ratingFlash && (
        <div
          className={`pointer-events-none fixed inset-0 z-50 transition-opacity duration-300 ${
            ratingFlash === "again" ? "bg-red-500/10" :
            ratingFlash === "hard" ? "bg-amber-500/10" :
            ratingFlash === "good" ? "bg-emerald-500/10" :
            "bg-blue-500/10"
          }`}
          aria-hidden="true"
        />
      )}

      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        Card {activeStudy.currentIndex + 1} of {total}.
        {activeStudy.revealed ? "Answer revealed. Choose your rating." : "Press Space to reveal answer."}
      </div>

      {/* Top bar */}
      <header className="flex items-center justify-between py-2">
        <Button variant="ghost" size="sm" onClick={exitStudy} className="gap-1.5" aria-label="Exit study mode">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Button>

        <div className="flex items-center gap-4">
          {isTTSSupported() && settings?.ttsEnabled && (
            <button
              aria-label={isSpeaking ? "Stop reading" : "Read card text aloud"}
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking();
                } else {
                  const text = activeStudy.revealed ? `${card.front} ${card.back}` : card.front;
                  speakText(text, "en-US", settings.ttsSpeed);
                }
              }}
              className={`rounded-md p-1.5 transition-colors ${
                isSpeaking
                  ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 animate-pulse"
                  : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
              title="Read aloud (T)"
            >
              {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}
          <span className="flex items-center gap-1.5 text-sm tabular-nums text-zinc-400">
            <Timer className="h-4 w-4" /> {formatElapsed(elapsed)}
          </span>
        </div>

        <div className="text-right min-w-[160px]">
          <div className="text-sm font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
            {activeStudy.currentIndex + 1} / {total}
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Study progress: ${activeStudy.currentIndex} of ${total} cards`}>
            <div
              className="h-full rounded-full bg-zinc-500 transition-[width] duration-300 dark:bg-zinc-400"
              style={{ width: `${progress}%` }}
            />
          </div>
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
              daysLeft <= 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
              daysLeft <= 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            )}
          >
            📅 {daysLeft <= 0 ? "Exam is today!" : daysLeft === 1 ? "Exam tomorrow — final push!" : `Exam in ${daysLeft} days`}
            {daysLeft <= 3 ? " ⚡" : ""}
          </div>
        );
      })() : null}

      {/* Card */}
      <section className="flex flex-1 items-center justify-center py-6">
        <div className="w-full max-w-3xl" style={{ perspective: "1400px" }}>
          <div className="study-card relative min-h-[380px]" data-revealed={activeStudy.revealed}>
            {/* Front */}
            <div className="study-card-face absolute inset-0 flex flex-col justify-center rounded-xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{deck?.name ?? "Review"}</p>
              <div className="mt-5 text-balance text-xl font-semibold leading-relaxed text-zinc-800 dark:text-zinc-200 sm:text-2xl">
                <RichCard content={card.front} cardType={card.cardType} revealed={activeStudy.revealed} allowHtml={settings?.allowHtml} />
              </div>
              {card.hint && (
                <p className="mt-6 text-sm text-zinc-400">Hint: {card.hint}</p>
              )}
            </div>
            {/* Back */}
            <div className="study-card-face study-card-back absolute inset-0 flex flex-col justify-center rounded-xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Answer</p>
              <div className="mt-5 text-balance text-xl font-semibold leading-relaxed text-zinc-800 dark:text-zinc-200 sm:text-2xl">
                <RichCard content={card.back} isBack allowHtml={settings?.allowHtml} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Answer footer */}
      <footer className="flex flex-wrap items-center justify-center gap-2 pb-4">
        {!activeStudy.revealed && activeStudy.currentIndex > 0 && (
          <Button
            variant="ghost" size="sm"
            onClick={() => void undoLastReview().then((didUndo) => { if (didUndo) toast.info("Review undone"); else toast.info("Nothing to undo"); })}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Undo
          </Button>
        )}

        {!activeStudy.revealed ? (
          <Button size="lg" onClick={() => { playFlipSound(); revealAnswer(); }} className="gap-2 min-w-[140px]">
            <RotateCw className="h-4 w-4" /> Reveal
          </Button>
        ) : (
          <>
            <AnswerButton label="Again" keyHint="1" variant="again" interval={intervals?.again} onClick={() => { playAgainSound(); setRatingFlash("again"); void answerCurrentCard("again"); }} />
            <AnswerButton label="Hard" keyHint="2" variant="hard" interval={intervals?.hard} onClick={() => { playHardSound(); setRatingFlash("hard"); void answerCurrentCard("hard"); }} />
            <AnswerButton label="Good" keyHint="3" variant="good" interval={intervals?.good} onClick={() => { playCorrectSound(); setRatingFlash("good"); void answerCurrentCard("good"); }} />
            <AnswerButton label="Easy" keyHint="4" variant="easy" interval={intervals?.easy} onClick={() => { playCorrectSound(); setRatingFlash("easy"); void answerCurrentCard("easy"); }} />
          </>
        )}

        {!activeStudy.revealed && (
          <>
            <Button variant="ghost" size="sm" onClick={buryCard} className="gap-1.5">
              <EyeOff className="h-3.5 w-3.5" /> Bury
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { void snoozeCard(120); toast.info("Snoozed for 2 hours"); }} className="gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Snooze
            </Button>
          </>
        )}
      </footer>
    </div>
  );
}

// ── Answer button ──

type AnswerVariant = "again" | "hard" | "good" | "easy";

const answerStyles: Record<AnswerVariant, string> = {
  again: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  hard: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  good: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  easy: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
};

function AnswerButton({ label, keyHint, variant, interval, onClick }: { label: string; keyHint: string; variant: AnswerVariant; interval?: string; onClick: () => void }): JSX.Element {
  const variantDescriptions: Record<AnswerVariant, string> = {
    again: "Rate as Again - forgot completely",
    hard: "Rate as Hard - remembered with difficulty",
    good: "Rate as Good - remembered with moderate effort",
    easy: "Rate as Easy - remembered easily",
  };

  return (
    <button
      onClick={onClick}
      aria-label={variantDescriptions[variant]}
      className={`flex flex-col items-center gap-0.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${answerStyles[variant]}`}
    >
      <span className="flex items-center gap-2">
        <span className="text-[10px] font-medium opacity-60 w-4" aria-hidden="true">{keyHint}</span>
        {label}
      </span>
      {interval && (
        <span className="text-[10px] font-normal opacity-60" aria-label={`Next interval: ${interval}`}>{interval}</span>
      )}
    </button>
  );
}

// ── Completion stat ──

function CompletionStat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-lg bg-zinc-50 py-2.5 px-1 dark:bg-zinc-800/50">
      <div className="text-lg font-bold tabular-nums text-zinc-800 dark:text-zinc-200">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium text-zinc-400">{label}</div>
    </div>
  );
}

// ── Session Summary Modal ──

function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function ratingLabel(avg: number): string {
  if (avg >= 3.5) return "Easy";
  if (avg >= 2.5) return "Good";
  if (avg >= 1.5) return "Hard";
  return "Again-heavy";
}

function SessionSummaryModal({ summary, onContinue }: { summary: SessionSummary; onContinue: () => void }): JSX.Element {
  const total = summary.againCount + summary.hardCount + summary.goodCount + summary.easyCount;

  useEffect(() => {
      const goodScore = summary.goodCount + summary.easyCount;
      const accuracy = goodScore / (total || 1);
      if (accuracy >= 0.6) {
        confetti({
          particleCount: accuracy >= 0.9 ? 100 : 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#a855f7", "#6366f1", "#8b5cf6", "#d946ef"],
        });
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire confetti once on mount
        }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="session-summary-title">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <Check className="h-7 w-7 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h2 id="session-summary-title" className="mt-5 text-xl font-bold text-zinc-800 dark:text-zinc-200">Session Complete</h2>
          <p className="mt-1 text-sm text-zinc-500">{summary.cardsStudied} cards reviewed</p>
        </div>

        {summary.sessionXp > 0 && (
          <div className="mt-5 rounded-xl bg-zinc-50 px-4 py-3 text-center dark:bg-zinc-800/50">
            <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">+{summary.sessionXp} XP</div>
            <div className="text-xs text-zinc-400 mt-0.5">earned this session</div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800/50">
            <div className="text-lg font-bold tabular-nums text-zinc-800 dark:text-zinc-200">{formatTime(summary.timeSpentMs)}</div>
            <div className="text-xs text-zinc-400 mt-0.5">Time spent</div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800/50">
            <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{ratingLabel(summary.averageRating)}</div>
            <div className="text-xs text-zinc-400 mt-0.5">Avg rating</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="rounded-md bg-red-50 p-2 text-center dark:bg-red-950/30">
            <div className="font-bold text-red-600 dark:text-red-400">{summary.againCount}</div>
            <div className="text-[10px] text-red-500/70">Again</div>
          </div>
          <div className="rounded-md bg-amber-50 p-2 text-center dark:bg-amber-950/30">
            <div className="font-bold text-amber-600 dark:text-amber-400">{summary.hardCount}</div>
            <div className="text-[10px] text-amber-500/70">Hard</div>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 text-center dark:bg-emerald-950/30">
            <div className="font-bold text-emerald-600 dark:text-emerald-400">{summary.goodCount}</div>
            <div className="text-[10px] text-emerald-500/70">Good</div>
          </div>
          <div className="rounded-md bg-blue-50 p-2 text-center dark:bg-blue-950/30">
            <div className="font-bold text-blue-600 dark:text-blue-400">{summary.easyCount}</div>
            <div className="text-[10px] text-blue-500/70">Easy</div>
          </div>
        </div>

        {summary.newAchievements.length > 0 && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 dark:bg-amber-950/20 dark:border-amber-900">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-2">Achievement Unlocked</p>
            <div className="space-y-2">
              {summary.newAchievements.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="text-lg">{a.icon}</span>
                  <div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">{a.title}</div>
                    <div className="text-xs text-zinc-500">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button className="mt-6 w-full" onClick={onContinue}>Continue</Button>
      </div>
    </div>
  );
}