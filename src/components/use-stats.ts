import { useMemo, useEffect } from "react";
import { format, subDays } from "date-fns";
import { useRecallStore } from "@/stores/recall-store";
import { getStudyStreak } from "@/lib/streak";
import { getLevel, getLevelTitle } from "@/lib/xp";
import type { ReviewLog } from "@/types";

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
  }
  return days;
}

function reviewsByDay(logs: ReviewLog[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const log of logs) {
    const day = log.reviewDate.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return map;
}

function ratingsByDay(logs: ReviewLog[]): Map<string, { again: number; hard: number; good: number; easy: number }> {
  const map = new Map<string, { again: number; hard: number; good: number; easy: number }>();
  for (const log of logs) {
    const day = log.reviewDate.slice(0, 10);
    const entry = map.get(day) ?? { again: 0, hard: 0, good: 0, easy: 0 };
    entry[log.rating]++;
    map.set(day, entry);
  }
  return map;
}

function reviewsByHour(logs: ReviewLog[]): number[] {
  const hours = new Array(24).fill(0) as number[];
  for (const log of logs) {
    const h = new Date(log.reviewDate).getHours();
    hours[h]++;
  }
  return hours;
}

function deckReviewCounts(logs: ReviewLog[], cards: { id: string; deckId: string }[]): Map<string, number> {
  const cardDeck = new Map(cards.map((c) => [c.id, c.deckId]));
  const map = new Map<string, number>();
  for (const log of logs) {
    const deckId = cardDeck.get(log.cardId);
    if (deckId) map.set(deckId, (map.get(deckId) ?? 0) + 1);
  }
  return map;
}

export function useStats() {
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const cards = useRecallStore((state) => state.cards);
  const decks = useRecallStore((state) => state.decks);
  const settings = useRecallStore((state) => state.settings);
  const studySessions = useRecallStore((state) => state.studySessions);
  const loadAllReviewLogs = useRecallStore((state) => state.loadAllReviewLogs);

  // Load full review log history when stats page mounts
  useEffect(() => {
    void loadAllReviewLogs();
  }, [loadAllReviewLogs]);

  const streak = useMemo(() => getStudyStreak(reviewLogs), [reviewLogs]);
  const level = useMemo(() => getLevel(settings.xp), [settings.xp]);
  const title = useMemo(() => getLevelTitle(level), [level]);

  const days = useMemo(() => lastNDays(30), []);
  const byDay = useMemo(() => reviewsByDay(reviewLogs), [reviewLogs]);
  const byDayRatings = useMemo(() => ratingsByDay(reviewLogs), [reviewLogs]);
  const byHour = useMemo(() => reviewsByHour(reviewLogs), [reviewLogs]);
  const deckCounts = useMemo(() => deckReviewCounts(reviewLogs, cards), [reviewLogs, cards]);

  const dayData = useMemo(() => days.map((d) => byDay.get(d) ?? 0), [days, byDay]);
  const dayRatingData = useMemo(
    () => days.map((d) => byDayRatings.get(d) ?? { again: 0, hard: 0, good: 0, easy: 0 }),
    [days, byDayRatings],
  );

  const totalReviews = reviewLogs.length;
  const maxHour = Math.max(1, ...byHour);
  const totalSessions = studySessions.length;

  const ratingDist = useMemo(() => {
    let again = 0, hard = 0, good = 0, easy = 0;
    for (const log of reviewLogs) {
      if (log.rating === "again") again++;
      else if (log.rating === "hard") hard++;
      else if (log.rating === "good") good++;
      else easy++;
    }
    return { again, hard, good, easy };
  }, [reviewLogs]);

  const totalRated = ratingDist.again + ratingDist.hard + ratingDist.good + ratingDist.easy;
  const accuracy = totalRated > 0 ? Math.round(((ratingDist.good + ratingDist.easy) / totalRated) * 100) : 0;

  const topDecks = useMemo(() => {
    return [...deckCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([deckId, count]) => {
        const deck = decks.find((d) => d.id === deckId);
        return { name: deck?.name ?? "Unknown Deck", count };
      });
  }, [deckCounts, decks]);

  return {
    reviewLogs,
    cards,
    decks,
    settings,
    studySessions,
    streak,
    level,
    title,
    days,
    dayData,
    dayRatingData,
    byHour,
    maxHour,
    totalReviews,
    totalSessions,
    ratingDist,
    totalRated,
    accuracy,
    topDecks,
  };
}