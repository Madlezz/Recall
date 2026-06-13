import { describe, it, expect } from "vitest";
import { parseBulkCards } from "@/lib/bulk-parser";

describe("parseBulkCards", () => {
  it("parses Q:/A: pairs", () => {
    const result = parseBulkCards("Q: What is 2+2?\nA: 4");
    expect(result).toHaveLength(1);
    expect(result[0].front).toBe("What is 2+2?");
    expect(result[0].back).toBe("4");
  });

  it("parses multiple cards separated by blank lines", () => {
    const result = parseBulkCards("Q: One\nA: 1\n\nQ: Two\nA: 2");
    expect(result).toHaveLength(2);
    expect(result[1].front).toBe("Two");
    expect(result[1].back).toBe("2");
  });

  it("detects cloze deletions and allows missing back", () => {
    const result = parseBulkCards("Q: {{c1::Paris}} is the capital of {{c2::France}}");
    expect(result).toHaveLength(1);
    expect(result[0].front).toContain("{{c1::Paris}}");
    expect(result[0].back).toBe("");
  });

  it("parses hint, source, and tags", () => {
    const result = parseBulkCards("Q: Capital\nA: Jakarta\nHint: On Java\nSource: Wikipedia\nTags: asia, capitals");
    expect(result).toHaveLength(1);
    expect(result[0].hint).toBe("On Java");
    expect(result[0].source).toBe("Wikipedia");
    expect(result[0].tags).toEqual(["asia", "capitals"]);
  });

  it("handles deck-switch directive", () => {
    const result = parseBulkCards("---next deck: Geography---\nQ: Capital\nA: Jakarta");
    expect(result).toHaveLength(1);
    expect(result[0].nextDeckName).toBe("Geography");
  });

  it("returns empty array for empty input", () => {
    expect(parseBulkCards("")).toHaveLength(0);
    expect(parseBulkCards("\n\n")).toHaveLength(0);
  });

  it("skips block without front", () => {
    const result = parseBulkCards("A: Only answer, no question");
    expect(result).toHaveLength(0);
  });

  it("requires back for non-cloze cards", () => {
    const result = parseBulkCards("Q: Only question, no answer");
    expect(result).toHaveLength(0);
  });

  it("handles multi-line front and back", () => {
    const result = parseBulkCards("Q: Line 1\nLine 2\nA: Answer 1\nAnswer 2");
    expect(result).toHaveLength(1);
    expect(result[0].front).toBe("Line 1\nLine 2");
    expect(result[0].back).toBe("Answer 1\nAnswer 2");
  });
});