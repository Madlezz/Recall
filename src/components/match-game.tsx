import confetti from "canvas-confetti";
import { ArrowLeft, Check, Clock, RotateCcw, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { cardSurface, successSurface, typeClass } from "@/lib/surface";
import { useRecallStore } from "@/stores/recall-store";
import { prefersReducedMotion, CONFETTI_COLORS } from "@/lib/xp";
import { getLevel, triggerLevelUpConfetti } from "@/lib/xp";
import { getMatchGameXp } from "@/lib/xp-rules";
import { playTileClickSound, playMatchSound, playMismatchSound } from "@/services/audio";
import type { Card } from "@/types";

interface MatchTile {
  id: string;
  cardId: string;
  side: "front" | "back";
  text: string;
}

type FeedbackType = "match" | "mismatch" | null;

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Pick a random subset of cards */
function pickCards(cards: Card[], count: number): Card[] {
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function buildTiles(cards: Card[]): MatchTile[] {
  const tiles: MatchTile[] = [];
  for (const card of cards) {
    tiles.push({ id: `${card.id}-front`, cardId: card.id, side: "front", text: card.front });
    tiles.push({ id: `${card.id}-back`, cardId: card.id, side: "back", text: card.back });
  }
  return tiles.sort(() => Math.random() - 0.5);
}

export function MatchGame(): JSX.Element {
  const { t } = useTranslation();
  const cards = useRecallStore((state) => state.cards);
  const settings = useRecallStore((state) => state.settings);
  const addXp = useRecallStore((state) => state.addXp);
  const showDashboard = useRecallStore((state) => state.showDashboard);
  const selectedDeckId = useRecallStore((state) => state.selectedDeckId);
  const decks = useRecallStore((state) => state.decks);

  const deck = selectedDeckId ? decks.find((d) => d.id === selectedDeckId) : null;
  const deckCards = cards.filter((c) => c.deckId === selectedDeckId);
  const pairCount = Math.min(6, Math.max(2, Math.floor(deckCards.length / 2)));

  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [shaking, setShaking] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [moves, setMoves] = useState(0);
  const [gameCards, setGameCards] = useState<Card[]>([]);
  const [xpEarned, setXpEarned] = useState(0);
  // Visual feedback for deaf users (replaces audio-only match/mismatch sounds)
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [announcement, setAnnouncement] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpAwarded = useRef(false);

  // Auto-dismiss visual feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 400);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const startGame = useCallback(() => {
    // Clean up any running state
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const picked = pickCards(deckCards, pairCount);
    setGameCards(picked);
    setTiles(buildTiles(picked));
    setSelected(null);
    setMatched(new Set());
    setShaking(new Set());
    setElapsed(0);
    setRunning(true);
    setFinished(false);
    setMoves(0);
    setXpEarned(0);
    xpAwarded.current = false;

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, [deckCards, pairCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleTileClick(tileId: string): void {
    if (!running || finished) return;
    if (matched.has(tileId)) return;
    if (shaking.size > 0) return;
    playTileClickSound();

    if (selected === null) {
      setSelected(tileId);
      return;
    }

    // Don't allow clicking the same tile
    if (selected === tileId) {
      setSelected(null);
      return;
    }

    const first = tiles.find((t) => t.id === selected);
    const second = tiles.find((t) => t.id === tileId);
    setMoves((m) => m + 1);

    if (!first || !second) return;

    // Match: same card, different sides
    if (first.cardId === second.cardId && first.side !== second.side) {
      playMatchSound();
      setFeedback("match");
      setAnnouncement(t("matchGame.matchedAnnouncement", { matched: matchedPairs + 1, total: totalPairs }));
      setMatched((prev) => new Set([...prev, first.id, second.id]));
      setSelected(null);

      // Check completion
      const newMatched = new Set([...matched, first.id, second.id]);
      if (newMatched.size >= tiles.length) {
        // Game complete!
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunning(false);
        setFinished(true);
        setAnnouncement(t("matchGame.completeAnnouncement", { total: totalPairs, time: formatTime(elapsed), moves: moves + 1 }));

        // Big confetti
        if (!prefersReducedMotion()) {
          confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.4 },
            colors: [...CONFETTI_COLORS.celebration],
          });
        }

        // Award XP - only once per game
        if (!xpAwarded.current) {
          xpAwarded.current = true;
          const pairCount = tiles.length / 2;
          // moves is stale after setMoves call - use +1
          const actualMoves = moves + 1;
          const perfectGame = actualMoves === pairCount;
          const xp = getMatchGameXp({
            isPerfect: perfectGame,
            elapsedSeconds: elapsed,
          });

          setXpEarned(xp);

          const oldLevel = getLevel(settings.xp);
          const newXp = settings.xp + xp;
          const newLevel = getLevel(newXp);

          void addXp(xp);
          if (newLevel > oldLevel) {
            setTimeout(() => triggerLevelUpConfetti(), 300);
          }
        }
      }
    } else {
      // No match - shake
      playMismatchSound();
      setFeedback("mismatch");
      setAnnouncement(t("matchGame.notAMatch"));
      setShaking(new Set([first.id, second.id]));
      timeoutRef.current = setTimeout(() => {
        setShaking(new Set());
        setSelected(null);
      }, 600);
    }
  }

  const totalPairs = gameCards.length;
  const matchedPairs = matched.size / 2;

  // --- Empty state (stitch pattern) ---
  if (deckCards.length < 2) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
            <Zap className="h-6 w-6 text-on-surface-variant" />
          </div>
          <h1 className={cn(typeClass["title-md"], "text-text-primary")}>{t("matchGame.notEnoughCards")}</h1>
          <p className={cn(typeClass["body-md"], "text-on-surface-variant")}>{t("matchGame.addCardsHint")}</p>
          <button
            onClick={showDashboard}
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("matchGame.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[88vh] flex-col relative">
      {/* Visual feedback overlay for deaf users */}
      {feedback && (
        <div
          className={`pointer-events-none fixed inset-0 z-50 transition-opacity duration-300 ${
            feedback === "match" ? "bg-review-easy/10" : "bg-review-again/10"
          }`}
          aria-hidden="true"
        />
      )}

      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {/* Header — stitch pattern */}
      <header className="flex items-center justify-between pb-4">
        <button
          onClick={showDashboard}
          className="inline-flex items-center gap-1.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low px-3 py-2 active:scale-95 transition-all"
          aria-label={t("matchGame.exitAria")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("matchGame.exit")}
        </button>

        <div className="flex items-center gap-4" role="group" aria-label={t("matchGame.gameStatsAria")}>
          <span className={cn("flex items-center gap-1", typeClass.caption, "text-on-surface-variant")} aria-label={t("matchGame.timeElapsedAria", { time: formatTime(elapsed) })}>
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {formatTime(elapsed)}
          </span>
          <span className={cn("flex items-center gap-1", typeClass.caption, "text-on-surface-variant")} aria-label={t("matchGame.pairsMatchedAria", { matched: matchedPairs, total: totalPairs })}>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {matchedPairs}/{totalPairs}
          </span>
          <span className={cn("flex items-center gap-1", typeClass.caption, "text-on-surface-variant")} aria-label={t("matchGame.movesAria", { count: moves })}>
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            {t("matchGame.moves", { count: moves })}
          </span>
        </div>

        <button
          onClick={startGame}
          className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
          aria-label={t("matchGame.restartAria")}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t("matchGame.restart")}
        </button>
      </header>

      {/* Rules hint — brief, dismissible */}
      {!finished && (
        <p className={cn(typeClass.caption, "mb-3 text-center text-on-surface-variant")}>
          {t("matchGame.rulesHint")}
        </p>
      )}

      {/* Finished overlay — stitch success pattern */}
      {finished && (
        <div className={cn(successSurface("p-lg mb-6 text-center"), "border-tertiary/30")} role="alert">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-container text-tertiary">
            <Check className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className={cn(typeClass["title-md"], "mt-3 text-text-primary")}>{t("matchGame.allMatched")}</h2>
          <p className={cn(typeClass["body-md"], "mt-1 text-on-surface-variant")}>
            {t("matchGame.summary", { total: totalPairs, time: formatTime(elapsed), moves })}
          </p>
          {xpEarned > 0 && (
            <p className={cn(typeClass.label-lg, "mt-2 text-on-secondary-container")}>
              {t("matchGame.xpEarned", { count: xpEarned })}
            </p>
          )}
          <button
            onClick={startGame}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            {t("matchGame.playAgain")}
          </button>
        </div>
      )}

      {/* Tile grid */}
      <div className="flex-1 flex items-start justify-center pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full max-w-4xl" role="group" aria-label={t("matchGame.tilesAria")}>
          {tiles.map((tile) => {
            const isMatched = matched.has(tile.id);
            const isShaking = shaking.has(tile.id);
            const isSelected = selected === tile.id;
            const isFront = tile.side === "front";

            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile.id)}
                disabled={isMatched}
                aria-label={`${isFront ? t("matchGame.question") : t("matchGame.answer")}: ${tile.text}. ${
                  isMatched ? t("matchGame.alreadyMatched") : isSelected ? t("matchGame.currentlySelected") : ""
                }`}
                aria-selected={isSelected}
                aria-disabled={isMatched}
                className={cn(
                  "min-h-[90px] rounded-xl p-3 text-sm font-medium transition-all duration-200 text-left",
                  "hover:shadow-md active:scale-[0.97]",
                  isMatched
                    ? "opacity-20 scale-95 pointer-events-none"
                    : isShaking
                      ? "animate-shake border border-review-again/30 bg-review-again/10"
                      : isSelected
                        ? cn(cardSurface("p-3"), "shadow-sm ring-2 ring-primary/20 border-primary/30")
                        : isFront
                          ? cn(cardSurface("p-3"), "hover:border-primary/30 hover:bg-primary/5")
                          : cn(cardSurface("p-3"), "hover:border-secondary/30 hover:bg-secondary/5"),
                )}
              >
                <span className={cn(typeClass.caption, "text-on-surface-variant mb-1 block uppercase tracking-[0.15em]")}>
                  {isFront ? t("matchGame.question") : t("matchGame.answer")}
                </span>
                <p className="line-clamp-3 leading-snug">{tile.text}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}