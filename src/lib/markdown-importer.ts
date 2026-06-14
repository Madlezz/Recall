export interface MarkdownCardInput {
  front: string;
  back: string;
  hint: string;
  tags: string[];
}

/**
 * Parse markdown into flashcard pairs. Auto-detects:
 * - Heading-based: each "## heading" = front, content = back
 * - Q/A markers: "Q:" / "A:" or "**Q:**" / "**A:**" pairs
 *
 * Lines starting with "> " become hints.
 * Lines starting with "tags:" become comma-separated tags.
 */
export function parseMarkdownCards(text: string): MarkdownCardInput[] {
  // Auto-detect: require BOTH Q: and A: markers for Q/A format
    // Single Q: in heading content shouldn't trigger the Q/A parser
    const hasQ = /\nQ:/.test(text) || /^\s*Q:/.test(text) || /\n\*\*Q:/.test(text) || /^\s*\*\*Q:/.test(text);
    const hasA = /\nA:/.test(text) || /^\s*A:/.test(text) || /\n\*\*A:/.test(text) || /^\s*\*\*A:/.test(text);
    if (hasQ && hasA) {
    return parseQAPairs(text);
  }
  return parseHeadingCards(text);
}

/** Parse heading-based format: each ## heading = front, content until next heading = back */
function parseHeadingCards(text: string): MarkdownCardInput[] {
  const cards: MarkdownCardInput[] = [];
  const blocks = text.split(/^## /m);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split("\n");
    const firstLine = lines[0].trim();
    if (!firstLine) continue;

    const hintLines: string[] = [];
    const tagLines: string[] = [];
    const bodyLines: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith(">")) {
        hintLines.push(line.replace(/^>\s*/, ""));
      } else if (/^tags?:/i.test(line)) {
        tagLines.push(line.replace(/^tags?:\s*/i, ""));
      } else if (line) {
        bodyLines.push(line);
      }
    }

    const front = firstLine;
    const back = bodyLines.join("\n").trim();
    const hint = hintLines.join(" ").trim();
    const tags = tagLines
      .join(",")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!back) continue;

    cards.push({ front, back, hint, tags });
  }

  return cards;
}

// Parse Q/A or **Q/A** pair format
function parseQAPairs(text: string): MarkdownCardInput[] {
  const cards: MarkdownCardInput[] = [];
  const lines = text.split("\n");

  let currentFront = "";
  let currentBack = "";
  let currentHint = "";
  let currentTags: string[] = [];
  let inAnswer = false;

  function flushCard(): void {
    const back = currentBack.trim();
    if (currentFront.trim() && back) {
      cards.push({
        front: currentFront.trim(),
        back,
        hint: currentHint.trim(),
        tags: [...currentTags],
      });
    }
    currentFront = "";
    currentBack = "";
    currentHint = "";
    currentTags = [];
    inAnswer = false;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inAnswer) flushCard();
      continue;
    }

    // **Q:** marker (bold Q:)
    if (trimmed.startsWith("**Q:**") || trimmed.startsWith("**Q: ")) {
      if (inAnswer) flushCard();
      currentFront = trimmed.replace(/^\*\*Q:\*\*\s*/, "").replace(/^\*\*Q:\s*/, "").trim();
      inAnswer = false;
      continue;
    }

    // Q: marker (plain)
    if (trimmed.startsWith("Q:") || trimmed.startsWith("Q: ")) {
      if (inAnswer) flushCard();
      currentFront = trimmed.replace(/^Q:\s*/, "").trim();
      inAnswer = false;
      continue;
    }

    // **A:** marker (bold A:)
    if (trimmed.startsWith("**A:**") || trimmed.startsWith("**A: ")) {
      currentBack = trimmed.replace(/^\*\*A:\*\*\s*/, "").replace(/^\*\*A:\s*/, "").trim();
      inAnswer = true;
      continue;
    }

    // A: marker (plain)
    if (trimmed.startsWith("A:") || trimmed.startsWith("A: ")) {
      currentBack = trimmed.replace(/^A:\s*/, "").trim();
      inAnswer = true;
      continue;
    }

    // Accumulate multi-line answers
    if (inAnswer && currentFront) {
      if (trimmed.startsWith(">")) {
        currentHint += (currentHint ? " " : "") + trimmed.replace(/^>\s*/, "");
      } else if (/^tags?:/i.test(trimmed)) {
        currentTags.push(
          ...trimmed
            .replace(/^tags?:\s*/i, "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        );
      } else {
        currentBack += "\n" + trimmed;
      }
    }
  }

  if (currentFront) flushCard();

  return cards;
}