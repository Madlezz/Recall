import { normalizeName } from "@/lib/utils";

export interface BulkCardInput {
  front: string;
  back: string;
  hint: string;
  source: string;
  tags: string[];
  /** Non-null when the next block specifies a different deck name. */
  nextDeckName?: string;
}

/**
 * Parse bulk card text with syntax:
 *   Q: What is the capital of France?
 *   A: Paris
 *
 *   Q: {{c1::Mitochondria}} is the {{c2::powerhouse}} of the cell
 *
 *   ---next deck: Biology---
 *   Q: What is photosynthesis?
 *   A: Process by which plants convert light energy to chemical energy
 *
 * Blocks are separated by blank lines. Cloze deletions use Anki syntax {{c1::answer}}.
 * Cards without a Q: prefix are treated as front-only if they contain cloze markers.
 */
export function parseBulkCards(text: string): BulkCardInput[] {
  const blocks = splitBlocks(text);
  const cards: BulkCardInput[] = [];
  let currentDeckName: string | undefined;

  for (const block of blocks) {
    // Check for deck-switch directive — may be in the same block as a card
    const deckMatch = block.match(/^---next deck:\s*(.+?)\s*---\s*$/m);
    if (deckMatch) {
      currentDeckName = normalizeName(deckMatch[1]);
      // Strip the directive line and try parsing the rest
      const remaining = block.replace(/^---next deck:.+?---\s*/m, "").trim();
      if (!remaining) continue;
      const parsed = parseBlock(remaining);
      if (parsed) {
        cards.push({ ...parsed, nextDeckName: currentDeckName });
        currentDeckName = undefined;
      }
      continue;
    }

    const parsed = parseBlock(block);
    if (!parsed) continue;

    cards.push({
      ...parsed,
      nextDeckName: currentDeckName,
    });
    // Reset deck name after first card in the group consumes it
    currentDeckName = undefined;
  }

  return cards;
}

function splitBlocks(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

function parseBlock(block: string): Omit<BulkCardInput, "nextDeckName"> | null {
  const lines = block.split("\n").map((l) => l.trim());
  let front = "";
  let back = "";
  let hint = "";
  let source = "";
  const tags: string[] = [];

  let currentSection: "q" | "a" | "hint" | "source" | "tags" | null = null;

  for (const line of lines) {
    const qMatch = line.match(/^Q:\s*(.*)/i);
    const aMatch = line.match(/^A:\s*(.*)/i);
    const hintMatch = line.match(/^Hint:\s*(.*)/i);
    const sourceMatch = line.match(/^Source:\s*(.*)/i);
    const tagsMatch = line.match(/^Tags:\s*(.*)/i);

    if (qMatch) {
      front = front ? front + "\n" + qMatch[1] : qMatch[1];
      currentSection = "q";
    } else if (aMatch) {
      back = back ? back + "\n" + aMatch[1] : aMatch[1];
      currentSection = "a";
    } else if (hintMatch) {
      hint = hintMatch[1];
      currentSection = "hint";
    } else if (sourceMatch) {
      source = sourceMatch[1];
      currentSection = "source";
    } else if (tagsMatch) {
      tags.push(...tagsMatch[1].split(",").map((t) => t.trim()).filter(Boolean));
      currentSection = "tags";
    } else if (currentSection) {
      // Continuation line for the current section
      const trimmed = line.trim();
      if (!trimmed) continue;
      switch (currentSection) {
        case "q":
          front += "\n" + trimmed;
          break;
        case "a":
          back += "\n" + trimmed;
          break;
        case "hint":
          hint += " " + trimmed;
          break;
        case "source":
          source += " " + trimmed;
          break;
      }
    } else {
      // No section marker found — treat first line as front if it has content
      if (!front) {
        front = line;
        currentSection = "q";
      } else if (currentSection === "q") {
        front += "\n" + line;
      }
    }
  }

  if (!front.trim()) return null;

  // Cloze detection: if front has {{c1::...}} it's a cloze card, no back required
  const isCloze = /\{\{c\d+::[^}]+\}\}/.test(front);
  if (!back.trim() && !isCloze) return null;

  return { front, back, hint, source, tags };
}