import { describe, expect, it } from "vitest";
import { parseMarkdownCards } from "@/lib/markdown-importer";

describe("parseMarkdownCards", () => {
  it("parses heading-based format", () => {
    const md = `## What is the capital of France?
Paris is the capital and most populous city.

## What is 2+2?
4`;

    const cards = parseMarkdownCards(md);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("What is the capital of France?");
    expect(cards[0].back).toBe("Paris is the capital and most populous city.");
    expect(cards[1].front).toBe("What is 2+2?");
    expect(cards[1].back).toBe("4");
  });

  it("extracts hints from > lines", () => {
    const md = `## What is photosynthesis?
Plants convert sunlight to energy.
> Think: photo = light, synthesis = making`;

    const cards = parseMarkdownCards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].hint).toBe("Think: photo = light, synthesis = making");
  });

  it("extracts tags from 'tags:' line", () => {
    const md = `## What is the powerhouse of the cell?
Mitochondria
tags: biology, cells`;

    const cards = parseMarkdownCards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].tags).toEqual(["biology", "cells"]);
  });

  it("parses Q:/A: marker format", () => {
    const md = `Q: What is the speed of light?
A: 299,792,458 m/s

Q: What is Planck's constant?
A: 6.626 × 10^-34 J·s`;

    const cards = parseMarkdownCards(md);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("What is the speed of light?");
    expect(cards[0].back).toBe("299,792,458 m/s");
    expect(cards[1].front).toBe("What is Planck's constant?");
    expect(cards[1].back).toBe("6.626 × 10^-34 J·s");
  });

  it("parses bold Q:/A: marker format", () => {
    const md = `**Q:** What is DNA?
**A:** Deoxyribonucleic acid`;

    const cards = parseMarkdownCards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("What is DNA?");
    expect(cards[0].back).toBe("Deoxyribonucleic acid");
  });

  it("skips headings without answer content", () => {
    const md = `## Empty question

## Valid question
This has an answer.`;

    const cards = parseMarkdownCards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("Valid question");
  });

  it("handles multi-line answers", () => {
    const md = `## Explain the water cycle
Evaporation: water turns to vapor.
Condensation: vapor forms clouds.
Precipitation: water falls as rain.`;

    const cards = parseMarkdownCards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].back).toContain("Evaporation");
    expect(cards[0].back).toContain("Condensation");
    expect(cards[0].back).toContain("Precipitation");
  });

  it("handles empty input", () => {
    expect(parseMarkdownCards("")).toEqual([]);
    expect(parseMarkdownCards("   \n\n  ")).toEqual([]);
  });

  it("combines hint, tags, and answer in heading format", () => {
    const md = `## What is JSON?
JavaScript Object Notation — a lightweight data format.
> Think: JavaScript object syntax
tags: programming, web, data`;

    const cards = parseMarkdownCards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("What is JSON?");
    expect(cards[0].back).toBe("JavaScript Object Notation — a lightweight data format.");
    expect(cards[0].hint).toBe("Think: JavaScript object syntax");
    expect(cards[0].tags).toEqual(["programming", "web", "data"]);
  });
});