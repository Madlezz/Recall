import { useMemo, useEffect } from "react";
import { format, subDays } from "date-fns";
import { useRecallStore } from "@/stores/recall-store";
import { getStudyStreak } from "@/lib/streak";
import { getLevel, getLevelTitle } from "@/lib/xp";
import type { ReviewLog } from "@/types";

type RatingCounts = { again: number; hard: number; good: number; easy: number };

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
  }
  return days;
}

// Exported for unit testing the aggregation logic.
export { aggregateStats, retentionOverTime };

/**
 * Single-pass aggregation over reviewLogs.
 * Replaces 6 separate O(n) scans (+1 O(n×30) nested filter) with one O(n) pass.
 */
function aggregateStats(
  logs: ReviewLog[],
  cards: { id: string; deckId: string }[],
): {
  byDay: Map<string, number>;
  byDayRatings: Map<string, RatingCounts>;
  byHour: number[];
  deckCounts: Map<string, number>;
  ratingDist: RatingCounts;
  buckets: Map<string, RatingCounts>;
} {
  const cardDeck = new Map(cards.map((c) => [c.id, c.deckId]));
  const byDay = new Map<string, number>();
  const byDayRatings = new Map<string, RatingCounts>();
  const byHour = new Array(24).fill(0) as number[];
  const deckCounts = new Map<string, number>();
  const ratingDist: RatingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
  const buckets = new Map<string, RatingCounts>();

  for (const log of logs) {
    const day = log.reviewDate.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);

    const rc = byDayRatings.get(day) ?? { again: 0, hard: 0, good: 0, easy: 0 };
    rc[log.rating]++;
    byDayRatings.set(day, rc);

    byHour[new Date(log.reviewDate).getHours()]++;

    const deckId = cardDeck.get(log.cardId);
    if (deckId) deckCounts.set(deckId, (deckCounts.get(deckId) ?? 0) + 1);

    ratingDist[log.rating]++;

    const b = buckets.get(day) ?? { again: 0, hard: 0, good: 0, easy: 0 };
    b[log.rating]++;
    buckets.set(day, b);
  }

  return { byDay, byDayRatings, byHour, deckCounts, ratingDist, buckets };
}

/**
 * Rolling 7-day retention (good+easy / total) per day.
 * Sliding window over per-day buckets: O(n + days) instead of O(n × days).
 */
function retentionOverTime(buckets: Map<string, RatingCounts>, days: string[]): number[] {
  let w = { again: 0, hard: 0, good: 0, easy: 0 };
  const result: number[] = [];

  for (let i = 0; i < days.length; i++) {
    const cur = buckets.get(days[i]);
    if (cur) {
      w.again += cur.again;
      w.hard += cur.hard;
      w.good += cur.good;
      w.easy += cur.easy;
    }
    // Drop the day that falls outside the 7-day window.
    if (i >= 7) {
      const old = buckets.get(days[i - 7]);
      if (old) {
        w.again -= old.again;
        w.hard -= old.hard;
        w.good -= old.good;
        w.easy -= old.easy;
      }
    }
    const total = w.again + w.hard + w.good + w.easy;
    if (total < 3) {
      result.push(-1);
    } else {
      result.push(Math.round(((w.good + w.easy) / total) * 100));
    }
  }

  return result;
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
  const stats = useMemo(() => aggregateStats(reviewLogs, cards), [reviewLogs, cards]);

  const dayData = useMemo(() => days.map((d) => stats.byDay.get(d) ?? 0), [days, stats]);
  const dayRatingData = useMemo(
    () => days.map((d) => stats.byDayRatings.get(d) ?? { again: 0, hard: 0, good: 0, easy: 0 }),
    [days, stats],
  );
  const retentionData = useMemo(() => retentionOverTime(stats.buckets, days), [days, stats]);

  const totalReviews = reviewLogs.length;
  const maxHour = Math.max(1, ...stats.byHour);
  const totalSessions = studySessions.length;

  const ratingDist = stats.ratingDist;
  const totalRated = ratingDist.again + ratingDist.hard + ratingDist.good + ratingDist.easy;
  const accuracy = totalRated > 0 ? Math.round(((ratingDist.good + ratingDist.easy) / totalRated) * 100) : 0;

  const topDecks = useMemo(() => {
    return [...stats.deckCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([deckId, count]) => {
        const deck = decks.find((d) => d.id === deckId);
        return { name: deck?.name ?? "Unknown Deck", count };
      });
  }, [stats, decks]);

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
    retentionData,
    byHour: stats.byHour,
    maxHour,
    totalReviews,
    totalSessions,
    ratingDist,
    totalRated,
    accuracy,
    topDecks,
  };
}
