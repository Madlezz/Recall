import { describe, it, expect } from "vitest";
import { getForgettingCurve, getBestStudyTime } from "@/lib/stats";
import type { ReviewLog } from "@/types";

function makeLog(overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: crypto.randomUUID(),
    cardId: "card-1",
    rating: "good",
    reviewDate: "2026-06-01T10:00:00.000Z",
    stability: 1,
    difficulty: 5,
    elapsedDays: 1,
    scheduledDays: 1,
    ...overrides,
  };
}

describe("getForgettingCurve", () => {
  it("returns empty array for no reviews", () => {
    expect(getForgettingCurve([])).toEqual([]);
  });

  it("buckets reviews by scheduledDays", () => {
    const logs: ReviewLog[] = [
      // 1d bucket: 2 good, 1 again -> 67% retention
      makeLog({ scheduledDays: 0, rating: "good" }),
      makeLog({ scheduledDays: 1, rating: "good" }),
      makeLog({ scheduledDays: 1, rating: "again" }),
      // 4-7d bucket: 3 good, 1 hard -> 75% retention (good+easy=3, total=4)
      makeLog({ scheduledDays: 5, rating: "good" }),
      makeLog({ scheduledDays: 6, rating: "good" }),
      makeLog({ scheduledDays: 7, rating: "easy" }),
      makeLog({ scheduledDays: 7, rating: "hard" }),
    ];

    const curve = getForgettingCurve(logs);
    expect(curve).toHaveLength(2);

    const bucket1d = curve.find((c) => c.interval === "1d");
    expect(bucket1d).toBeDefined();
    expect(bucket1d!.reviewCount).toBe(3);
    expect(bucket1d!.retention).toBe(67);

    const bucket47 = curve.find((c) => c.interval === "4-7d");
    expect(bucket47).toBeDefined();
    expect(bucket47!.reviewCount).toBe(4);
    expect(bucket47!.retention).toBe(75);
  });

  it("skips empty buckets", () => {
    const logs: ReviewLog[] = [
      makeLog({ scheduledDays: 1, rating: "good" }),
      makeLog({ scheduledDays: 50, rating: "again" }),
    ];

    const curve = getForgettingCurve(logs);
    expect(curve).toHaveLength(2);
    expect(curve[0].interval).toBe("1d");
    expect(curve[1].interval).toBe("30d+");
  });
});

describe("getBestStudyTime", () => {
  it("returns null for no reviews", () => {
    expect(getBestStudyTime([])).toBeNull();
  });

  it("returns null when no hour has >= 10 reviews", () => {
    const logs = Array.from({ length: 5 }, () =>
      makeLog({ reviewDate: "2026-06-01T10:00:00.000Z" }),
    );
    expect(getBestStudyTime(logs)).toBeNull();
  });

  it("finds the hour with highest accuracy", () => {
    // Use local-time dates to avoid TZ issues with getHours()
    const hour9 = new Date(2026, 5, 1, 9, 0, 0).toISOString();
    const hour22 = new Date(2026, 5, 1, 22, 0, 0).toISOString();

    // Hour 9 (9 AM): 15 reviews, 14 good -> 93%
    const h9 = Array.from({ length: 15 }, (_, i) =>
      makeLog({ id: `h9-${i}`, reviewDate: hour9, rating: "good" }),
    );
    h9[0] = { ...h9[0], rating: "again" };

    // Hour 22 (10 PM): 12 reviews, 6 good -> 50%
    const h22 = Array.from({ length: 12 }, (_, i) =>
      makeLog({ id: `h22-${i}`, reviewDate: hour22, rating: i < 6 ? "good" : "again" }),
    );

    const result = getBestStudyTime([...h9, ...h22]);
    expect(result).not.toBeNull();
    expect(result!.hour).toBe(9);
    expect(result!.label).toBe("9 AM");
    expect(result!.accuracy).toBe(93);
    expect(result!.reviewCount).toBe(15);
  });

  it("formats 12 AM and 12 PM labels correctly", () => {
    // 12 AM (midnight local time)
    const midnightLocal = new Date(2026, 5, 1, 0, 0, 0).toISOString();
    const midnight = Array.from({ length: 11 }, (_, i) =>
      makeLog({ id: `mid-${i}`, reviewDate: midnightLocal, rating: "good" }),
    );

    const result = getBestStudyTime(midnight);
    expect(result).not.toBeNull();
    expect(result!.label).toBe("12 AM");
    expect(result!.hour).toBe(0);
  });
});
