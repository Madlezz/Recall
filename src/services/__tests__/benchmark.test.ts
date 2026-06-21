import { describe, it, expect, beforeAll } from "vitest";
import { queryCards, upsertCard } from "@/services/repository";

/**
 * Performance benchmark for large datasets.
 * Ensures A1/A2 optimizations hold at scale.
 *
 * This test creates 10,000 cards and verifies:
 * 1. Bulk upsert performance (should complete in < 30s)
 * 2. Query performance with filters (should complete in < 1s)
 */
describe("large dataset performance benchmark", () => {
  const DECK_ID = "benchmark-deck";
  const CARD_COUNT = 10_000;

  beforeAll(async () => {
    // Create test deck
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("upsert_deck", { deck: { id: DECK_ID, name: "Benchmark Deck", createdAt: Date.now() } });
  }, 60_000);

  it("upserts 10,000 cards in reasonable time", async () => {
    const start = performance.now();

    const promises = [];
    for (let i = 0; i < CARD_COUNT; i++) {
      promises.push(
        upsertCard({
          id: `bench-card-${i}`,
          deckId: DECK_ID,
          front: `Front ${i}`,
          back: `Back ${i}`,
          createdAt: Date.now(),
          dueAt: Date.now(),
          stability: 1,
          difficulty: 5,
          elapsedDays: 0,
          scheduledDays: 1,
          reps: 0,
          lapses: 0,
          state: 0,
          lastReview: null,
        })
      );
    }

    await Promise.all(promises);
    const elapsed = performance.now() - start;

    console.log(`Upserted ${CARD_COUNT} cards in ${elapsed.toFixed(0)}ms`);

    // Should complete in under 30 seconds
    expect(elapsed).toBeLessThan(30_000);
  }, 60_000);

  it("queries filtered cards efficiently", async () => {
    // Query with various filters
    const start = performance.now();

    const results = await queryCards({
      deckId: DECK_ID,
      limit: 100,
      offset: 0,
    });

    const elapsed = performance.now() - start;

    console.log(`Query returned ${results.length} cards in ${elapsed.toFixed(0)}ms`);

    expect(results.length).toBe(100);
    // Should complete in under 1 second
    expect(elapsed).toBeLessThan(1_000);
  });

  it("queries due cards efficiently", async () => {
    const start = performance.now();

    const results = await queryCards({
      dueBefore: Date.now() + 86_400_000, // due in next 24h
      limit: 1000,
    });

    const elapsed = performance.now() - start;

    console.log(`Due query returned ${results.length} cards in ${elapsed.toFixed(0)}ms`);

    expect(results.length).toBeGreaterThan(0);
    // Should complete in under 1 second
    expect(elapsed).toBeLessThan(1_000);
  });
}, 120_000);
