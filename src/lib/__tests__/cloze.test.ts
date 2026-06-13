import { describe, expect, test } from "vitest";
import { hasCloze, parseCloze, renderCloze } from "../cloze";

describe("cloze", () => {
  describe("hasCloze", () => {
    test("detects {{c1::text}}", () => {
      expect(hasCloze("The {{c1::capital}} of France")).toBe(true);
    });

    test("returns false for plain text", () => {
      expect(hasCloze("The capital of France is Paris")).toBe(false);
    });

    test("detects multiple cloze markers", () => {
      expect(hasCloze("{{c1::foo}} and {{c2::bar}}")).toBe(true);
    });

    test("returns false for empty string", () => {
      expect(hasCloze("")).toBe(false);
    });
  });

  describe("parseCloze", () => {
    test("splits text around cloze markers", () => {
      const segments = parseCloze("The {{c1::capital}} is Paris");
      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({ text: "The ", isCloze: false });
      expect(segments[1]).toEqual({ text: "capital", isCloze: true, clozeIndex: 1 });
      expect(segments[2]).toEqual({ text: " is Paris", isCloze: false });
    });

    test("handles text with no cloze markers", () => {
      const segments = parseCloze("Plain text");
      expect(segments).toHaveLength(1);
      expect(segments[0]).toEqual({ text: "Plain text", isCloze: false });
    });

    test("handles multiple cloze markers", () => {
      const segments = parseCloze("{{c1::foo}} and {{c2::bar}}");
      expect(segments).toHaveLength(3);
      expect(segments[0].isCloze).toBe(true);
      expect(segments[1]).toEqual({ text: " and ", isCloze: false });
      expect(segments[2].isCloze).toBe(true);
    });

    test("cloze at start of text", () => {
      const segments = parseCloze("{{c1::Hello}} world");
      expect(segments[0].isCloze).toBe(true);
      expect(segments[0].text).toBe("Hello");
    });
  });

  describe("renderCloze", () => {
    test("returns isCloze=true when markers present", () => {
      const result = renderCloze("{{c1::test}}", false);
      expect(result.isCloze).toBe(true);
      expect(result.segments).toHaveLength(1);
    });

    test("returns isCloze=false for plain text", () => {
      const result = renderCloze("plain text", false);
      expect(result.isCloze).toBe(false);
    });
  });
});