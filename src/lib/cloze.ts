/**
 * Cloze deletion parser and renderer.
 * 
 * Syntax: {{c1::hidden text}} — standard Anki cloze format.
 * Syntax: {{c1::hidden text::hint}} — Anki cloze with hint (shown as placeholder).
 * Multiple cloze markers in one card: {{c1::answer1}}, {{c2::answer2}}, etc.
 * 
 * In unrevealed mode, markers are replaced with [hint] or [...]
 * In revealed mode, markers show the answer text with highlight styling.
 */

export interface ClozeSegment {
  text: string;
  isCloze: boolean;
  clozeIndex?: number;
  hint?: string;
}

const CLOZE_RE = /\{\{c(\d+)::([^}]+?)(?:::([^}]*))?\}\}/g;

/** Parse text containing cloze markers into segments */
export function parseCloze(text: string): ClozeSegment[] {
  const segments: ClozeSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(CLOZE_RE.source, "g");
  while ((match = regex.exec(text)) !== null) {
    // Text before this cloze
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isCloze: false });
    }
    const seg: ClozeSegment = {
      text: match[2],
      isCloze: true,
      clozeIndex: parseInt(match[1], 10),
    };
    if (match[3] !== undefined) {
      seg.hint = match[3];
    }
    segments.push(seg);
    lastIndex = regex.lastIndex;
  }

  // Remaining text after last cloze
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isCloze: false });
  }

  return segments;
}

/** Check if text contains any cloze markers */
export function hasCloze(text: string): boolean {
  CLOZE_RE.lastIndex = 0;
  return CLOZE_RE.test(text);
}

/** Render cloze text as React nodes */
export function renderCloze(
  text: string,
): { segments: ClozeSegment[]; isCloze: boolean } {
  const segments = parseCloze(text);
  const hasClozeMarkers = segments.some((s) => s.isCloze);
  return { segments, isCloze: hasClozeMarkers };
}