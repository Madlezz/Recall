import type { CardStatus, DeckColor, ReviewResult } from "@/types";

export const SCHEMA_VERSION = "2";

export const deckColors: DeckColor[] = ["blue", "green", "amber", "rose", "violet", "slate"];
export const cardStatuses: CardStatus[] = ["new", "learning", "mastered"];
export const reviewResults: ReviewResult[] = ["correct", "incorrect"];

export function isDeckColor(value: unknown): value is DeckColor {
  return deckColors.includes(value as DeckColor);
}

export function isCardStatus(value: unknown): value is CardStatus {
  return cardStatuses.includes(value as CardStatus);
}

export function isReviewResult(value: unknown): value is ReviewResult {
  return reviewResults.includes(value as ReviewResult);
}
