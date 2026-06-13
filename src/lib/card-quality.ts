import type { Card } from "@/types";

export interface CardQualityWarning {
  cardId: string;
  front: string;
  message: string;
  severity: "low" | "medium" | "high";
}

interface CardQualityResult {
  warnings: CardQualityWarning[];
  healthy: number;
  total: number;
}

/**
 * Check a single card for quality issues.
 * Returns an array of warnings — empty array means healthy card.
 */
export function checkCardQuality(card: Card): CardQualityWarning[] {
  const warnings: CardQualityWarning[] = [];
  const front = card.front.trim();
  const back = card.back.trim();

  // 1. Too long — hard to memorize
  if (front.length > 500 || back.length > 500) {
    warnings.push({
      cardId: card.id,
      front: front.slice(0, 60) + (front.length > 60 ? "…" : ""),
      message: `Card is very long (${Math.max(front.length, back.length)} chars). Consider splitting into multiple cards.`,
      severity: "medium",
    });
  }

  // 2. Too short — likely too vague
  const strippedFront = front.replace(/[#*_`~[\](){}|>\\-]/g, "").trim();
  const strippedBack = back.replace(/[#*_`~[\](){}|>\\-]/g, "").trim();
  if (strippedFront.length < 10 && strippedBack.length < 10) {
    warnings.push({
      cardId: card.id,
      front: front.slice(0, 60) + (front.length > 60 ? "…" : ""),
      message: "Card is very short — make sure it's specific enough to be useful.",
      severity: "medium",
    });
  }

  // 3. No hint — harder to recall
  if (!card.hint.trim()) {
    warnings.push({
      cardId: card.id,
      front: front.slice(0, 60) + (front.length > 60 ? "…" : ""),
      message: "No hint set. A hint helps trigger recall without giving away the answer.",
      severity: "low",
    });
  }

  // 4. Stale — not reviewed in 60+ days
  if (card.lastReviewDate) {
    const daysSinceReview = Math.ceil(
      (Date.now() - new Date(card.lastReviewDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceReview > 60 && card.state !== "new") {
      warnings.push({
        cardId: card.id,
        front: front.slice(0, 60) + (front.length > 60 ? "…" : ""),
        message: `Not reviewed in ${daysSinceReview} days. Consider resetting or reviewing it soon.`,
        severity: "low",
      });
    }
  }

  // 5. One-sided — front and back too similar
  if (front.length > 10 && back.length > 10) {
    const similarity = diceSimilarity(front.toLowerCase(), back.toLowerCase());
    if (similarity > 0.8) {
      warnings.push({
        cardId: card.id,
        front: front.slice(0, 60) + (front.length > 60 ? "…" : ""),
        message: "Front and back are nearly identical. Make sure they test distinct knowledge.",
        severity: "medium",
      });
    }
  }

  return warnings;
}

/** Check all cards in a deck, returning results grouped by severity */
export function checkDeckQuality(cards: Card[]): CardQualityResult {
  const allWarnings: CardQualityWarning[] = [];
  const healthyCards = new Set<string>();

  for (const card of cards) {
    const warnings = checkCardQuality(card);
    if (warnings.length === 0) {
      healthyCards.add(card.id);
    } else {
      allWarnings.push(...warnings);
    }
  }

  return {
    warnings: allWarnings.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    }),
    healthy: healthyCards.size,
    total: cards.length,
  };
}

/** Simple Dice coefficient for text similarity */
function diceSimilarity(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
  const intersection = new Set([...Array.from(bigramsA)].filter((x) => bigramsB.has(x)));
  return (2 * intersection.size) / (bigramsA.size + bigramsB.size);
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.slice(i, i + 2));
  }
  return set;
}