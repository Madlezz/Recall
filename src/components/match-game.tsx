import confetti from "canvas-confetti";
import { ArrowLeft, Check, Clock, RotateCcw, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import { getLevel, triggerLevelUpConfetti } from "@/lib/xp";
import { playTileClickSound, playMatchSound, playMismatchSound } from "@/services/audio";
import type { Card } from "@/types";

interface MatchTile {
  id: string;
  cardId: string;
  side: "front" | "back";
  text: string;
}

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
  const _allCards = useRecallStore((state) => state.cards);
  const settings = useRecallStore((state) => state.settings);
  const updateSettings = useRecallStore((state) => state.updateSettings);
  const showDashboard = useRecallStore((state) => state.showDashboard);
  const selectedDeckId = useRecallStore((state) => state.selectedDeckId);
  const _decks = useRecallStore((state) => state.decks);

  useRecallStore((state) => state.cards); // ensure subscription
  const cards = useRecallStore((state) => state.cards).filter((c) => c.deckId === selectedDeckId);
  const deckCards = useMemo(
    () => (selectedDeckId ? cards.filter((c) => c.deckId === selectedDeckId) : cards),
    [cards, selectedDeckId],
  );

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpAwarded = useRef(false);

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

  // Start on mount
  useEffect(() => {
    startGame();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [startGame]);

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
      setMatched((prev) => new Set([...prev, first.id, second.id]));
      setSelected(null);

      // Check completion
      const newMatched = new Set([...matched, first.id, second.id]);
      if (newMatched.size >= tiles.length) {
        // Game complete!
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunning(false);
        setFinished(true);

        // Big confetti
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.4 },
          colors: ["#a855f7", "#6366f1", "#22c55e", "#f59e0b", "#ec4899"],
        });

        // Award XP — only once per game
        if (!xpAwarded.current) {
          xpAwarded.current = true;
          const totalPairs = tiles.length / 2;
          // moves is stale after setMoves call — use +1
          const actualMoves = moves + 1;
          const perfectGame = actualMoves === totalPairs;
          const fastGame = elapsed < 60;
          const quickGame = elapsed < 120;

          let xp = 30; // base
          if (perfectGame) xp += 25; // perfect: every tap was a match
          if (fastGame) xp += 20;
          else if (quickGame) xp += 10;

          setXpEarned(xp);

          const oldLevel = getLevel(settings.xp);
          const newXp = settings.xp + xp;
          const newLevel = getLevel(newXp);

          void updateSettings({ xp: newXp });
          if (newLevel > oldLevel) {
            setTimeout(() => triggerLevelUpConfetti(), 300);
          }
        }
      }
    } else {
      // No match — shake
      playMismatchSound();
      setShaking(new Set([first.id, second.id]));
      timeoutRef.current = setTimeout(() => {
        setShaking(new Set());
        setSelected(null);
      }, 600);
    }
  }

  const totalPairs = gameCards.length;
  const matchedPairs = matched.size / 2;

  if (deckCards.length < 2) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold">Not enough cards</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Add at least 2 cards to play Match Game</p>
          <Button onClick={showDashboard}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[88vh] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between pb-4">
        <Button variant="ghost" onClick={showDashboard}>
          <ArrowLeft className="h-4 w-4" />
          Exit
        </Button>

        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatTime(elapsed)}
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-4 w-4" />
            {matchedPairs}/{totalPairs}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            {moves} moves
          </span>
        </div>

        <Button variant="outline" size="sm" onClick={startGame}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Restart
        </Button>
      </header>

      {/* Finished overlay */}
      {finished && (
        <div className="mb-6 rounded-lg border bg-emerald-500/10 border-emerald-500/30 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
            <Check className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-xl font-bold">All matched!</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {totalPairs} pairs in {formatTime(elapsed)} · {moves} moves
          </p>
          {xpEarned > 0 && (
            <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              +{xpEarned} XP
            </p>
          )}
          <Button className="mt-4" onClick={startGame}>
            Play Again
          </Button>
        </div>
      )}

      {/* Tile grid */}
      <div className="flex-1 flex items-start justify-center pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full max-w-4xl">
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
                className={cn(
                  "min-h-[90px] rounded-lg border p-3 text-sm font-medium transition-all duration-200 text-left",
                  "hover:shadow-sm active:scale-[0.97]",
                  isMatched
                    ? "opacity-20 scale-95 pointer-events-none"
                    : isShaking
                      ? "animate-shake border-red-400 bg-red-500/10"
                      : isSelected
                        ? "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 shadow-sm ring-1 ring-zinc-300 dark:ring-zinc-700"
                        : isFront
                          ? "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50 hover:bg-blue-500/10"
                          : "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10",
                )}
              >
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 block">
                  {isFront ? "Question" : "Answer"}
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