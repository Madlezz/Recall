import { describe, it, expect } from "vitest";
import { cn, createId, normalizeName, parseTags } from "../utils";

describe("cn", () => {
  it("merges tailwind classes correctly", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "active")).toBe("base active");
    expect(cn("base", true && "shown")).toBe("base shown");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });
});

describe("createId", () => {
  it("creates ID with prefix", () => {
    const id = createId("card");
    expect(id).toMatch(/^card_/);
    expect(id.length).toBeGreaterThan(5);
  });

  it("creates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId("test")));
    expect(ids.size).toBe(100);
  });

  it("uses different prefixes correctly", () => {
    expect(createId("deck")).toMatch(/^deck_/);
    expect(createId("review")).toMatch(/^review_/);
  });
});

describe("normalizeName", () => {
  it("trims whitespace", () => {
    expect(normalizeName("  hello  ")).toBe("hello");
  });

  it("replaces multiple spaces with single space", () => {
    expect(normalizeName("hello    world")).toBe("hello world");
  });

  it("handles tabs and newlines", () => {
    expect(normalizeName("hello\t\nworld")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(normalizeName("")).toBe("");
  });

  it("handles string with only whitespace", () => {
    expect(normalizeName("   \t\n  ")).toBe("");
  });
});

describe("parseTags", () => {
  it("parses comma-separated tags", () => {
    expect(parseTags("tag1,tag2,tag3")).toEqual(["tag1", "tag2", "tag3"]);
  });

  it("trims whitespace from tags", () => {
    expect(parseTags("tag1,  tag2  , tag3")).toEqual(["tag1", "tag2", "tag3"]);
  });

  it("removes duplicate tags", () => {
    expect(parseTags("tag1,tag2,tag1,tag3,tag2")).toEqual(["tag1", "tag2", "tag3"]);
  });

  it("filters empty strings", () => {
    expect(parseTags("tag1,,tag2, ,tag3")).toEqual(["tag1", "tag2", "tag3"]);
  });

  it("handles single tag", () => {
    expect(parseTags("single")).toEqual(["single"]);
  });

  it("handles empty string", () => {
    expect(parseTags("")).toEqual([]);
  });

  it("handles string with only commas", () => {
    expect(parseTags(", , ,")).toEqual([]);
  });

  it("handles string with only whitespace", () => {
    expect(parseTags("   ")).toEqual([]);
  });
});
