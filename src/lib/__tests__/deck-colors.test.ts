import { describe, expect, it } from "vitest";
import { deckColorOptions, getDeckColorClass } from "../deck-colors";
import type { DeckColor } from "@/types";

describe("deckColorOptions", () => {
  it("has 6 color options", () => {
    expect(deckColorOptions).toHaveLength(6);
  });

  it("each option has value, label, and className", () => {
    for (const option of deckColorOptions) {
      expect(option).toHaveProperty("value");
      expect(option).toHaveProperty("label");
      expect(option).toHaveProperty("className");
      expect(typeof option.value).toBe("string");
      expect(typeof option.label).toBe("string");
      expect(typeof option.className).toBe("string");
    }
  });

  it("values match the DeckColor union", () => {
    const values = deckColorOptions.map((o) => o.value);
    expect(values).toEqual(["blue", "green", "amber", "rose", "violet", "slate"]);
  });
});

describe("getDeckColorClass", () => {
  it("returns correct class for each color", () => {
    expect(getDeckColorClass("blue")).toBe("bg-blue-500");
    expect(getDeckColorClass("green")).toBe("bg-emerald-500");
    expect(getDeckColorClass("amber")).toBe("bg-amber-500");
    expect(getDeckColorClass("rose")).toBe("bg-rose-500");
    expect(getDeckColorClass("violet")).toBe("bg-violet-500");
    expect(getDeckColorClass("slate")).toBe("bg-slate-500");
  });

  it("returns fallback class for invalid color", () => {
    expect(getDeckColorClass("invalid" as DeckColor)).toBe("bg-slate-500");
  });
});
