/**
 * Parity test: verify Rust and JS card INSERT statements use the same column list.
 * This prevents schema-drift bugs when migrations add new columns.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

function extractColumnsFromSql(sql: string): string[] {
  // Match "INSERT INTO cards (col1, col2, ...) VALUES"
  const match = sql.match(/INSERT\s+INTO\s+cards\s*\(([^)]+)\)/i);
  if (!match) throw new Error("Could not parse INSERT INTO cards column list");

  return match[1]
    .split(",")
    .map((col) => col.trim().toLowerCase())
    .filter((col) => col.length > 0);
}

describe("Card INSERT parity (A1 audit)", () => {
  it("Rust and JS use the same column list for INSERT INTO cards", () => {
    // Read Rust SQL from db_atomic.rs
    const rustPath = resolve(__dirname, "../../src-tauri/src/db_atomic.rs");
    const rustSource = readFileSync(rustPath, "utf-8");

    // Extract first INSERT INTO cards statement (there are multiple)
    const rustInsertMatch = rustSource.match(/INSERT\s+INTO\s+cards\s*\(([^)]+)\)/i);
    if (!rustInsertMatch) throw new Error("Could not find INSERT INTO cards in db_atomic.rs");

    const rustColumns = extractColumnsFromSql(`INSERT INTO cards (${rustInsertMatch[1]}) VALUES (1)`);

    // JS column list (hardcoded here as the source of truth for JS side)
    const jsColumns = [
      "id",
      "deck_id",
      "front",
      "back",
      "hint",
      "source",
      "tags",
      "card_type",
      "state",
      "last_review_date",
      "next_review_date",
      "stability",
      "difficulty",
      "elapsed_days",
      "scheduled_days",
      "reps",
      "lapses",
      "created_at",
      "updated_at",
    ];

    expect(rustColumns).toEqual(jsColumns);
  });
});
