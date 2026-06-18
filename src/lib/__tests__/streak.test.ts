import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getStudyStreak } from "../streak";

describe("getStudyStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for empty review logs", () => {
    expect(getStudyStreak([])).toBe(0);
  });

  it("returns 0 when no reviews today", () => {
    vi.setSystemTime(new Date("2026-06-18T12:00:00"));
    const logs = [
      { reviewDate: "2026-06-16T10:00:00" },
      { reviewDate: "2026-06-15T10:00:00" },
    ];
    expect(getStudyStreak(logs)).toBe(0);
  });

  it("returns 1 when only reviewed today", () => {
    vi.setSystemTime(new Date("2026-06-18T12:00:00"));
    const logs = [{ reviewDate: "2026-06-18T10:00:00" }];
    expect(getStudyStreak(logs)).toBe(1);
  });

  it("returns 2 for today and yesterday", () => {
    vi.setSystemTime(new Date("2026-06-18T12:00:00"));
    const logs = [
      { reviewDate: "2026-06-18T10:00:00" },
      { reviewDate: "2026-06-17T10:00:00" },
    ];
    expect(getStudyStreak(logs)).toBe(2);
  });

  it("calculates longer streak correctly", () => {
    vi.setSystemTime(new Date("2026-06-18T12:00:00"));
    const logs = [
      { reviewDate: "2026-06-18T10:00:00" },
      { reviewDate: "2026-06-17T10:00:00" },
      { reviewDate: "2026-06-16T10:00:00" },
      { reviewDate: "2026-06-15T10:00:00" },
      { reviewDate: "2026-06-14T10:00:00" },
    ];
    expect(getStudyStreak(logs)).toBe(5);
  });

  it("breaks streak when day is missing", () => {
    vi.setSystemTime(new Date("2026-06-18T12:00:00"));
    const logs = [
      { reviewDate: "2026-06-18T10:00:00" },
      { reviewDate: "2026-06-17T10:00:00" },
      { reviewDate: "2026-06-15T10:00:00" }, // gap on 16th
      { reviewDate: "2026-06-14T10:00:00" },
    ];
    expect(getStudyStreak(logs)).toBe(2);
  });

  it("handles multiple reviews on same day", () => {
    vi.setSystemTime(new Date("2026-06-18T12:00:00"));
    const logs = [
      { reviewDate: "2026-06-18T10:00:00" },
      { reviewDate: "2026-06-18T14:00:00" },
      { reviewDate: "2026-06-18T18:00:00" },
      { reviewDate: "2026-06-17T10:00:00" },
    ];
    expect(getStudyStreak(logs)).toBe(2);
  });

  it("handles timezone differences", () => {
    vi.setSystemTime(new Date("2026-06-18T23:59:00"));
    const logs = [
      { reviewDate: "2026-06-18T00:01:00" },
      { reviewDate: "2026-06-17T23:59:00" },
    ];
    expect(getStudyStreak(logs)).toBe(2);
  });

  it("handles unsorted review logs", () => {
    vi.setSystemTime(new Date("2026-06-18T12:00:00"));
    const logs = [
      { reviewDate: "2026-06-15T10:00:00" },
      { reviewDate: "2026-06-18T10:00:00" },
      { reviewDate: "2026-06-17T10:00:00" },
      { reviewDate: "2026-06-16T10:00:00" },
    ];
    expect(getStudyStreak(logs)).toBe(4);
  });
});
