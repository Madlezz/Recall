import type { CardState, CardType, DeckColor, ReviewRating } from "@/types";

export const SCHEMA_VERSION = "4";

export const deckColors: DeckColor[] = ["blue", "green", "amber", "rose", "violet", "slate"];
export const cardStates: CardState[] = ["new", "learning", "review", "relearning"];
export const cardTypes: CardType[] = ["basic", "cloze", "image-occlusion"];
export const reviewRatings: ReviewRating[] = ["again", "hard", "good", "easy"];

export function isDeckColor(value: unknown): value is DeckColor {
  return deckColors.includes(value as DeckColor);
}

export function isCardState(value: unknown): value is CardState {
  return cardStates.includes(value as CardState);
}

export function isCardType(value: unknown): value is CardType {
  return cardTypes.includes(value as CardType);
}

export function isReviewRating(value: unknown): value is ReviewRating {
  return reviewRatings.includes(value as ReviewRating);
}
