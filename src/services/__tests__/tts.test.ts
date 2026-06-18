import { describe, it, expect } from "vitest";

// Extract the markdown-stripping logic for isolated testing
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\$\$(.*?)\$\$/g, "")
    .replace(/\$(.*?)\$/g, "")
    .replace(/\n+/g, ". ");
}

describe("stripMarkdown (TTS preprocessing)", () => {
  it("strips bold formatting", () => {
    expect(stripMarkdown("**bold text**")).toBe("bold text");
    expect(stripMarkdown("This is **important**")).toBe("This is important");
  });

  it("strips italic formatting", () => {
    expect(stripMarkdown("*italic text*")).toBe("italic text");
    expect(stripMarkdown("This is *emphasized*")).toBe("This is emphasized");
  });

  it("strips inline code", () => {
    expect(stripMarkdown("Use `console.log`")).toBe("Use console.log");
    expect(stripMarkdown("The `return` statement")).toBe("The return statement");
  });

  it("strips headings", () => {
    expect(stripMarkdown("# Heading 1")).toBe("Heading 1");
    expect(stripMarkdown("## Heading 2")).toBe("Heading 2");
    expect(stripMarkdown("### Heading 3")).toBe("Heading 3");
    expect(stripMarkdown("###### Heading 6")).toBe("Heading 6");
  });

  it("strips links, keeping link text", () => {
    expect(stripMarkdown("[Click here](https://example.com)")).toBe("Click here");
    expect(stripMarkdown("Visit [MDN](https://developer.mozilla.org)")).toBe("Visit MDN");
  });

  it("strips strikethrough", () => {
    expect(stripMarkdown("~~deleted~~")).toBe("deleted");
    expect(stripMarkdown("This is ~~wrong~~ correct")).toBe("This is wrong correct");
  });

  it("strips LaTeX math expressions", () => {
    expect(stripMarkdown("The formula $E = mc^2$ is famous")).toBe("The formula  is famous");
    expect(stripMarkdown("$$\\int_0^1 x dx$$")).toBe("");
  });

  it("replaces newlines with periods", () => {
    expect(stripMarkdown("Line 1\nLine 2")).toBe("Line 1. Line 2");
    expect(stripMarkdown("Line 1\n\n\nLine 2")).toBe("Line 1. Line 2");
  });

  it("handles mixed formatting", () => {
    expect(stripMarkdown("**Bold** and *italic* with `code`")).toBe("Bold and italic with code");
    expect(stripMarkdown("# Title\n**Bold** text")).toBe("Title. Bold text");
  });

  it("handles plain text without changes", () => {
    expect(stripMarkdown("Simple text")).toBe("Simple text");
    expect(stripMarkdown("The mitochondria is the powerhouse of the cell")).toBe(
      "The mitochondria is the powerhouse of the cell",
    );
  });

  it("handles empty string", () => {
    expect(stripMarkdown("")).toBe("");
  });

  it("handles text with only formatting", () => {
    expect(stripMarkdown("**~~`$$`~~**")).toBe("");
  });
});
