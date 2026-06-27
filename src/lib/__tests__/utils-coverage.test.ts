import { describe, it, expect, vi, afterEach } from "vitest";
import { createId } from "../utils";

describe("createId fallback (no crypto.randomUUID)", () => {
  const originalCrypto = globalThis.crypto;

  afterEach(() => {
    // Restore original crypto
    Object.defineProperty(globalThis, "crypto", {
      value: originalCrypto,
      writable: true,
      configurable: true,
    });
  });

  it("uses Math.random fallback when crypto is undefined", () => {
    // Remove crypto entirely
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const id = createId("fallback");
    expect(id).toMatch(/^fallback_/);
    // Fallback format: prefix_randomBase36_timestampBase36
    const parts = id.split("_");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("fallback");
    // Second part is base36 random
    expect(parts[1].length).toBeGreaterThan(0);
    // Third part is base36 timestamp
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("uses Math.random fallback when randomUUID is not in crypto", () => {
    // Provide crypto object without randomUUID
    Object.defineProperty(globalThis, "crypto", {
      value: { getRandomValues: vi.fn() },
      writable: true,
      configurable: true,
    });

    const id = createId("test");
    expect(id).toMatch(/^test_/);
    const parts = id.split("_");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("test");
  });

  it("generates unique IDs with fallback", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const ids = new Set(Array.from({ length: 50 }, () => createId("uniq")));
    // All should be unique (extremely unlikely collision with Math.random + Date.now)
    expect(ids.size).toBe(50);
  });

  it("fallback ID contains valid base36 characters", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const id = createId("base36");
    const parts = id.split("_");
    // base36 chars are [0-9a-z]
    expect(parts[1]).toMatch(/^[0-9a-z]+$/);
    expect(parts[2]).toMatch(/^[0-9a-z]+$/);
  });
});
