import { describe, expect, it } from "vitest";
import {
  cardStates,
  cardTypes,
  deckColors,
  isCardState,
  isCardType,
  isDeckColor,
  isReviewRating,
  reviewRatings,
} from "../domain";

describe("domain constants", () => {
  it("deckColors has 6 colors", () => {
    expect(deckColors).toEqual(["blue", "green", "amber", "rose", "violet", "slate"]);
  });

  it("cardStates has 4 states", () => {
    expect(cardStates).toEqual(["new", "learning", "review", "relearning"]);
  });

  it("cardTypes has 3 types", () => {
    expect(cardTypes).toEqual(["basic", "cloze", "image-occlusion"]);
  });

  it("reviewRatings has 4 ratings", () => {
    expect(reviewRatings).toEqual(["again", "hard", "good", "easy"]);
  });
});

describe("type guards", () => {
  it("isDeckColor accepts valid colors", () => {
    expect(isDeckColor("blue")).toBe(true);
    expect(isDeckColor("violet")).toBe(true);
  });

  it("isDeckColor rejects invalid colors", () => {
    expect(isDeckColor("red")).toBe(false);
    expect(isDeckColor("neon")).toBe(false);
    expect(isDeckColor(42)).toBe(false);
    expect(isDeckColor(null)).toBe(false);
    expect(isDeckColor(undefined)).toBe(false);
  });

  it("isCardState accepts valid states", () => {
    expect(isCardState("new")).toBe(true);
    expect(isCardState("learning")).toBe(true);
    expect(isCardState("review")).toBe(true);
    expect(isCardState("relearning")).toBe(true);
  });

  it("isCardState rejects invalid states", () => {
    expect(isCardState("done")).toBe(false);
    expect(isCardState("")).toBe(false);
    expect(isCardState(0)).toBe(false);
  });

  it("isCardType accepts valid types", () => {
    expect(isCardType("basic")).toBe(true);
    expect(isCardType("cloze")).toBe(true);
    expect(isCardType("image-occlusion")).toBe(true);
  });

  it("isCardType rejects invalid types", () => {
    expect(isCardType("multiple-choice")).toBe(false);
    expect(isCardType("")).toBe(false);
    expect(isCardType(null)).toBe(false);
  });

  it("isReviewRating accepts valid ratings", () => {
    expect(isReviewRating("again")).toBe(true);
    expect(isReviewRating("hard")).toBe(true);
    expect(isReviewRating("good")).toBe(true);
    expect(isReviewRating("easy")).toBe(true);
  });

  it("isReviewRating rejects invalid ratings", () => {
    expect(isReviewRating("perfect")).toBe(false);
    expect(isReviewRating("skip")).toBe(false);
    expect(isReviewRating(1)).toBe(false);
    expect(isReviewRating(undefined)).toBe(false);
  });
});
