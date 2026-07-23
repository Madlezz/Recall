export function getStudyStreak(reviewLogs: { reviewDate: string }[]): number {
  if (reviewLogs.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const uniqueDates = new Set<number>();
  for (const log of reviewLogs) {
    const d = new Date(log.reviewDate);
    d.setHours(0, 0, 0, 0);
    const timestamp = d.getTime();
    uniqueDates.add(timestamp);
  }

  const sorted = Array.from(uniqueDates).sort((a, b) => b - a);

  // Check today
  if (sorted[0] !== today.getTime()) return 0;

  let streak = 1;
  const dayMs = 86_400_000;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1] - sorted[i] === dayMs) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export interface StreakGraceResult {
  streak: number;
  graceUsed: boolean;
}

/**
 * Streak with 1-day grace: miss 1 day = retained (dim flame), miss 2 = reset.
 * "Missed 1 day" = last review was today-2 (only yesterday missed); today pending.
 * ponytail: ceiling = configurable grace days; add when user research confirms default 1.
 */
export function applyStreakGrace(
  reviewLogs: { reviewDate: string }[],
  at: Date = new Date(),
): StreakGraceResult {
  const today = new Date(at);
  today.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;

  const uniqueDates = new Set<number>();
  let mostRecent = -Infinity;
  for (const log of reviewLogs) {
    const d = new Date(log.reviewDate);
    d.setHours(0, 0, 0, 0);
    const t = d.getTime();
    uniqueDates.add(t);
    if (t <= today.getTime() && t > mostRecent) mostRecent = t;
  }

  if (mostRecent === -Infinity) return { streak: 0, graceUsed: false };

  const gapDays = (today.getTime() - mostRecent) / dayMs;

  // Reviewed today -> normal streak, no grace
  if (gapDays === 0) {
    let streak = 1;
    let cursor = mostRecent - dayMs;
    while (uniqueDates.has(cursor)) {
      streak++;
      cursor -= dayMs;
    }
    return { streak, graceUsed: false };
  }

  // Missed today. Grace: last review within 1 missed day (gap 1 or 2 days).
  if (gapDays <= 2) {
    let streak = 1;
    let cursor = mostRecent - dayMs;
    while (uniqueDates.has(cursor)) {
      streak++;
      cursor -= dayMs;
    }
    return { streak, graceUsed: true };
  }

  // Missed 2+ days -> reset
  return { streak: 0, graceUsed: false };
}