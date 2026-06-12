import type { CardState, DeckColor, ReviewRating } from "@/types";

export const SCHEMA_VERSION = "2";

export const deckColors: DeckColor[] = ["blue", "green", "amber", "rose", "violet", "slate"];
export const cardStates: CardState[] = ["new", "learning", "review", "relearning"];
export const reviewRatings: ReviewRating[] = ["again", "hard", "good", "easy"];

export function isDeckColor(value: unknown): value is DeckColor {
  return deckColors.includes(value as DeckColor);
}

export function isCardState(value: unknown): value is CardState {
  return cardStates.includes(value as CardState);
}

export function isReviewRating(value: unknown): value is ReviewRating {
  return reviewRatings.includes(value as ReviewRating);
}
