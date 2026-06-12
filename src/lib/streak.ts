export function getStudyStreak(reviewLogs: { repliedAt: string }[]): number {
  if (reviewLogs.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const uniqueDates = new Set<number>();
  for (const log of reviewLogs) {
    const d = new Date(log.repliedAt);
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