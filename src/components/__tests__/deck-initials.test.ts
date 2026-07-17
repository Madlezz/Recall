import { describe, expect, it } from "vitest";
import { deckInitials } from "@/components/deck-card";

describe("deckInitials", () => {
  it("skips leading emoji on template deck names", () => {
    expect(deckInitials("👋 How This Works")).toBe("HT");
    expect(deckInitials("💻 Coding")).toBe("CO");
    expect(deckInitials("🌐 Languages")).toBe("LA");
  });

  it("handles plain multi-word and single-word names", () => {
    expect(deckInitials("Japanese N5")).toBe("JN");
    expect(deckInitials("Anatomy")).toBe("AN");
  });
});
